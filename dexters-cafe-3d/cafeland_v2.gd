extends Node3D

const C_DARK := Color("#2d2a27")
const C_CREAM := Color("#f6efe4")
const C_GREEN := Color("#62a968")
const C_GOLD := Color("#d79b36")
const C_BLUE := Color("#4fa9cf")
const C_RED := Color("#d75d4b")
const C_WOOD := Color("#a87349")
const C_WALL := Color("#eee4d6")
const C_GRASS := Color("#79ad55")

var cash: float = 85.0
var reputation: float = 82.0
var xp: int = 18
var level: int = 1
var day: int = 1
var game_hour: float = 8.0
var served: int = 0
var shift_open: bool = false
var rush: bool = false
var rush_timer: float = 0.0
var spawn_timer: float = 0.0
var order_counter: int = 0
var selected_station: String = "grill"
var mission_target: int = 8
var mission_claimed: bool = false

var customers: Array = []
var staff: Array = []
var tables: Array = []
var queue_points: Array[Vector3] = []
var stations: Dictionary = {}
var ui: Dictionary = {}
var camera: Camera3D
var player: Dictionary = {}
var player_target := Vector3.ZERO
var floor_plane := Plane(Vector3.UP, 0.0)

var recipes: Array = [
    {"name":"Breakfast Roll","price":4.50,"station":"grill"},
    {"name":"Barista Coffee","price":3.20,"station":"coffee"},
    {"name":"Nero Smash","price":10.50,"station":"grill"},
    {"name":"Loaded Fries","price":6.50,"station":"fryer"},
    {"name":"Street Sub","price":7.50,"station":"prep"},
    {"name":"Chicken Rice Bowl","price":9.50,"station":"prep"}
]

func _ready() -> void:
    randomize()
    _setup_stations()
    _build_world()
    _build_people()
    _build_ui()
    _update_ui()
    _toast("Open Dexter's, prep food, serve customers and grow the cafe")

func _setup_stations() -> void:
    stations = {
        "grill":{"name":"GRILL","pos":Vector3(0.8,0,-3.5),"stock":3,"max_stock":10,"cooking":false,"timer":0.0,"duration":7.0,"level":1,"label":null},
        "prep":{"name":"PREP","pos":Vector3(2.5,0,-3.5),"stock":3,"max_stock":10,"cooking":false,"timer":0.0,"duration":6.0,"level":1,"label":null},
        "fryer":{"name":"FRYER","pos":Vector3(4.2,0,-3.5),"stock":3,"max_stock":10,"cooking":false,"timer":0.0,"duration":7.0,"level":1,"label":null},
        "coffee":{"name":"COFFEE","pos":Vector3(-4.0,0,-3.4),"stock":4,"max_stock":12,"cooking":false,"timer":0.0,"duration":4.0,"level":1,"label":null}
    }

func _process(delta: float) -> void:
    _update_player(delta)
    _animate_people()
    _update_stations(delta)
    if not shift_open:
        _update_ui()
        return
    game_hour += delta * 0.045
    if game_hour >= 22.0:
        _close_day()
        return
    spawn_timer -= delta
    if spawn_timer <= 0.0 and customers.size() < (11 if rush else 8):
        _spawn_customer()
        spawn_timer = randf_range(1.8,3.0) if rush else randf_range(3.4,5.2)
    if served > 0 and served % 7 == 0 and not rush and rush_timer <= 0.0:
        rush = true
        rush_timer = 28.0
        _toast("LUNCH RUSH! Faster customers and bigger tips")
    if rush:
        rush_timer -= delta
        if rush_timer <= 0.0:
            rush = false
            rush_timer = -30.0
            cash += 20.0
            _toast("Rush cleared +£20")
    elif rush_timer < 0.0:
        rush_timer += delta
    _update_customers(delta)
    _update_staff(delta)
    _update_ui()

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventScreenTouch and event.pressed:
        _world_tap(event.position)
    elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
        _world_tap(event.position)

func _world_tap(screen_pos: Vector2) -> void:
    if camera == null:
        return
    var hit = floor_plane.intersects_ray(camera.project_ray_origin(screen_pos), camera.project_ray_normal(screen_pos))
    if hit == null:
        return
    var p: Vector3 = hit
    p.x = clamp(p.x,-6.2,6.2)
    p.z = clamp(p.z,-4.8,6.8)
    player_target = p

func _build_world() -> void:
    RenderingServer.set_default_clear_color(Color("#5f8f48"))
    _build_camera_and_light()
    _box("Ground",Vector3(0,-0.28,1),Vector3(23,0.25,23),C_GRASS)
    _box("CafeBase",Vector3(0,-0.12,1),Vector3(14.2,0.25,14.8),Color("#d8cfc2"))
    _box("BackWall",Vector3(0,1.45,-5.7),Vector3(14.2,2.9,0.22),C_WALL)
    _box("LeftWall",Vector3(-7.0,1.45,1.0),Vector3(0.22,2.9,13.6),C_WALL)
    _box("RightWall",Vector3(7.0,1.45,-2.7),Vector3(0.22,2.9,6.0),C_WALL)
    _build_floor()
    _build_front_counter()
    _build_kitchen()
    _build_dining()
    _build_decor()
    queue_points = [Vector3(-4.9,0,1.5),Vector3(-4.9,0,2.7),Vector3(-4.9,0,3.9),Vector3(-4.9,0,5.1)]

func _build_camera_and_light() -> void:
    camera = Camera3D.new()
    camera.projection = Camera3D.PROJECTION_ORTHOGONAL
    camera.size = 18.0
    camera.position = Vector3(13.5,18.3,17.0)
    camera.look_at_from_position(camera.position,Vector3(0,0.4,1.0),Vector3.UP)
    camera.current = true
    add_child(camera)
    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-58,-32,0)
    sun.light_energy = 0.72
    sun.shadow_enabled = true
    add_child(sun)
    var env_node := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("#76a957")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("#ddd2c4")
    env.ambient_light_energy = 0.42
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env_node.environment = env
    add_child(env_node)

func _build_floor() -> void:
    for z in range(-5,8):
        for x in range(-6,7):
            var offset: float = 0.46 if z % 2 != 0 else 0.0
            var px: float = float(x)+offset
            if abs(px)>6.7:
                continue
            var c: Color = C_WOOD.darkened(0.06) if (x+z)%3 == 0 else C_WOOD
            _box("Floor",Vector3(px,0.025,float(z)*0.78+1.0),Vector3(0.94,0.05,0.72),c)

func _build_front_counter() -> void:
    _box("Counter",Vector3(-3.25,0.55,-3.7),Vector3(4.8,1.05,1.35),Color("#d9d0c5"))
    _box("CounterTop",Vector3(-3.25,1.12,-3.7),Vector3(5.0,0.14,1.5),Color("#f6f1ea"))
    _box("Till",Vector3(-2.3,1.38,-3.55),Vector3(0.72,0.48,0.55),Color("#51585a"))
    _box("TillScreen",Vector3(-2.3,1.55,-3.25),Vector3(0.5,0.26,0.04),C_BLUE)
    _box("CoffeeMachine",Vector3(-4.1,1.5,-3.7),Vector3(1.0,0.75,0.65),Color("#5a6466"))
    _box("Pickup",Vector3(5.35,0.55,-2.7),Vector3(2.55,1.05,1.2),C_GREEN.darkened(0.08))
    var sign := Label3D.new()
    sign.text = "DEXTER'S"
    sign.font_size = 88
    sign.modulate = C_DARK
    sign.position = Vector3(-1.5,2.15,-5.5)
    add_child(sign)

func _build_kitchen() -> void:
    _box("KitchenRun",Vector3(2.55,0.6,-4.0),Vector3(5.2,1.05,1.4),Color("#cfd4d1"))
    _box("KitchenTop",Vector3(2.55,1.17,-4.0),Vector3(5.4,0.12,1.5),Color("#b8c1c1"))
    for key in ["grill","prep","fryer"]:
        var s: Dictionary = stations[key]
        _box(String(s["name"]),Vector3(s["pos"].x,1.38,s["pos"].z-0.35),Vector3(1.25,0.36,0.86),C_DARK)
        var l := Label3D.new()
        l.text = "%s  %d" % [s["name"],s["stock"]]
        l.font_size = 25
        l.modulate = Color.WHITE
        l.position = Vector3(s["pos"].x,1.92,s["pos"].z+0.15)
        add_child(l)
        stations[key]["label"] = l
    var cl := Label3D.new()
    cl.text = "COFFEE  %d" % int(stations["coffee"]["stock"])
    cl.font_size = 23
    cl.modulate = C_DARK
    cl.position = Vector3(-4.05,2.2,-3.3)
    add_child(cl)
    stations["coffee"]["label"] = cl

func _build_dining() -> void:
    var coords: Array = [Vector3(-1.2,0,0.4),Vector3(2.2,0,0.6),Vector3(-1.1,0,3.2),Vector3(2.4,0,3.5)]
    for p in coords:
        tables.append({"pos":p,"state":"clean","clean_timer":0.0})
        _cylinder("Table",p+Vector3(0,0.83,0),0.82,0.15,Color("#e3ddd3"))
        _cylinder("Stem",p+Vector3(0,0.43,0),0.12,0.72,Color("#666b6c"))
        _chair(p+Vector3(-1.0,0,0),PI/2)
        _chair(p+Vector3(1.0,0,0),-PI/2)

func _chair(pos: Vector3, rot: float) -> void:
    var root := Node3D.new()
    root.position = pos
    root.rotation.y = rot
    add_child(root)
    _part_box(root,Vector3(0,0.45,0),Vector3(0.62,0.12,0.62),Color("#d8d1c7"))
    _part_box(root,Vector3(0,0.85,-0.25),Vector3(0.62,0.8,0.12),Color("#d8d1c7"))

func _build_decor() -> void:
    _box("MenuBoard",Vector3(-6.84,1.65,0.2),Vector3(0.1,1.9,2.3),C_DARK)
    var menu := Label3D.new()
    menu.text = "DEXTER'S\nBreakfast\nCoffee\nSubs\nSmash"
    menu.font_size = 26
    menu.modulate = Color.WHITE
    menu.position = Vector3(-6.72,1.7,0.2)
    menu.rotation_degrees = Vector3(0,90,0)
    add_child(menu)
    for p in [Vector3(-5.9,0,-4.8),Vector3(5.8,0,-4.8),Vector3(5.7,0,5.9)]:
        _plant(p)

func _plant(pos: Vector3) -> void:
    _cylinder("Pot",pos+Vector3(0,0.3,0),0.32,0.6,Color("#b8774c"))
    for off in [Vector3(-0.2,0.95,0),Vector3(0.18,1.2,0),Vector3(0,1.45,-0.04)]:
        _sphere("Leaf",pos+off,Vector3(0.34,0.5,0.25),C_GREEN)

func _build_people() -> void:
    player = _make_person("YOU",Vector3(0,0,5.5),C_RED,true)
    player_target = player["node"].position
    staff.append(_make_person("Cashier",Vector3(-2.8,0,-2.5),C_BLUE,false))
    staff.append(_make_person("Chef",Vector3(2.5,0,-2.4),Color("#b94f42"),false))
    staff.append(_make_person("Cleaner",Vector3(4.7,0,4.8),C_GREEN,false))

func _make_person(label: String, pos: Vector3, shirt: Color, is_player: bool) -> Dictionary:
    var root := Node3D.new()
    root.name = label
    root.position = pos
    add_child(root)
    _part_capsule(root,Vector3(0,1.0,0),0.31,0.85,shirt)
    _part_sphere(root,Vector3(0,1.72,0),Vector3(0.4,0.44,0.4),Color("#d9a676"))
    _part_sphere(root,Vector3(0,2.0,-0.03),Vector3(0.41,0.18,0.38),Color("#3d2b24"))
    _part_capsule(root,Vector3(-0.22,0.38,0),0.09,0.58,C_DARK)
    _part_capsule(root,Vector3(0.22,0.38,0),0.09,0.58,C_DARK)
    if is_player:
        _cylinder_child(root,Vector3(0,0.03,0),0.55,0.04,C_GOLD)
    return {"node":root,"target":pos,"speed":2.6 if is_player else 2.0,"phase":randf()*4.0}

func _spawn_customer() -> void:
    order_counter += 1
    var recipe: Dictionary = recipes.pick_random().duplicate()
    var colors: Array = [Color("#6d9f6a"),Color("#7564ad"),Color("#c96f55"),Color("#4f91a2"),Color("#c38e3f")]
    var c: Dictionary = _make_person("Customer%d"%order_counter,Vector3(-5.8,0,6.5),colors.pick_random(),false)
    c["id"] = order_counter
    c["recipe"] = recipe
    c["state"] = "queue"
    c["patience"] = 100.0
    c["queue_index"] = min(_queue_count(),queue_points.size()-1)
    c["sit_in"] = randf() < 0.68
    c["table"] = -1
    c["served"] = false
    c["order_delay"] = randf_range(1.0,2.0)
    customers.append(c)
    _order_bubble(c)

func _order_bubble(c: Dictionary) -> void:
    var root: Node3D = c["node"]
    _part_sphere(root,Vector3(0,2.55,0),Vector3(0.7,0.38,0.15),Color("#f8f4ec"))
    var l := Label3D.new()
    l.text = String(c["recipe"]["name"])
    l.font_size = 18
    l.modulate = C_DARK
    l.position = Vector3(0,2.55,0.16)
    root.add_child(l)

func _queue_count() -> int:
    var count: int = 0
    for c in customers:
        if c["state"] == "queue":
            count += 1
    return count

func _update_customers(delta: float) -> void:
    for i in range(customers.size()-1,-1,-1):
        var c: Dictionary = customers[i]
        c["patience"] = float(c["patience"]) - delta * (1.7 if rush else 1.0)
        if float(c["patience"]) <= 0.0 and c["state"] not in ["leaving","eating"]:
            reputation = max(0.0,reputation-2.0)
            c["state"] = "leaving"
            _toast("Customer left unhappy -2 REP")
        match String(c["state"]):
            "queue":
                c["queue_index"] = min(int(c["queue_index"]),queue_points.size()-1)
                _move_person(c,queue_points[int(c["queue_index"])],delta)
                if int(c["queue_index"]) == 0 and c["node"].position.distance_to(queue_points[0]) < 0.22:
                    c["order_delay"] = float(c["order_delay"]) - delta
                    if float(c["order_delay"]) <= 0.0:
                        c["state"] = "waiting_food"
                        _shift_queue()
            "waiting_food":
                _move_person(c,Vector3(-3.8,0,-1.0),delta)
                var station_key: String = String(c["recipe"]["station"])
                if int(stations[station_key]["stock"]) > 0:
                    stations[station_key]["stock"] = int(stations[station_key]["stock"])-1
                    c["state"] = "pickup"
                    c["pickup_delay"] = 1.0
            "pickup":
                _move_person(c,Vector3(5.25,0,-1.1),delta)
                if c["node"].position.distance_to(Vector3(5.25,0,-1.1)) < 0.3:
                    c["pickup_delay"] = float(c["pickup_delay"]) - delta
                    if float(c["pickup_delay"]) <= 0.0:
                        if bool(c["sit_in"]):
                            var table_idx: int = _find_clean_table()
                            if table_idx >= 0:
                                c["table"] = table_idx
                                tables[table_idx]["state"] = "occupied"
                                c["state"] = "eating"
                                c["eat_timer"] = randf_range(6.0,9.0)
                            else:
                                c["sit_in"] = false
                        if not bool(c["sit_in"]):
                            _complete_sale(c)
                            c["state"] = "leaving"
            "eating":
                var ti: int = int(c["table"])
                _move_person(c,tables[ti]["pos"]+Vector3(0,0,0.45),delta)
                c["eat_timer"] = float(c["eat_timer"]) - delta
                if float(c["eat_timer"]) <= 0.0:
                    _complete_sale(c)
                    tables[ti]["state"] = "dirty"
                    c["state"] = "leaving"
            "leaving":
                _move_person(c,Vector3(-5.8,0,6.5),delta)
                if c["node"].position.distance_to(Vector3(-5.8,0,6.5)) < 0.24:
                    c["node"].queue_free()
                    customers.remove_at(i)
                    continue
        customers[i] = c

func _shift_queue() -> void:
    for c in customers:
        if c["state"] == "queue":
            c["queue_index"] = max(0,int(c["queue_index"])-1)

func _find_clean_table() -> int:
    for i in range(tables.size()):
        if tables[i]["state"] == "clean":
            return i
    return -1

func _update_stations(delta: float) -> void:
    for key in stations.keys():
        var s: Dictionary = stations[key]
        if bool(s["cooking"]):
            s["timer"] = float(s["timer"]) - delta
            if float(s["timer"]) <= 0.0:
                s["cooking"] = false
                var add_amount: int = 4 + int(s["level"])
                s["stock"] = min(int(s["max_stock"]),int(s["stock"])+add_amount)
                _toast("%s ready: +%d servings" % [s["name"],add_amount])
        stations[key] = s
        if s["label"] != null:
            var suffix: String = "  %.0fs" % max(0.0,float(s["timer"])) if bool(s["cooking"]) else "  %d" % int(s["stock"])
            s["label"].text = String(s["name"]) + suffix

func _start_batch(station_key: String) -> void:
    selected_station = station_key
    var s: Dictionary = stations[station_key]
    if bool(s["cooking"]):
        _toast("%s is already cooking" % s["name"])
        return
    if int(s["stock"]) >= int(s["max_stock"]):
        _toast("%s is fully stocked" % s["name"])
        return
    var cost: int = 2 + int(s["level"])
    if cash < float(cost):
        _toast("Need £%d ingredients" % cost)
        return
    cash -= float(cost)
    s["cooking"] = true
    s["timer"] = max(2.2,float(s["duration"])-(float(s["level"])-1.0)*0.65)
    stations[station_key] = s
    _toast("Cooking %s batch" % s["name"])

func _update_staff(delta: float) -> void:
    if staff.size() < 3:
        return
    var cashier: Dictionary = staff[0]
    var chef: Dictionary = staff[1]
    var cleaner: Dictionary = staff[2]
    cashier["target"] = Vector3(-2.8,0,-2.5)
    var chef_target := Vector3(2.5,0,-2.4)
    for key in ["grill","prep","fryer","coffee"]:
        if bool(stations[key]["cooking"]):
            chef_target = stations[key]["pos"]+Vector3(0,0,1.0)
            break
    chef["target"] = chef_target
    var clean_target := Vector3(4.8,0,4.8)
    var cleaning_idx: int = -1
    for i in range(tables.size()):
        if tables[i]["state"] == "dirty":
            clean_target = tables[i]["pos"]+Vector3(0.7,0,0.5)
            cleaning_idx = i
            break
    cleaner["target"] = clean_target
    _move_person(cashier,cashier["target"],delta)
    _move_person(chef,chef["target"],delta)
    _move_person(cleaner,cleaner["target"],delta)
    if cleaning_idx >= 0 and cleaner["node"].position.distance_to(clean_target) < 0.25:
        tables[cleaning_idx]["clean_timer"] = float(tables[cleaning_idx]["clean_timer"]) + delta
        if float(tables[cleaning_idx]["clean_timer"]) >= 2.4:
            tables[cleaning_idx]["state"] = "clean"
            tables[cleaning_idx]["clean_timer"] = 0.0
            reputation = min(100.0,reputation+0.15)
    staff[0] = cashier
    staff[1] = chef
    staff[2] = cleaner

func _update_player(delta: float) -> void:
    if player.is_empty():
        return
    _move_person(player,player_target,delta)
    for key in stations.keys():
        if player["node"].position.distance_to(stations[key]["pos"]+Vector3(0,0,1.0)) < 1.4 and bool(stations[key]["cooking"]):
            stations[key]["timer"] = max(0.0,float(stations[key]["timer"])-delta*0.45)

func _move_person(p: Dictionary, target: Vector3, delta: float) -> void:
    var node: Node3D = p["node"]
    var flat := Vector3(target.x,node.position.y,target.z)
    var d := flat-node.position
    if d.length() > 0.05:
        node.position += d.normalized()*min(d.length(),float(p["speed"])*delta)
        node.rotation.y = atan2(d.x,d.z)

func _animate_people() -> void:
    var t: float = Time.get_ticks_msec()*0.001
    if not player.is_empty():
        player["node"].position.y = abs(sin(t*6.0))*0.018
    for s in staff:
        s["node"].position.y = abs(sin(t*5.0+float(s["phase"])))*0.015
    for c in customers:
        c["node"].position.y = abs(sin(t*5.5+float(c["id"])))*0.02

func _complete_sale(c: Dictionary) -> void:
    if bool(c["served"]):
        return
    c["served"] = true
    var base: float = float(c["recipe"]["price"])
    var tip: float = maxf(0.0,(float(c["patience"])-35.0)/100.0)*1.5
    if rush:
        tip += 0.5
    cash += base+tip
    served += 1
    xp += 10
    reputation = min(100.0,reputation+0.25)
    _check_level_up()
    _toast("+£%.2f  %s" % [base+tip,c["recipe"]["name"]])

func _check_level_up() -> void:
    var new_level: int = 1 + int(xp/120)
    if new_level > level:
        level = new_level
        cash += 50.0
        reputation = min(100.0,reputation+2.0)
        _toast("LEVEL %d! +£50 and new cafe progress" % level)

func _close_day() -> void:
    shift_open = false
    day += 1
    game_hour = 8.0
    cash += 25.0
    reputation = min(100.0,reputation+0.5)
    _toast("Day complete! Daily bonus +£25")

func _build_ui() -> void:
    var layer := CanvasLayer.new()
    add_child(layer)
    var top := Panel.new()
    top.anchor_left = 0.02
    top.anchor_right = 0.98
    top.offset_top = 18
    top.offset_bottom = 132
    top.add_theme_stylebox_override("panel",_style(Color("#f9f6f0ee"),22))
    layer.add_child(top)
    ui["cash"] = _label(top,Vector2(12,8),Vector2(150,42),"£85",26,C_DARK)
    ui["level"] = _label(top,Vector2(160,8),Vector2(130,42),"LV 1",22,C_GOLD)
    ui["rep"] = _label(top,Vector2(290,8),Vector2(150,42),"82% REP",20,C_DARK)
    ui["daytime"] = _label(top,Vector2(440,5),Vector2(210,48),"DAY 1  08:00",19,C_DARK)
    ui["xpbar"] = _progress(top,Vector2(18,62),Vector2(300,20),xp%120,120,C_BLUE)
    ui["served"] = _label(top,Vector2(330,56),Vector2(160,34),"SERVED 0",17,C_DARK)
    ui["rush"] = _label(top,Vector2(490,56),Vector2(160,34),"",17,C_RED)
    var mission := Panel.new()
    mission.anchor_left = 0.18
    mission.anchor_right = 0.82
    mission.offset_top = 145
    mission.offset_bottom = 200
    mission.add_theme_stylebox_override("panel",_style(Color("#f8f4eceb"),18))
    layer.add_child(mission)
    ui["mission"] = _label(mission,Vector2(6,7),Vector2(430,38),"Serve 0 / 8",19,Color("#6b4d80"))
    var side := VBoxContainer.new()
    side.anchor_left = 0.84
    side.anchor_right = 0.98
    side.anchor_top = 0.18
    side.anchor_bottom = 0.55
    side.add_theme_constant_override("separation",10)
    layer.add_child(side)
    _small_button(side,"SHOP",Callable(self,"_buy_decor"),Color("#cb825a"))
    _small_button(side,"TASK",Callable(self,"_claim_mission"),C_BLUE)
    _small_button(side,"BUILD",Callable(self,"_upgrade_selected_station"),C_GOLD)
    var station_bar := HBoxContainer.new()
    station_bar.anchor_left = 0.08
    station_bar.anchor_right = 0.92
    station_bar.anchor_top = 0.78
    station_bar.anchor_bottom = 0.84
    station_bar.add_theme_constant_override("separation",6)
    layer.add_child(station_bar)
    _station_button(station_bar,"GRILL","grill")
    _station_button(station_bar,"PREP","prep")
    _station_button(station_bar,"FRYER","fryer")
    _station_button(station_bar,"COFFEE","coffee")
    var toast_panel := Panel.new()
    toast_panel.anchor_left = 0.12
    toast_panel.anchor_right = 0.88
    toast_panel.anchor_top = 0.69
    toast_panel.anchor_bottom = 0.75
    toast_panel.add_theme_stylebox_override("panel",_style(Color("#22201fd8"),18))
    layer.add_child(toast_panel)
    ui["toast"] = _label(toast_panel,Vector2(10,6),Vector2(520,48),"Welcome",17,Color.WHITE)
    var open_button := Button.new()
    open_button.anchor_left = 0.35
    open_button.anchor_right = 0.65
    open_button.anchor_top = 0.87
    open_button.anchor_bottom = 0.93
    open_button.text = "OPEN"
    open_button.add_theme_font_size_override("font_size",25)
    open_button.add_theme_color_override("font_color",Color.WHITE)
    open_button.add_theme_stylebox_override("normal",_style(C_RED,20))
    open_button.add_theme_stylebox_override("pressed",_style(C_RED.darkened(0.1),20))
    open_button.pressed.connect(_toggle_shift)
    layer.add_child(open_button)
    ui["open"] = open_button

func _station_button(parent: Control, text: String, key: String) -> void:
    var b := Button.new()
    b.text = text
    b.custom_minimum_size = Vector2(122,64)
    b.add_theme_font_size_override("font_size",16)
    b.add_theme_color_override("font_color",Color.WHITE)
    b.add_theme_stylebox_override("normal",_style(C_DARK,15))
    b.add_theme_stylebox_override("pressed",_style(C_GREEN.darkened(0.1),15))
    b.pressed.connect(func(): _start_batch(key))
    parent.add_child(b)

func _small_button(parent: Control, text: String, call: Callable, col: Color) -> void:
    var b := Button.new()
    b.text = text
    b.custom_minimum_size = Vector2(94,60)
    b.add_theme_font_size_override("font_size",15)
    b.add_theme_color_override("font_color",Color.WHITE)
    b.add_theme_stylebox_override("normal",_style(col,20))
    b.add_theme_stylebox_override("pressed",_style(col.darkened(0.1),20))
    b.pressed.connect(call)
    parent.add_child(b)

func _toggle_shift() -> void:
    shift_open = not shift_open
    if shift_open:
        spawn_timer = 0.2
        _toast("Dexter's is OPEN")
    else:
        _toast("Shift paused")

func _buy_decor() -> void:
    if cash < 60.0:
        _toast("Need £60 for decor")
        return
    cash -= 60.0
    reputation = min(100.0,reputation+1.0)
    _toast("New decor placed +1 REP")

func _claim_mission() -> void:
    if served < mission_target:
        _toast("Serve %d more customers" % (mission_target-served))
        return
    if mission_claimed:
        _toast("Mission already claimed")
        return
    mission_claimed = true
    cash += 100.0
    xp += 25
    _check_level_up()
    _toast("Mission complete +£100 +25 XP")

func _upgrade_selected_station() -> void:
    var s: Dictionary = stations[selected_station]
    var cost: int = 100 + int(s["level"])*60
    if cash < float(cost):
        _toast("Need £%d to upgrade %s" % [cost,s["name"]])
        return
    cash -= float(cost)
    s["level"] = int(s["level"])+1
    s["max_stock"] = int(s["max_stock"])+2
    stations[selected_station] = s
    reputation = min(100.0,reputation+0.8)
    _toast("%s upgraded to Lv%d" % [s["name"],s["level"]])

func _update_ui() -> void:
    if ui.is_empty():
        return
    ui["cash"].text = "£%d" % int(cash)
    ui["level"].text = "LV %d" % level
    ui["rep"].text = "%d%% REP" % int(reputation)
    ui["daytime"].text = "DAY %d  %02d:%02d" % [day,int(game_hour),int((game_hour-int(game_hour))*60.0)]
    ui["served"].text = "SERVED %d" % served
    ui["xpbar"].value = xp%120
    ui["mission"].text = "Serve %d / %d customers" % [min(served,mission_target),mission_target]
    ui["open"].text = "PAUSE" if shift_open else "OPEN"
    ui["rush"].text = "RUSH %.0fs" % max(0.0,rush_timer) if rush else ""

func _label(parent: Control, pos: Vector2, size: Vector2, text: String, font_size: int, col: Color) -> Label:
    var l := Label.new()
    l.position = pos
    l.size = size
    l.text = text
    l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    l.add_theme_font_size_override("font_size",font_size)
    l.add_theme_color_override("font_color",col)
    parent.add_child(l)
    return l

func _progress(parent: Control, pos: Vector2, size: Vector2, value: float, max_value: float, col: Color) -> ProgressBar:
    var p := ProgressBar.new()
    p.position = pos
    p.size = size
    p.min_value = 0
    p.max_value = max_value
    p.value = value
    p.show_percentage = false
    p.add_theme_stylebox_override("background",_style(Color("#d4d7d6"),10))
    p.add_theme_stylebox_override("fill",_style(col,10))
    parent.add_child(p)
    return p

func _style(col: Color, r: int) -> StyleBoxFlat:
    var s := StyleBoxFlat.new()
    s.bg_color = col
    s.corner_radius_top_left = r
    s.corner_radius_top_right = r
    s.corner_radius_bottom_left = r
    s.corner_radius_bottom_right = r
    return s

func _toast(text: String) -> void:
    if ui.has("toast"):
        ui["toast"].text = text

func _mat(c: Color) -> StandardMaterial3D:
    var m := StandardMaterial3D.new()
    m.albedo_color = c
    m.roughness = 0.82
    return m

func _box(n: String, pos: Vector3, size: Vector3, c: Color) -> MeshInstance3D:
    var mi := MeshInstance3D.new()
    mi.name = n
    var m := BoxMesh.new()
    m.size = size
    mi.mesh = m
    mi.position = pos
    mi.material_override = _mat(c)
    add_child(mi)
    return mi

func _sphere(n: String, pos: Vector3, size: Vector3, c: Color) -> MeshInstance3D:
    var mi := MeshInstance3D.new()
    mi.name = n
    var m := SphereMesh.new()
    m.radius = 0.5
    m.height = 1.0
    mi.mesh = m
    mi.position = pos
    mi.scale = size
    mi.material_override = _mat(c)
    add_child(mi)
    return mi

func _cylinder(n: String, pos: Vector3, r: float, h: float, c: Color) -> MeshInstance3D:
    var mi := MeshInstance3D.new()
    mi.name = n
    var m := CylinderMesh.new()
    m.top_radius = r
    m.bottom_radius = r
    m.height = h
    mi.mesh = m
    mi.position = pos
    mi.material_override = _mat(c)
    add_child(mi)
    return mi

func _part_box(parent: Node3D, pos: Vector3, size: Vector3, c: Color) -> void:
    var mi := MeshInstance3D.new()
    var m := BoxMesh.new()
    m.size = size
    mi.mesh = m
    mi.position = pos
    mi.material_override = _mat(c)
    parent.add_child(mi)

func _part_sphere(parent: Node3D, pos: Vector3, size: Vector3, c: Color) -> void:
    var mi := MeshInstance3D.new()
    var m := SphereMesh.new()
    m.radius = 0.5
    m.height = 1.0
    mi.mesh = m
    mi.position = pos
    mi.scale = size
    mi.material_override = _mat(c)
    parent.add_child(mi)

func _part_capsule(parent: Node3D, pos: Vector3, r: float, h: float, c: Color) -> void:
    var mi := MeshInstance3D.new()
    var m := CapsuleMesh.new()
    m.radius = r
    m.height = h
    mi.mesh = m
    mi.position = pos
    mi.material_override = _mat(c)
    parent.add_child(mi)

func _cylinder_child(parent: Node3D, pos: Vector3, r: float, h: float, c: Color) -> MeshInstance3D:
    var mi := MeshInstance3D.new()
    var m := CylinderMesh.new()
    m.top_radius = r
    m.bottom_radius = r
    m.height = h
    mi.mesh = m
    mi.position = pos
    mi.material_override = _mat(c)
    parent.add_child(mi)
    return mi
