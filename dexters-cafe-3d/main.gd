extends Node3D

const C_GOLD := Color("#ffbd34")
const C_GREEN := Color("#55b86b")
const C_DARK := Color("#27272a")
const C_CREAM := Color("#f8f1e3")
const C_WOOD := Color("#c78c57")
const C_WOOD_DARK := Color("#8a5638")
const C_WALL := Color("#fffaf2")
const C_GRASS := Color("#78b93c")
const C_BLUE := Color("#43aee2")
const C_RED := Color("#f45b49")

var cash := 85.0
var premium := 10
var rep := 82.0
var xp := 18
var energy := 50.0
var served := 0
var today := 0.0
var day := 1
var game_time := 8.0
var open := false
var rush := false
var rush_timer := 0.0
var spawn_timer := 0.0
var order_id := 0
var counter_level := 1
var kitchen_level := 1
var staff_limit := 3

var customers: Array = []
var staff: Array = []
var tables: Array = []
var orders: Array = []
var queue_points: Array[Vector3] = []
var task_nodes: Array = []

var camera: Camera3D
var ui := {}
var player := {}
var player_target := Vector3.ZERO
var floor_plane := Plane(Vector3.UP, 0.0)

var door_pos := Vector3(-5.8, 0, 6.4)
var counter_pos := Vector3(-3.6, 0, -3.6)
var kitchen_pos := Vector3(2.2, 0, -3.5)
var collection_pos := Vector3(5.4, 0, -2.6)

var recipes = [
    {"name":"Breakfast Roll","price":4.50,"station":"grill","emoji":"BR"},
    {"name":"Barista Coffee","price":3.20,"station":"coffee","emoji":"CF"},
    {"name":"Nero Smash","price":10.50,"station":"grill","emoji":"NS"},
    {"name":"Loaded Fries","price":6.50,"station":"fryer","emoji":"LF"},
    {"name":"Street Sub","price":7.50,"station":"prep","emoji":"SS"},
    {"name":"Chicken Rice Bowl","price":9.50,"station":"prep","emoji":"RB"}
]

func _ready():
    randomize()
    _build_world()
    _build_ui()
    _build_people()
    _update_ui()
    _toast("Tap GO to open Dexter's")

func _process(delta):
    _update_player(delta)
    _animate_people(delta)
    if not open:
        return
    game_time += delta * 0.055
    energy = max(0.0, energy - delta * 0.08)
    spawn_timer -= delta
    if spawn_timer <= 0.0 and customers.size() < 8:
        _spawn_customer()
        spawn_timer = (2.1 if rush else 4.2) + randf_range(0.0, 1.8)
    if served > 0 and served % 7 == 0 and not rush:
        rush = true
        rush_timer = 24.0
        _toast("Lunch rush! Keep the kitchen moving")
    if rush:
        rush_timer -= delta
        if rush_timer <= 0.0:
            rush = false
            cash += 25.0
            today += 25.0
            _toast("Rush cleared +£25")
    _update_customers(delta)
    _update_orders(delta)
    _update_staff(delta)
    _update_ui()

func _unhandled_input(event):
    if event is InputEventScreenTouch and event.pressed:
        _handle_world_tap(event.position)
    elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
        _handle_world_tap(event.position)

func _handle_world_tap(screen_pos:Vector2):
    if camera == null:
        return
    var origin = camera.project_ray_origin(screen_pos)
    var dir = camera.project_ray_normal(screen_pos)
    var hit = floor_plane.intersects_ray(origin, dir)
    if hit != null:
        var p:Vector3 = hit
        p.x = clamp(p.x, -6.3, 6.3)
        p.z = clamp(p.z, -4.8, 6.7)
        player_target = p
        if player.has("node"):
            player["target"] = p

func _build_world():
    RenderingServer.set_default_clear_color(Color("#a9d56c"))
    _build_camera_lighting()
    _build_outside()
    _build_room_shell()
    _build_floor()
    _build_counter()
    _build_kitchen()
    _build_collection()
    _build_dining()
    _build_decor()
    _build_task_markers()
    queue_points = [Vector3(-4.9,0,1.8),Vector3(-4.9,0,3.0),Vector3(-4.9,0,4.2),Vector3(-4.9,0,5.4)]

func _build_camera_lighting():
    camera = Camera3D.new()
    camera.projection = Camera3D.PROJECTION_ORTHOGONAL
    camera.size = 18.5
    camera.position = Vector3(13.8, 18.0, 17.8)
    camera.look_at_from_position(camera.position, Vector3(0,0.3,0.8), Vector3.UP)
    camera.current = true
    add_child(camera)

    var sun = DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-55,-35,0)
    sun.light_energy = 1.15
    sun.shadow_enabled = true
    add_child(sun)

    var env_node = WorldEnvironment.new()
    var env = Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("#a9d56c")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("#fff2d7")
    env.ambient_light_energy = 0.65
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env_node.environment = env
    add_child(env_node)

func _build_outside():
    _box("Grass",Vector3(0,-0.24,1.0),Vector3(22,0.22,22),C_GRASS)
    for x in [-8.0,-5.5,-3.0,-0.5,2.0,4.5,7.0]:
        _box("FencePost",Vector3(x,0.75,-7.4),Vector3(0.18,1.5,0.18),Color.WHITE)
        _box("FenceRail",Vector3(x+1.25,1.1,-7.4),Vector3(2.5,0.14,0.16),Color.WHITE)
        _box("FenceRail",Vector3(x+1.25,0.55,-7.4),Vector3(2.5,0.14,0.16),Color.WHITE)
    for i in range(14):
        var px = -8.2 + float(i)*1.25
        _box("FenceSlat",Vector3(px,0.82,-7.4),Vector3(0.08,1.0,0.12),Color("#f6f6f0"))

func _build_room_shell():
    _box("RoomBase",Vector3(0,-0.12,1.0),Vector3(14.2,0.25,14.8),Color("#ddd7cc"))
    _box("BackWall",Vector3(0,1.45,-5.7),Vector3(14.2,2.9,0.22),C_WALL)
    _box("LeftWall",Vector3(-7.0,1.45,1.0),Vector3(0.22,2.9,13.6),C_WALL)
    _box("RightWallTop",Vector3(7.0,1.45,-2.9),Vector3(0.22,2.9,5.8),C_WALL)
    _box("FrontLip",Vector3(0,0.38,7.7),Vector3(14.2,0.76,0.22),Color("#f1ebe2"))
    _box("DextersSign",Vector3(-2.5,2.15,-5.52),Vector3(5.2,0.95,0.18),Color("#bf6f2d"))
    var sign = Label3D.new()
    sign.text = "DEXTER'S"
    sign.font_size = 96
    sign.modulate = Color.WHITE
    sign.position = Vector3(-2.5,2.12,-5.37)
    add_child(sign)
    var strap = Label3D.new()
    strap.text = "GOOD FOOD · GOOD PEOPLE"
    strap.font_size = 34
    strap.modulate = C_DARK
    strap.position = Vector3(3.3,2.1,-5.37)
    add_child(strap)

func _build_floor():
    for z in range(-5,8):
        for x in range(-6,7):
            var offset = 0.45 if z % 2 != 0 else 0.0
            var px = float(x) + offset
            if abs(px) > 6.7:
                continue
            var col = C_WOOD.lightened(randf_range(0.0,0.07)) if (x+z)%3 != 0 else C_WOOD.darkened(0.05)
            _box("Plank",Vector3(px*1.0,0.03,float(z)*0.78+1.0),Vector3(0.94,0.06,0.72),col)

func _build_counter():
    _rounded_counter(Vector3(-3.2,0,-3.8),4.8,1.35,Color("#f3efe8"))
    _box("CounterKick",Vector3(-3.2,0.42,-3.82),Vector3(4.35,0.75,1.15),Color("#ebe5dd"))
    _box("CounterTop",Vector3(-3.2,1.0,-3.8),Vector3(4.75,0.14,1.45),Color.WHITE)
    _coffee_machine(Vector3(-4.2,1.15,-3.7))
    _till(Vector3(-2.15,1.17,-3.72))
    _tray(Vector3(-3.2,1.14,-3.38))

func _rounded_counter(pos:Vector3,w:float,d:float,col:Color):
    _box("Counter",pos+Vector3(0,0.52,0),Vector3(w,1.0,d),col)
    for sx in [-1,1]:
        _cylinder("CounterEnd",pos+Vector3((w*0.5-0.17)*sx,0.52,0),0.5,1.0,col)

func _coffee_machine(pos:Vector3):
    _box("CoffeeBody",pos,Vector3(1.15,0.8,0.65),Color("#53636e"))
    _box("CoffeePanel",pos+Vector3(0,0.18,0.34),Vector3(0.7,0.3,0.05),Color("#7dd2e8"))
    _cylinder("CoffeePort",pos+Vector3(-0.28,-0.34,0.3),0.08,0.35,Color("#333333"))
    _cylinder("CoffeePort",pos+Vector3(0.28,-0.34,0.3),0.08,0.35,Color("#333333"))

func _till(pos:Vector3):
    _box("TillBase",pos,Vector3(0.8,0.45,0.62),Color("#4b5358"))
    _box("TillScreen",pos+Vector3(0,0.22,0.3),Vector3(0.58,0.36,0.06),Color("#b7e4f0"))

func _tray(pos:Vector3):
    _box("Tray",pos,Vector3(0.9,0.07,0.5),Color("#b78c5e"))
    for x in [-0.25,0,0.25]:
        _cylinder("Cup",pos+Vector3(x,0.12,0),0.09,0.20,C_CREAM)

func _build_kitchen():
    _box("KitchenRun",Vector3(2.5,0.55,-4.0),Vector3(5.0,1.0,1.35),Color("#f4f4f3"))
    _box("KitchenTop",Vector3(2.5,1.12,-4.0),Vector3(5.25,0.12,1.5),Color("#d4dbdd"))
    _station(Vector3(0.9,1.35,-3.95),"GRILL",Color("#df6c4e"))
    _station(Vector3(2.5,1.35,-3.95),"PREP",Color("#67bb67"))
    _station(Vector3(4.1,1.35,-3.95),"FRYER",Color("#e9bb4b"))
    _box("Backsplash",Vector3(2.5,1.8,-5.42),Vector3(5.6,1.25,0.12),Color("#e3e7e8"))
    for x in [0.9,2.5,4.1]:
        _box("Shelf",Vector3(x,2.15,-5.2),Vector3(1.15,0.1,0.42),Color("#b8c0c2"))

func _station(pos:Vector3,label:String,col:Color):
    _box(label,pos,Vector3(1.2,0.42,0.9),Color("#3a4144"))
    for x in [-0.25,0.25]:
        _cylinder("StationGlow",pos+Vector3(x,0.25,0.18),0.10,0.08,col)
    var l = Label3D.new()
    l.text = label
    l.font_size = 28
    l.modulate = Color.WHITE
    l.position = pos + Vector3(0,0.55,0.45)
    add_child(l)

func _build_collection():
    _rounded_counter(collection_pos,2.65,1.2,Color("#65a97b"))
    _box("CollectionTop",collection_pos+Vector3(0,1.05,0),Vector3(2.85,0.14,1.35),Color("#e5c889"))
    var l = Label3D.new()
    l.text = "COLLECT"
    l.font_size = 34
    l.modulate = Color.WHITE
    l.position = collection_pos + Vector3(0,1.6,0.35)
    add_child(l)

func _build_dining():
    var coords = [Vector3(-1.2,0,0.4),Vector3(2.2,0,0.6),Vector3(-1.1,0,3.2),Vector3(2.4,0,3.5)]
    for p in coords:
        tables.append({"pos":p,"busy":false})
        _box("Rug",p+Vector3(0,0.04,0),Vector3(2.4,0.03,1.7),Color("#f3efe8"))
        _cylinder("TableTop",p+Vector3(0,0.82,0),0.8,0.16,Color("#d8d4cc"))
        _cylinder("TableStem",p+Vector3(0,0.43,0),0.12,0.72,Color("#74787b"))
        _chair(p+Vector3(-1.0,0,0),PI/2)
        _chair(p+Vector3(1.0,0,0),-PI/2)

func _chair(pos:Vector3,rot:float):
    var root = Node3D.new(); root.position=pos; root.rotation.y=rot; add_child(root)
    _part_box(root,Vector3(0,0.45,0),Vector3(0.62,0.12,0.62),Color("#efece6"))
    _part_box(root,Vector3(0,0.85,-0.25),Vector3(0.62,0.8,0.12),Color("#efece6"))
    for x in [-0.23,0.23]:
        for z in [-0.23,0.23]:
            _part_box(root,Vector3(x,0.22,z),Vector3(0.08,0.45,0.08),Color("#b6b2aa"))

func _build_decor():
    for p in [Vector3(-5.8,0,-4.8),Vector3(5.8,0,-4.8),Vector3(5.8,0,5.9)]:
        _plant(p)
    _box("Sideboard",Vector3(-5.7,0.55,5.6),Vector3(1.8,1.1,0.65),Color("#f5f2ec"))
    _box("MenuBoard",Vector3(-6.84,1.65,0.2),Vector3(0.10,1.9,2.3),Color("#33363a"))
    var menu = Label3D.new(); menu.text="TODAY\nBreakfast\nCoffee\nSubs\nSmash"; menu.font_size=28; menu.modulate=Color.WHITE; menu.position=Vector3(-6.72,1.7,0.2); menu.rotation_degrees=Vector3(0,90,0); add_child(menu)

func _plant(pos:Vector3):
    _cylinder("Pot",pos+Vector3(0,0.32,0),0.34,0.62,Color("#d18a55"))
    for off in [Vector3(-0.22,1.0,0),Vector3(0.18,1.25,0.05),Vector3(0,1.5,-0.05),Vector3(0.28,0.95,-0.08)]:
        _sphere("Leaf",pos+off,Vector3(0.38,0.58,0.28),Color("#5fb75d"))

func _build_task_markers():
    _task_marker(Vector3(-4.2,2.55,-3.7),"COFFEE",C_BLUE)
    _task_marker(Vector3(2.5,2.65,-3.65),"COOK",C_RED)
    _task_marker(Vector3(5.4,2.45,-2.3),"READY",C_GREEN)

func _task_marker(pos:Vector3,text:String,col:Color):
    var root=Node3D.new(); root.position=pos; add_child(root); task_nodes.append(root)
    _part_sphere(root,Vector3.ZERO,Vector3(0.48,0.48,0.18),Color.WHITE)
    var l=Label3D.new(); l.text=text; l.font_size=24; l.modulate=col; l.position=Vector3(0,0,0.12); root.add_child(l)

func _build_people():
    player = _make_person("YOU",Vector3(0.0,0,5.5),Color("#ef5f43"),true,true)
    player_target = player["node"].position
    staff.append(_make_person("Cashier",counter_pos+Vector3(0.7,0,0.8),Color("#3f8ed1"),true,false))
    staff.append(_make_person("Chef",kitchen_pos+Vector3(0.4,0,0.9),Color("#cc4d3c"),true,false))

func _make_person(label:String,pos:Vector3,shirt:Color,is_staff:bool,is_player:bool):
    var root=Node3D.new(); root.name=label; root.position=pos; add_child(root)
    _part_capsule(root,Vector3(0,1.0,0),0.32,0.85,shirt)
    _part_sphere(root,Vector3(0,1.72,0),Vector3(0.42,0.46,0.42),Color("#f0bb8a"))
    _part_sphere(root,Vector3(0,2.02,-0.03),Vector3(0.43,0.20,0.40),Color("#35251f"))
    _part_capsule(root,Vector3(-0.22,0.38,0),0.10,0.58,Color("#353535"))
    _part_capsule(root,Vector3(0.22,0.38,0),0.10,0.58,Color("#353535"))
    _part_capsule(root,Vector3(-0.42,1.02,0),0.085,0.52,Color("#f0bb8a"),-0.14)
    _part_capsule(root,Vector3(0.42,1.02,0),0.085,0.52,Color("#f0bb8a"),0.14)
    _part_box(root,Vector3(-0.23,0.05,0.08),Vector3(0.25,0.10,0.42),Color.WHITE)
    _part_box(root,Vector3(0.23,0.05,0.08),Vector3(0.25,0.10,0.42),Color.WHITE)
    if is_staff:
        _part_box(root,Vector3(0,1.08,0.32),Vector3(0.34,0.44,0.05),Color("#1f1f1f"))
    if is_player:
        var halo=_cylinder_child(root,Vector3(0,0.03,0),0.58,0.04,C_GOLD); halo.material_override=_mat(Color(1,0.73,0.18,0.75),true)
    return {"node":root,"role":label,"target":pos,"speed":2.8 if is_player else 2.25,"phase":randf()*5.0,"player":is_player}

func _part_capsule(parent:Node3D,pos:Vector3,r:float,h:float,col:Color,tilt:float=0.0):
    var mi=MeshInstance3D.new(); var m=CapsuleMesh.new(); m.radius=r; m.height=h; mi.mesh=m; mi.position=pos; mi.rotation.z=tilt; mi.material_override=_mat(col); parent.add_child(mi)

func _part_sphere(parent:Node3D,pos:Vector3,size:Vector3,col:Color):
    var mi=MeshInstance3D.new(); var m=SphereMesh.new(); m.radius=0.5; m.height=1.0; mi.mesh=m; mi.position=pos; mi.scale=size; mi.material_override=_mat(col); parent.add_child(mi)

func _part_box(parent:Node3D,pos:Vector3,size:Vector3,col:Color):
    var mi=MeshInstance3D.new(); var m=BoxMesh.new(); m.size=size; mi.mesh=m; mi.position=pos; mi.material_override=_mat(col); parent.add_child(mi)

func _cylinder_child(parent:Node3D,pos:Vector3,r:float,h:float,col:Color):
    var mi=MeshInstance3D.new(); var m=CylinderMesh.new(); m.top_radius=r; m.bottom_radius=r; m.height=h; mi.mesh=m; mi.position=pos; mi.material_override=_mat(col); parent.add_child(mi); return mi

func _spawn_customer():
    order_id += 1
    var recipe = recipes.pick_random().duplicate()
    var sit_in = randf() < 0.62
    var colors=[Color("#66a765"),Color("#7d6bd2"),Color("#df7c61"),Color("#4fa6b4"),Color("#e5a23c"),Color("#db6b9e")]
    var p=_make_person(recipe["name"],door_pos,colors.pick_random(),false,false)
    p["state"]="queue"; p["recipe"]=recipe; p["patience"]=100.0; p["sit_in"]=sit_in
    p["queue_index"]=min(customers.size(),queue_points.size()-1); p["order_started"]=false; p["served"]=false; p["table"]=-1; p["id"]=order_id
    customers.append(p)
    _order_bubble(p)

func _order_bubble(c):
    var root:Node3D=c["node"]
    _part_sphere(root,Vector3(0,2.65,0),Vector3(0.54,0.38,0.16),Color.WHITE)
    var l=Label3D.new(); l.text=c["recipe"]["emoji"]; l.font_size=26; l.modulate=C_DARK; l.position=Vector3(0,2.65,0.16); root.add_child(l)

func _update_customers(delta):
    for i in range(customers.size()-1,-1,-1):
        var c=customers[i]
        c["patience"] -= delta*(2.1 if rush else 1.15)
        if c["patience"]<=0 and c["state"] not in ["exit","eating"]:
            rep=max(0.0,rep-2.0); c["state"]="exit"; _toast("Customer walked out -2 REP")
        match c["state"]:
            "queue":
                _move_person(c,queue_points[c["queue_index"]],delta)
                if c["queue_index"]==0 and c["node"].position.distance_to(queue_points[0])<0.25 and not c["order_started"]:
                    c["order_started"]=true
                    orders.append({"customer":c,"recipe":c["recipe"],"progress":0.0,"ready":false,"boost":0.0})
                    c["state"]="waiting"; _shift_queue()
            "waiting":
                _move_person(c,Vector3(-3.7,0,-1.0),delta)
            "ready":
                _move_person(c,collection_pos+Vector3(0,0,1.55),delta)
                if c["node"].position.distance_to(collection_pos+Vector3(0,0,1.55))<0.35:
                    if c["sit_in"]:
                        var idx=_free_table()
                        if idx>=0:
                            c["table"]=idx; tables[idx]["busy"]=true; c["state"]="eating"; c["eat_timer"]=randf_range(5.5,8.0)
                        else:
                            c["state"]="exit"; _complete_sale(c)
                    else:
                        c["state"]="exit"; _complete_sale(c)
            "eating":
                var tp=tables[c["table"]]["pos"]+Vector3(0,0,0.42)
                _move_person(c,tp,delta); c["eat_timer"]-=delta
                if c["eat_timer"]<=0:
                    tables[c["table"]]["busy"]=false; c["state"]="exit"; _complete_sale(c)
            "exit":
                _move_person(c,door_pos,delta)
                if c["node"].position.distance_to(door_pos)<0.25:
                    c["node"].queue_free(); customers.remove_at(i); continue
        customers[i]=c

func _shift_queue():
    for c in customers:
        if c["state"]=="queue": c["queue_index"]=max(0,int(c["queue_index"])-1)

func _free_table():
    for i in range(tables.size()):
        if not tables[i]["busy"]: return i
    return -1

func _update_orders(delta):
    for o in orders:
        if o["ready"]: continue
        var rate=12.0+float(kitchen_level)*2.3
        if o["recipe"]["station"]=="coffee": rate += 4.0
        if o["boost"]>0:
            rate += 12.0; o["boost"]-=delta
        o["progress"] += delta*rate
        if o["progress"]>=100.0:
            o["ready"]=true; o["customer"]["state"]="ready"; _toast(o["recipe"]["name"]+" ready")

func _update_staff(delta):
    var cashier=staff[0]
    var chef=staff[1]
    var waiting=false
    for c in customers:
        if c["state"]=="waiting": waiting=true; break
    cashier["target"]=counter_pos+Vector3(0.7,0,0.8 if waiting else 0.95)
    var active_order=null
    for o in orders:
        if not o["ready"]:
            active_order=o; break
    if active_order!=null:
        var station=active_order["recipe"]["station"]
        var pos=kitchen_pos+Vector3(0.2,0,0.9)
        if station=="grill": pos=Vector3(0.9,0,-2.75)
        elif station=="prep": pos=Vector3(2.5,0,-2.75)
        elif station=="fryer": pos=Vector3(4.1,0,-2.75)
        elif station=="coffee": pos=Vector3(-4.2,0,-2.65)
        chef["target"]=pos
    else:
        chef["target"]=kitchen_pos+Vector3(0.2,0,0.9)
    _move_person(cashier,cashier["target"],delta)
    _move_person(chef,chef["target"],delta)
    if staff.size()>2:
        var runner=staff[2]
        var target=collection_pos+Vector3(-0.8,0,1.3)
        for c in customers:
            if c["state"]=="ready": target=c["node"].position; break
        runner["target"]=target; _move_person(runner,target,delta)

func _update_player(delta):
    if not player.has("node"): return
    _move_person(player,player_target,delta)
    if player["node"].position.distance_to(kitchen_pos+Vector3(0,0,1.0))<2.1:
        for o in orders:
            if not o["ready"]: o["boost"]=0.25
    if player["node"].position.distance_to(counter_pos+Vector3(0,0,1.0))<2.0:
        energy=min(50.0,energy+delta*0.18)

func _move_person(p,target:Vector3,delta):
    var node:Node3D=p["node"]
    var flat=Vector3(target.x,node.position.y,target.z)
    var d=flat-node.position
    if d.length()>0.05:
        node.position += d.normalized()*min(d.length(),float(p["speed"])*delta)
        node.rotation.y=atan2(d.x,d.z)

func _animate_people(_delta):
    var t=Time.get_ticks_msec()*0.001
    if player.has("node"): player["node"].position.y=abs(sin(t*6.0))*0.025
    for s in staff: s["node"].position.y=abs(sin(t*5.0+s["phase"]))*0.018
    for c in customers: c["node"].position.y=abs(sin(t*6.0+float(c["id"]))*0.028)
    for i in range(task_nodes.size()): task_nodes[i].position.y += sin(t*2.3+float(i))*0.0006

func _complete_sale(c):
    if c["served"]: return
    c["served"]=true
    var base=float(c["recipe"]["price"])
    var tip=max(0.0,(float(c["patience"])-35.0)/100.0)*1.6
    if rush: tip+=0.6
    cash+=base+tip; today+=base+tip; served+=1; xp+=9; rep=min(100.0,rep+0.22); energy=min(50.0,energy+0.9)
    _toast("+£%.2f  %s"%[base+tip,c["recipe"]["name"]])

func _build_ui():
    var layer=CanvasLayer.new(); add_child(layer)
    var top=Panel.new(); top.position=Vector2(16,18); top.size=Vector2(688,104); top.add_theme_stylebox_override("panel",_style(Color("#ffffffed"),24)); layer.add_child(top)
    ui["level"]=_label(top,Vector2(18,12),Vector2(110,42),"★ 1",28,C_GOLD)
    ui["cash"]=_label(top,Vector2(138,8),Vector2(140,48),"£85",26,C_DARK)
    ui["rep"]=_label(top,Vector2(290,8),Vector2(145,48),"82% REP",22,C_DARK)
    ui["day"]=_label(top,Vector2(448,6),Vector2(115,32),"DAY 1",18,C_DARK)
    ui["time"]=_label(top,Vector2(448,35),Vector2(120,38),"08:00",26,C_DARK)
    ui["served"]=_label(top,Vector2(570,8),Vector2(100,54),"SERVED\n0",18,C_DARK)
    ui["xpbar"]=_progress(top,Vector2(138,62),Vector2(250,22),18,120,C_BLUE)

    _circle_button(layer,Vector2(18,155),"SHOP",Color("#ff8f55"),Callable(self,"_shop"))
    _circle_button(layer,Vector2(618,155),"⚙",Color.WHITE,Callable(self,"_settings"),C_DARK)
    _circle_button(layer,Vector2(618,245),"TASK",Color("#70b7ff"),Callable(self,"_tasks"))
    _circle_button(layer,Vector2(618,335),"STAFF",Color("#b783ef"),Callable(self,"_hire_runner"))
    _circle_button(layer,Vector2(618,425),"BUILD",Color("#f7b54d"),Callable(self,"_upgrade_kitchen"))

    var mission=Panel.new(); mission.position=Vector2(178,135); mission.size=Vector2(360,54); mission.add_theme_stylebox_override("panel",_style(Color("#ffffffeb"),20)); layer.add_child(mission)
    ui["mission"]=_label(mission,Vector2(12,8),Vector2(336,38),"Serve 5 customers",20,Color("#745596"))

    var go=_button(layer,Vector2(255,1050),Vector2(210,118),"GO",Callable(self,"_toggle_open"),Color("#ff5c3f"),42)
    ui["go"]=go
    var ebox=Panel.new(); ebox.position=Vector2(240,1190); ebox.size=Vector2(240,54); ebox.add_theme_stylebox_override("panel",_style(Color("#ffffffea"),20)); layer.add_child(ebox)
    ui["energy"]=_progress(ebox,Vector2(14,16),Vector2(210,22),50,50,C_BLUE)
    _label(ebox,Vector2(-30,10),Vector2(40,35),"⚡",26,C_GOLD)

    var toast=Panel.new(); toast.position=Vector2(95,945); toast.size=Vector2(530,64); toast.add_theme_stylebox_override("panel",_style(Color("#242424dd"),22)); layer.add_child(toast)
    ui["toast"]=_label(toast,Vector2(12,14),Vector2(506,38),"Welcome to Dexter's",18,Color.WHITE)

func _label(parent,pos:Vector2,size:Vector2,text:String,font_size:int,col:Color):
    var l=Label.new(); l.position=pos; l.size=size; l.text=text; l.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; l.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; l.add_theme_font_size_override("font_size",font_size); l.add_theme_color_override("font_color",col); parent.add_child(l); return l

func _progress(parent,pos:Vector2,size:Vector2,value:float,max_value:float,col:Color):
    var p=ProgressBar.new(); p.position=pos; p.size=size; p.min_value=0; p.max_value=max_value; p.value=value; p.show_percentage=false; p.add_theme_stylebox_override("background",_style(Color("#d9dee0"),11)); p.add_theme_stylebox_override("fill",_style(col,11)); parent.add_child(p); return p

func _button(parent,pos:Vector2,size:Vector2,text:String,call:Callable,col:Color,font_size:int=20):
    var b=Button.new(); b.position=pos; b.size=size; b.text=text; b.add_theme_font_size_override("font_size",font_size); b.add_theme_color_override("font_color",Color.WHITE); b.add_theme_stylebox_override("normal",_style(col,26)); b.add_theme_stylebox_override("hover",_style(col.lightened(0.08),26)); b.add_theme_stylebox_override("pressed",_style(col.darkened(0.08),26)); b.pressed.connect(call); parent.add_child(b); return b

func _circle_button(parent,pos:Vector2,text:String,col:Color,call:Callable,text_col:Color=Color.WHITE):
    var b=Button.new(); b.position=pos; b.size=Vector2(84,74); b.text=text; b.add_theme_font_size_override("font_size",15); b.add_theme_color_override("font_color",text_col); b.add_theme_stylebox_override("normal",_style(col,36)); b.add_theme_stylebox_override("pressed",_style(col.darkened(0.08),36)); b.pressed.connect(call); parent.add_child(b)

func _style(col:Color,r:int):
    var s=StyleBoxFlat.new(); s.bg_color=col; s.corner_radius_top_left=r; s.corner_radius_top_right=r; s.corner_radius_bottom_left=r; s.corner_radius_bottom_right=r; return s

func _update_ui():
    if ui.is_empty(): return
    ui["cash"].text="£%d"%int(cash)
    ui["rep"].text="%d%% REP"%int(rep)
    ui["day"].text="DAY %d"%day
    ui["time"].text="%02d:%02d"%[int(game_time),int((game_time-int(game_time))*60.0)]
    ui["served"].text="SERVED\n%d"%served
    ui["level"].text="★ %d"%max(1,int(xp/120)+1)
    ui["xpbar"].value=xp%120
    ui["energy"].value=energy
    ui["mission"].text="Serve %d / 5 customers"%min(served,5)
    ui["go"].text="PAUSE" if open else "GO"

func _toggle_open():
    open=not open
    if open:
        spawn_timer=0.2; _toast("Dexter's is OPEN — run the shift")
    else:
        _toast("Shift paused")

func _shop():
    if cash>=75:
        cash-=75; rep=min(100.0,rep+0.8); _toast("New décor bought +REP")
    else: _toast("Need £75 for décor")

func _settings():
    _toast("Settings coming in retail pass")

func _tasks():
    if served>=5:
        cash+=80; today+=80; served=0; _toast("Mission complete +£80")
    else: _toast("Mission: serve 5 customers")

func _upgrade_kitchen():
    var cost=140+70*(kitchen_level-1)
    if cash<float(cost): _toast("Need £%d"%cost); return
    cash-=cost; kitchen_level+=1; rep=min(100.0,rep+1.0); _toast("Kitchen upgraded to Lv%d"%kitchen_level)

func _hire_runner():
    if staff.size()>2: _toast("Runner already hired"); return
    if cash<160: _toast("Need £160 to hire runner"); return
    cash-=160; staff.append(_make_person("Runner",Vector3(4.8,0,1.0),Color("#4e9b63"),true,false)); _toast("Runner hired")

func _toast(text:String):
    if ui.has("toast"): ui["toast"].text=text

func _mat(c:Color,transparent:bool=false):
    var m=StandardMaterial3D.new(); m.albedo_color=c; m.roughness=0.72
    if transparent: m.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
    return m

func _box(n:String,pos:Vector3,size:Vector3,c:Color):
    var mi=MeshInstance3D.new(); mi.name=n; var m=BoxMesh.new(); m.size=size; mi.mesh=m; mi.position=pos; mi.material_override=_mat(c); add_child(mi); return mi

func _sphere(n:String,pos:Vector3,size:Vector3,c:Color):
    var mi=MeshInstance3D.new(); mi.name=n; var m=SphereMesh.new(); m.radius=0.5; m.height=1.0; mi.mesh=m; mi.position=pos; mi.scale=size; mi.material_override=_mat(c); add_child(mi); return mi

func _cylinder(n:String,pos:Vector3,r:float,h:float,c:Color):
    var mi=MeshInstance3D.new(); mi.name=n; var m=CylinderMesh.new(); m.top_radius=r; m.bottom_radius=r; m.height=h; mi.mesh=m; mi.position=pos; mi.material_override=_mat(c); add_child(mi); return mi
