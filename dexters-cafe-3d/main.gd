extends Node3D

const C_BG = Color("#151515")
const C_CREAM = Color("#f3e7cf")
const C_GOLD = Color("#ffbe35")
const C_GREEN = Color("#2f7a56")
const C_BROWN = Color("#8a5231")
const C_DARK = Color("#252321")
const C_FLOOR_A = Color("#b98558")
const C_FLOOR_B = Color("#d1a06f")

var cash := 75.0
var rep := 82.0
var xp := 18
var served := 0
var today := 0.0
var day := 1
var open := true
var game_time := 8.25
var spawn_timer := 0.0
var rush := false
var rush_timer := 0.0
var order_id := 0

var customers: Array = []
var staff: Array = []
var tables: Array = []
var queue_points: Array[Vector3] = []
var exit_pos := Vector3(-8.0, 0.0, 5.8)
var door_pos := Vector3(-8.0, 0.0, 4.8)
var counter_pos := Vector3(-3.7, 0.0, -2.7)
var kitchen_pos := Vector3(3.3, 0.0, -2.7)
var collection_pos := Vector3(7.2, 0.0, -2.7)
var camera: Camera3D
var ui := {}
var orders: Array = []

var recipes = [
    {"name":"Breakfast Roll","price":4.50,"station":"grill","icon":"🥓"},
    {"name":"Barista Coffee","price":3.20,"station":"coffee","icon":"☕"},
    {"name":"Nero Smash","price":10.50,"station":"grill","icon":"🍔"},
    {"name":"Loaded Fries","price":6.50,"station":"fryer","icon":"🍟"},
    {"name":"Street Sub","price":7.50,"station":"prep","icon":"🥖"},
    {"name":"Chicken Rice Bowl","price":9.50,"station":"prep","icon":"🍚"}
]

func _ready():
    randomize()
    _build_world()
    _build_ui()
    _hire_initial_staff()
    _spawn_customer()

func _process(delta):
    if not open:
        return
    game_time += delta * 0.035
    if game_time >= 16.0:
        game_time = 16.0
    spawn_timer -= delta
    if spawn_timer <= 0.0 and customers.size() < 7:
        _spawn_customer()
        spawn_timer = (2.2 if rush else 4.8) + randf_range(0.0, 2.0)
    if served > 0 and served % 8 == 0 and not rush:
        rush = true
        rush_timer = 28.0
        _toast("LUNCH RUSH! Faster customers, bigger tips")
    if rush:
        rush_timer -= delta
        if rush_timer <= 0.0:
            rush = false
            cash += 35.0
            today += 35.0
            _toast("Rush cleared +£35")
    _update_customers(delta)
    _update_staff(delta)
    _update_orders(delta)
    _update_ui()

func _build_world():
    RenderingServer.set_default_clear_color(C_BG)
    camera = Camera3D.new()
    add_child(camera)
    camera.position = Vector3(0, 13.5, 15.5)
    camera.rotation_degrees = Vector3(-39, 0, 0)
    camera.current = true

    var light = DirectionalLight3D.new()
    light.rotation_degrees = Vector3(-55, -32, 0)
    light.light_energy = 1.3
    light.shadow_enabled = true
    add_child(light)

    var world_env = WorldEnvironment.new()
    var env = Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("#20231f")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("#fff0d0")
    env.ambient_light_energy = 0.65
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    world_env.environment = env
    add_child(world_env)

    _box("Floor", Vector3(0,-0.18,0), Vector3(18,0.35,12), C_CREAM)
    for x in range(-8,9,2):
        for z in range(-5,6,2):
            var col = C_FLOOR_A if ((x+z)/2 as int) % 2 == 0 else C_FLOOR_B
            _box("Tile", Vector3(x,0.01,z), Vector3(1.96,0.05,1.96), col)

    _box("BackWall", Vector3(0,1.7,-5.7), Vector3(18,3.4,0.35), Color("#3a3935"))
    _box("LeftWall", Vector3(-8.85,1.7,0), Vector3(0.35,3.4,11.7), Color("#3a3935"))
    _box("RightWall", Vector3(8.85,1.7,0), Vector3(0.35,3.4,11.7), Color("#3a3935"))

    _build_signage()
    _build_counter()
    _build_kitchen()
    _build_collection()
    _build_tables()
    _build_plants()
    _build_queue_markers()

func _build_signage():
    _box("HeaderPanel", Vector3(0,2.4,-5.45), Vector3(13.5,1.25,0.2), C_DARK)
    var sign = Label3D.new()
    sign.text = "DEXTER'S"
    sign.font_size = 110
    sign.modulate = C_GOLD
    sign.position = Vector3(-4.9,2.45,-5.25)
    add_child(sign)
    var strap = Label3D.new()
    strap.text = "CAFÉ  •  BREAKFAST  •  LUNCH  •  TAKEAWAY"
    strap.font_size = 42
    strap.modulate = Color.WHITE
    strap.position = Vector3(2.0,2.42,-5.24)
    add_child(strap)
    for x in [-6.0,-3.0,0.0,3.0,6.0]:
        var lamp = OmniLight3D.new()
        lamp.position = Vector3(x,3.7,-3.8)
        lamp.light_color = Color("#ffd286")
        lamp.light_energy = 1.0
        lamp.omni_range = 4.0
        add_child(lamp)
        _cylinder("Pendant", Vector3(x,3.45,-3.8), 0.3, 0.35, Color("#70531e"))

func _build_counter():
    _box("CounterBase", Vector3(-3.7,0.65,-3.0), Vector3(4.6,1.3,1.5), Color("#9b6237"))
    _box("CounterTop", Vector3(-3.7,1.38,-3.0), Vector3(4.9,0.18,1.7), Color("#dfb16e"))
    _box("Till", Vector3(-2.8,1.72,-3.0), Vector3(0.8,0.6,0.5), Color("#3f4b4f"))
    _box("CoffeeMachine", Vector3(-4.7,1.7,-3.05), Vector3(1.0,0.75,0.65), Color("#6e7779"))
    for x in [-5.0,-4.7,-4.4]:
        _cylinder("Cup", Vector3(x,1.92,-2.65), 0.12, 0.22, C_CREAM)

func _build_kitchen():
    _box("KitchenWall", Vector3(3.3,1.2,-4.8), Vector3(7.0,2.4,0.35), Color("#5f6462"))
    _box("KitchenBench", Vector3(3.3,0.72,-3.5), Vector3(6.4,1.25,1.55), Color("#6f7777"))
    _box("KitchenTop", Vector3(3.3,1.39,-3.5), Vector3(6.7,0.15,1.7), Color("#c7d0cf"))
    var xs = [1.2, 3.25, 5.25]
    var names = ["GRILL", "PREP", "FRYER"]
    for i in range(3):
        _box(names[i], Vector3(xs[i],1.7,-3.55), Vector3(1.45,0.55,0.95), Color("#303638"))
        var l = Label3D.new()
        l.text = names[i]
        l.font_size = 34
        l.modulate = Color.WHITE
        l.position = Vector3(xs[i],2.05,-3.0)
        add_child(l)
    for x in [1.0,1.3,1.6]:
        _box("GrillHeat", Vector3(x,2.0,-3.0), Vector3(0.22,0.16,0.2), Color("#ff6945"))

func _build_collection():
    _box("CollectionBase", collection_pos + Vector3(0,0.7,0), Vector3(2.7,1.35,1.55), C_GREEN)
    _box("CollectionTop", collection_pos + Vector3(0,1.45,0), Vector3(2.9,0.15,1.7), Color("#d8b56f"))
    var label = Label3D.new()
    label.text = "COLLECTION"
    label.font_size = 43
    label.modulate = Color.WHITE
    label.position = collection_pos + Vector3(0,2.0,0.25)
    add_child(label)

func _build_tables():
    var coords = [Vector3(-1.6,0,1.4),Vector3(2.2,0,1.4),Vector3(-1.6,0,4.2),Vector3(2.2,0,4.2)]
    for pos in coords:
        var table = {"pos":pos,"busy":false}
        tables.append(table)
        _cylinder("Table", pos + Vector3(0,0.65,0), 0.9, 0.18, Color("#8c5435"))
        _cylinder("Pedestal", pos + Vector3(0,0.34,0), 0.14, 0.65, Color("#5a3828"))
        _box("Chair", pos + Vector3(-1.05,0.45,0), Vector3(0.55,0.85,0.65), Color("#313638"))
        _box("Chair", pos + Vector3(1.05,0.45,0), Vector3(0.55,0.85,0.65), Color("#313638"))
        _cylinder("Bottle", pos + Vector3(0,0.93,0), 0.09, 0.35, Color("#2b3837"))

func _build_plants():
    for pos in [Vector3(7.6,0,-4.8),Vector3(7.6,0,4.7),Vector3(-7.7,0,-4.8)]:
        _cylinder("PlantPot", pos + Vector3(0,0.32,0),0.32,0.6,Color("#8d5c3b"))
        for off in [Vector3(-0.25,1.0,0),Vector3(0.2,1.2,0.1),Vector3(0,1.45,-0.1)]:
            _sphere("Leaf",pos+off,Vector3(0.45,0.65,0.3),Color("#4b9655"))

func _build_queue_markers():
    queue_points = [Vector3(-5.8,0,2.3),Vector3(-5.8,0,3.45),Vector3(-5.8,0,4.6),Vector3(-7.1,0,4.6)]
    for p in queue_points:
        _cylinder("QueueMarker", p+Vector3(0,0.02,0), 0.35, 0.03, Color(1,0.73,0.2,0.26))

func _hire_initial_staff():
    staff.append(_make_person("Cashier", counter_pos + Vector3(0.6,0,0.4), Color("#3b74ad"), true))
    staff.append(_make_person("Chef", kitchen_pos + Vector3(0.8,0,0.6), Color("#b54736"), true))

func _make_person(label:String, pos:Vector3, shirt:Color, is_staff:bool):
    var root = Node3D.new()
    root.name = label
    root.position = pos
    add_child(root)
    _person_part(root,"Body",Vector3(0,0.9,0),Vector3(0.55,0.75,0.35),shirt,"box")
    _person_part(root,"Head",Vector3(0,1.65,0),Vector3(0.42,0.42,0.42),Color("#f0bd91"),"sphere")
    _person_part(root,"Hair",Vector3(0,1.88,0),Vector3(0.44,0.18,0.42),Color("#4a2e23"),"sphere")
    _person_part(root,"LegL",Vector3(-0.17,0.32,0),Vector3(0.17,0.55,0.18),Color("#292929"),"box")
    _person_part(root,"LegR",Vector3(0.17,0.32,0),Vector3(0.17,0.55,0.18),Color("#292929"),"box")
    _person_part(root,"ArmL",Vector3(-0.43,0.96,0),Vector3(0.15,0.55,0.16),Color("#f0bd91"),"box")
    _person_part(root,"ArmR",Vector3(0.43,0.96,0),Vector3(0.15,0.55,0.16),Color("#f0bd91"),"box")
    var nameplate = Label3D.new()
    nameplate.text = label
    nameplate.font_size = 28
    nameplate.modulate = Color.WHITE if is_staff else C_DARK
    nameplate.position = Vector3(0,2.35,0)
    root.add_child(nameplate)
    return {"node":root,"role":label,"target":pos,"busy":false,"speed":2.25,"phase":randf()*6.0}

func _person_part(parent:Node3D,n:String,p:Vector3,s:Vector3,c:Color,kind:String):
    var mesh = MeshInstance3D.new()
    mesh.name = n
    if kind == "sphere":
        var m = SphereMesh.new(); m.radius = 0.5; m.height = 1.0; mesh.mesh = m
    else:
        var m = BoxMesh.new(); m.size = Vector3.ONE; mesh.mesh = m
    mesh.position = p
    mesh.scale = s
    mesh.material_override = _mat(c)
    parent.add_child(mesh)

func _spawn_customer():
    order_id += 1
    var recipe = recipes.pick_random().duplicate()
    var sit_in = randf() < 0.58
    var colors = [Color("#6b9f5f"),Color("#8167c9"),Color("#d78664"),Color("#6bb0b9"),Color("#d9a04f")]
    var p = _make_person(recipe.name, door_pos, colors.pick_random(), false)
    p["state"] = "queue"
    p["recipe"] = recipe
    p["patience"] = 100.0
    p["sit_in"] = sit_in
    p["queue_index"] = customers.size()
    p["order_started"] = false
    p["served"] = false
    p["table"] = -1
    p["id"] = order_id
    p["node"].scale = Vector3(0.88,0.88,0.88)
    customers.append(p)

func _update_customers(delta):
    for i in range(customers.size()-1,-1,-1):
        var c = customers[i]
        c["patience"] -= delta * (2.2 if rush else 1.3)
        if c["patience"] <= 0 and c["state"] not in ["exit","eating"]:
            rep = max(0.0, rep - 2.0)
            c["state"] = "exit"
            _toast("Customer walked out -2 REP")
        match c["state"]:
            "queue":
                c["queue_index"] = min(c["queue_index"], queue_points.size()-1)
                _move_person(c, queue_points[c["queue_index"]], delta)
                if c["queue_index"] == 0 and c["node"].position.distance_to(queue_points[0]) < 0.3 and not c["order_started"]:
                    c["order_started"] = true
                    orders.append({"customer":c,"recipe":c["recipe"],"progress":0.0,"ready":false})
                    c["state"] = "waiting"
                    _shift_queue()
            "waiting":
                _move_person(c, Vector3(-3.8,0,-0.8), delta)
            "ready":
                _move_person(c, collection_pos + Vector3(0,0,1.5), delta)
                if c["node"].position.distance_to(collection_pos + Vector3(0,0,1.5)) < 0.35:
                    if c["sit_in"]:
                        var idx = _free_table()
                        if idx >= 0:
                            c["table"] = idx
                            tables[idx]["busy"] = true
                            c["state"] = "eating"
                        else:
                            c["sit_in"] = false
                            c["state"] = "exit"
                            _complete_sale(c)
                    else:
                        c["state"] = "exit"
                        _complete_sale(c)
            "eating":
                var tp = tables[c["table"]]["pos"] + Vector3(0,0,0.4)
                _move_person(c,tp,delta)
                c["patience"] += delta * 4.0
                if c["patience"] >= 112.0:
                    tables[c["table"]]["busy"] = false
                    c["state"] = "exit"
                    _complete_sale(c)
            "exit":
                _move_person(c, exit_pos, delta)
                if c["node"].position.distance_to(exit_pos) < 0.35:
                    c["node"].queue_free()
                    customers.remove_at(i)
                    continue
        _bob_person(c,delta)
        customers[i] = c

func _shift_queue():
    for c in customers:
        if c["state"] == "queue":
            c["queue_index"] = max(0, int(c["queue_index"]) - 1)

func _free_table():
    for i in range(tables.size()):
        if not tables[i]["busy"]:
            return i
    return -1

func _update_orders(delta):
    for o in orders:
        if o["ready"]:
            continue
        var rate = 18.0
        if o["recipe"]["station"] == "prep": rate = 15.5
        if o["recipe"]["station"] == "fryer": rate = 13.5
        o["progress"] += delta * rate
        if o["progress"] >= 100.0:
            o["ready"] = true
            o["customer"]["state"] = "ready"
            _toast(str(o["recipe"]["icon"]) + " " + str(o["recipe"]["name"]) + " ready")

func _update_staff(delta):
    var t = Time.get_ticks_msec() * 0.001
    for s in staff:
        s["node"].position.y = sin(t*4.0 + s["phase"]) * 0.025

func _move_person(p, target:Vector3, delta):
    var node:Node3D = p["node"]
    var flat = Vector3(target.x,node.position.y,target.z)
    var d = flat - node.position
    if d.length() > 0.05:
        node.position += d.normalized() * min(d.length(), p["speed"] * delta)
        node.rotation.y = atan2(d.x,d.z)

func _bob_person(p, _delta):
    if p["state"] in ["queue","ready","exit","waiting"]:
        var t = Time.get_ticks_msec() * 0.001
        p["node"].position.y = abs(sin(t*7.0 + float(p["id"]))) * 0.035

func _complete_sale(c):
    if c["served"]: return
    c["served"] = true
    var base = float(c["recipe"]["price"])
    var tip = max(0.0, (c["patience"]-45.0)/100.0) * 1.4
    if rush: tip += 0.6
    cash += base + tip
    today += base + tip
    served += 1
    xp += 9
    rep = min(100.0, rep + 0.18)
    _toast("+£%.2f  %s" % [base+tip,c["recipe"]["name"]])

func _build_ui():
    var layer = CanvasLayer.new(); add_child(layer)
    var top = ColorRect.new(); top.color = Color("#171717e8"); top.position = Vector2(18,16); top.size = Vector2(1244,72); layer.add_child(top)
    ui["level"] = _hud_label(layer,Vector2(42,27),"LEVEL 1",23,C_GOLD)
    ui["cash"] = _hud_label(layer,Vector2(190,27),"£75.00",28,C_GOLD)
    ui["rep"] = _hud_label(layer,Vector2(410,27),"★ 82% REP",25,Color.WHITE)
    ui["time"] = _hud_label(layer,Vector2(685,27),"08:15",25,Color.WHITE)
    ui["served"] = _hud_label(layer,Vector2(835,27),"SERVED 0",23,Color.WHITE)
    ui["today"] = _hud_label(layer,Vector2(1020,27),"TODAY £0",23,C_GOLD)
    var open_lbl = _hud_label(layer,Vector2(1168,27),"OPEN",24,Color("#64e393")); ui["open"] = open_lbl

    var bottom = ColorRect.new(); bottom.color = Color("#171717ec"); bottom.position = Vector2(18,632); bottom.size = Vector2(1244,72); layer.add_child(bottom)
    _button(layer,Vector2(36,644),Vector2(178,48),"END DAY",Callable(self,"_end_day"),Color("#4c5153"))
    _button(layer,Vector2(238,644),Vector2(245,48),"UPGRADE COUNTER £160",Callable(self,"_upgrade_counter"),Color("#a86b2f"))
    _button(layer,Vector2(505,644),Vector2(245,48),"UPGRADE KITCHEN £190",Callable(self,"_upgrade_kitchen"),Color("#477e9b"))
    _button(layer,Vector2(772,644),Vector2(210,48),"HIRE RUNNER £180",Callable(self,"_hire_runner"),Color("#43835e"))
    ui["toast"] = _hud_label(layer,Vector2(995,650),"RUN THE CAFÉ",18,Color("#202020"))
    var toast_bg = ColorRect.new(); toast_bg.color = C_GOLD; toast_bg.position = Vector2(990,644); toast_bg.size = Vector2(250,48); layer.add_child(toast_bg); layer.move_child(toast_bg,layer.get_child_count()-2)

func _hud_label(parent,pos,text,size,col):
    var l = Label.new(); l.position=pos; l.text=text; l.add_theme_font_size_override("font_size",size); l.add_theme_color_override("font_color",col); parent.add_child(l); return l

func _button(parent,pos,size,text,call,col):
    var b=Button.new(); b.position=pos; b.size=size; b.text=text; b.add_theme_font_size_override("font_size",17); b.add_theme_color_override("font_color",Color.WHITE); b.add_theme_stylebox_override("normal",_style(col,14)); b.add_theme_stylebox_override("hover",_style(col.lightened(0.12),14)); b.pressed.connect(call); parent.add_child(b)

func _style(col:Color,r:int):
    var s=StyleBoxFlat.new(); s.bg_color=col; s.corner_radius_top_left=r; s.corner_radius_top_right=r; s.corner_radius_bottom_left=r; s.corner_radius_bottom_right=r; return s

func _update_ui():
    ui["cash"].text = "£%.2f" % cash
    ui["rep"].text = "★ %d%% REP" % int(rep)
    ui["time"].text = "%02d:%02d" % [int(game_time), int((game_time-int(game_time))*60)]
    ui["served"].text = "SERVED %d" % served
    ui["today"].text = "TODAY £%d" % int(today)
    ui["open"].text = "RUSH" if rush else ("OPEN" if open else "CLOSED")
    ui["open"].add_theme_color_override("font_color", Color("#ff8a4b") if rush else Color("#64e393"))

func _toast(text:String):
    ui["toast"].text = text

func _end_day():
    if not open:
        day += 1; open = true; game_time = 8.0; today = 0; served = 0; _toast("DAY %d OPEN" % day); return
    open = false
    cash += rep * 0.25
    _toast("SHIFT COMPLETE • bonus £%d" % int(rep*0.25))

func _upgrade_counter():
    if cash < 160: _toast("Need £160"); return
    cash -= 160; rep = min(100.0,rep+1.0); _toast("Counter upgraded • faster service")

func _upgrade_kitchen():
    if cash < 190: _toast("Need £190"); return
    cash -= 190; rep=min(100.0,rep+1.5); _toast("Kitchen upgraded")

func _hire_runner():
    if cash < 180: _toast("Need £180"); return
    if staff.size() >= 3: _toast("Runner already hired"); return
    cash -= 180
    staff.append(_make_person("Runner",Vector3(4.5,0,1.0),Color("#37845b"),true))
    _toast("Runner hired")

func _mat(c:Color):
    var m=StandardMaterial3D.new(); m.albedo_color=c; m.roughness=0.75; return m

func _box(n:String,pos:Vector3,size:Vector3,c:Color):
    var mi=MeshInstance3D.new(); mi.name=n; var m=BoxMesh.new(); m.size=size; mi.mesh=m; mi.position=pos; mi.material_override=_mat(c); add_child(mi); return mi

func _sphere(n:String,pos:Vector3,size:Vector3,c:Color):
    var mi=MeshInstance3D.new(); mi.name=n; var m=SphereMesh.new(); m.radius=0.5; m.height=1.0; mi.mesh=m; mi.position=pos; mi.scale=size; mi.material_override=_mat(c); add_child(mi); return mi

func _cylinder(n:String,pos:Vector3,r:float,h:float,c:Color):
    var mi=MeshInstance3D.new(); mi.name=n; var m=CylinderMesh.new(); m.top_radius=r; m.bottom_radius=r; m.height=h; mi.mesh=m; mi.position=pos; mi.material_override=_mat(c); add_child(mi); return mi
