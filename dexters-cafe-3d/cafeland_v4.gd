extends "res://cafeland_v3.gd"

var route_dots: Array[MeshInstance3D] = []
var route_station: String = ""

func _ready() -> void:
    super._ready()
    _toast("Tap a station to walk there. Hire helpers to automate the cafe.")

func _build_world() -> void:
    RenderingServer.set_default_clear_color(Color("#83b867"))
    _build_camera_and_light()
    _box("Garden",Vector3(0,-0.38,0.8),Vector3(26,0.3,26),Color("#78ad58"))
    _box("CafeSlab",Vector3(0,-0.16,0.8),Vector3(14.6,0.22,14.6),Color("#d7c5a8"))
    _build_premium_floor()
    _build_glass_shell()
    _build_brand_wall()
    _build_service_counter_v4()
    _build_kitchen_v4()
    _build_dining_v4()
    _build_decor_v4()
    _build_entrance_v4()
    queue_points = [Vector3(-5.0,0,1.0),Vector3(-5.0,0,2.25),Vector3(-5.0,0,3.5),Vector3(-5.0,0,4.75)]

func _build_camera_and_light() -> void:
    camera = Camera3D.new()
    camera.projection = Camera3D.PROJECTION_ORTHOGONAL
    camera.size = 15.3
    camera.position = Vector3(12.8,17.4,15.7)
    camera.look_at_from_position(camera.position,Vector3(0,0.75,0.8),Vector3.UP)
    camera.current = true
    add_child(camera)
    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-50,-38,0)
    sun.light_energy = 1.0
    sun.light_color = Color("#fff0d6")
    sun.shadow_enabled = true
    add_child(sun)
    var fill := DirectionalLight3D.new()
    fill.rotation_degrees = Vector3(-42,138,0)
    fill.light_energy = 0.34
    fill.light_color = Color("#dff4ff")
    add_child(fill)
    var env_node := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("#8abf6b")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("#ffe8c9")
    env.ambient_light_energy = 0.58
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env_node.environment = env
    add_child(env_node)

func _build_premium_floor() -> void:
    for z in range(-5,8):
        for x in range(-6,7):
            var px: float = float(x) * 1.02
            var pz: float = float(z) * 0.82 + 1.0
            var c := Color("#d7a66e") if (x+z)%2 == 0 else Color("#c9915c")
            _box("OakPlank",Vector3(px,0.02,pz),Vector3(0.96,0.05,0.76),c)
    _box("KitchenZone",Vector3(2.35,0.08,-3.65),Vector3(8.1,0.08,3.3),Color("#eee9df"))
    for x in range(-1,7):
        for z in range(-5,-2):
            var tc := Color("#f4f2ec") if (x+z)%2 == 0 else Color("#dfe4df")
            _box("Tile",Vector3(float(x),0.12,float(z)+1.45),Vector3(0.92,0.035,0.92),tc)

func _build_glass_shell() -> void:
    _box("BackWall",Vector3(0,1.55,-5.7),Vector3(14.2,3.1,0.18),Color("#efe5d5"))
    _box("LeftHalfWall",Vector3(-6.95,0.75,0.8),Vector3(0.18,1.5,12.7),Color("#e6dac8"))
    for z in [-3.8,-1.9,0.0,1.9,3.8,5.7]:
        _box("Glass",Vector3(-6.92,2.0,z),Vector3(0.05,1.8,1.55),Color("#b9e8ec"))
        _box("Frame",Vector3(-6.86,2.0,z-0.79),Vector3(0.11,1.95,0.07),C_DARK)
    _box("RoofBeam",Vector3(-3.2,3.15,-1.2),Vector3(7.2,0.12,0.12),C_DARK)
    _box("RoofBeam2",Vector3(1.0,3.15,-1.2),Vector3(7.2,0.12,0.12),C_DARK)

func _build_brand_wall() -> void:
    _box("Feature",Vector3(2.65,1.55,-5.57),Vector3(7.6,2.7,0.08),Color("#29312c"))
    _box("GreenBand",Vector3(-3.8,2.45,-5.54),Vector3(4.5,0.32,0.09),Color("#69aa64"))
    var logo := Label3D.new()
    logo.text = "Dexter's"
    logo.font_size = 110
    logo.modulate = Color.WHITE
    logo.outline_size = 14
    logo.outline_modulate = Color("#161816")
    logo.position = Vector3(2.3,2.45,-5.47)
    add_child(logo)
    var sub := Label3D.new()
    sub.text = "GOOD FOOD • GOOD PEOPLE"
    sub.font_size = 24
    sub.modulate = C_GOLD
    sub.position = Vector3(2.3,1.82,-5.45)
    add_child(sub)

func _build_service_counter_v4() -> void:
    _box("CounterBase",Vector3(-3.35,0.58,-2.95),Vector3(4.9,1.08,1.55),Color("#3a423d"))
    for x in [-5.25,-4.55,-3.85,-3.15,-2.45,-1.75,-1.05]:
        _box("WoodSlat",Vector3(x,0.58,-2.16),Vector3(0.09,0.96,0.05),Color("#c48b53"))
    _box("StoneTop",Vector3(-3.35,1.18,-2.95),Vector3(5.15,0.16,1.7),Color("#f6efe3"))
    _box("Till",Vector3(-2.55,1.45,-2.72),Vector3(0.8,0.5,0.62),Color("#4c5350"))
    _box("TillGlow",Vector3(-2.55,1.64,-2.39),Vector3(0.58,0.28,0.035),Color("#5dd6e6"))
    _box("CoffeeMachine",Vector3(-4.45,1.52,-3.0),Vector3(1.15,0.85,0.72),Color("#59615f"))
    for x in [-4.67,-4.23]:
        _cylinder("Porta",Vector3(x,1.35,-2.57),0.12,0.2,C_DARK)
        _cup(Vector3(x,1.28,-2.42),Color("#fff7eb"))
    _box("PastryCase",Vector3(-1.15,1.45,-2.72),Vector3(0.9,0.54,0.64),Color("#bce6e2"))
    _box("PickupBase",Vector3(5.35,0.58,-2.55),Vector3(2.55,1.08,1.4),Color("#397d76"))
    _box("PickupTop",Vector3(5.35,1.18,-2.55),Vector3(2.75,0.15,1.55),Color("#f6efe3"))
    var pl := Label3D.new()
    pl.text = "PICK UP HERE"
    pl.font_size = 24
    pl.modulate = Color.WHITE
    pl.position = Vector3(5.35,1.78,-2.25)
    add_child(pl)

func _build_kitchen_v4() -> void:
    _box("KitchenBench",Vector3(2.65,0.62,-4.15),Vector3(6.4,1.08,1.5),Color("#adb8b5"))
    _box("KitchenTop",Vector3(2.65,1.18,-4.15),Vector3(6.65,0.12,1.62),Color("#dce2df"))
    _box("Hood",Vector3(2.75,2.45,-4.8),Vector3(5.8,0.48,0.8),Color("#8f9a98"))
    _box("HoodLip",Vector3(2.75,2.18,-4.4),Vector3(6.05,0.12,0.12),Color("#707b79"))
    for key in ["grill","prep","fryer"]:
        var s: Dictionary = stations[key]
        var col := Color("#4a504d")
        if key == "prep": col = Color("#397d76")
        if key == "fryer": col = Color("#7a633d")
        _box(String(s["name"]),Vector3(s["pos"].x,1.42,s["pos"].z-0.35),Vector3(1.38,0.42,0.92),col)
        var lab := Label3D.new()
        lab.text = "%s  %d" % [s["name"],s["stock"]]
        lab.font_size = 20
        lab.modulate = Color.WHITE
        lab.position = Vector3(s["pos"].x,1.98,s["pos"].z+0.08)
        add_child(lab)
        stations[key]["label"] = lab
        var anchor := Node3D.new()
        anchor.position = Vector3(s["pos"].x,1.72,s["pos"].z-0.02)
        add_child(anchor)
        station_food_nodes[key] = anchor
    _grill_food(station_food_nodes["grill"])
    _prep_food(station_food_nodes["prep"])
    _fryer_food(station_food_nodes["fryer"])
    var cl := Label3D.new()
    cl.text = "COFFEE  %d" % int(stations["coffee"]["stock"])
    cl.font_size = 20
    cl.modulate = C_DARK
    cl.position = Vector3(-4.35,2.08,-2.38)
    add_child(cl)
    stations["coffee"]["label"] = cl

func _build_dining_v4() -> void:
    var coords := [Vector3(-1.2,0,0.45),Vector3(2.1,0,0.55),Vector3(-1.0,0,3.35),Vector3(2.3,0,3.5)]
    for i in range(coords.size()):
        var p: Vector3 = coords[i]
        var plate := Node3D.new()
        plate.position = p + Vector3(0,0.98,0)
        plate.visible = false
        add_child(plate)
        tables.append({"pos":p,"state":"clean","clean_timer":0.0,"plate":plate})
        _cylinder("TableTop",p+Vector3(0,0.84,0),0.82,0.13,Color("#d6ab74"))
        _cylinder("Stem",p+Vector3(0,0.42,0),0.11,0.75,C_DARK)
        _cylinder("Base",p+Vector3(0,0.07,0),0.4,0.08,C_DARK)
        _chair_v4(p+Vector3(-1.02,0,0),PI/2)
        _chair_v4(p+Vector3(1.02,0,0),-PI/2)
        _plate_food(plate,i)
    _box("WindowBar",Vector3(-5.85,1.0,2.0),Vector3(0.85,0.14,4.6),Color("#d7aa73"))
    for z in [0.6,2.0,3.4]:
        _bar_stool(Vector3(-5.15,0,z))

func _chair_v4(pos: Vector3, rot: float) -> void:
    var root := Node3D.new()
    root.position = pos
    root.rotation.y = rot
    add_child(root)
    _part_cylinder(root,Vector3(0,0.48,0),0.34,0.16,Color("#638767"))
    _part_box(root,Vector3(0,0.88,-0.25),Vector3(0.66,0.58,0.12),Color("#f0eadf"))
    for x in [-0.23,0.23]:
        _part_box(root,Vector3(x,0.22,0.18),Vector3(0.07,0.46,0.07),C_DARK)
        _part_box(root,Vector3(x,0.22,-0.18),Vector3(0.07,0.46,0.07),C_DARK)

func _build_decor_v4() -> void:
    _box("MenuBoard",Vector3(6.82,1.8,-4.0),Vector3(0.08,2.2,2.5),Color("#202522"))
    var menu := Label3D.new()
    menu.text = "BURGERS\nLOADED FRIES\nRICE BOWLS\nBREAKFAST\nCOFFEE"
    menu.font_size = 20
    menu.modulate = Color.WHITE
    menu.position = Vector3(6.68,1.82,-4.0)
    menu.rotation_degrees = Vector3(0,-90,0)
    add_child(menu)
    for p in [Vector3(-5.9,0,-4.7),Vector3(5.9,0,-4.8),Vector3(5.7,0,5.7),Vector3(-5.65,0,5.65),Vector3(0.0,0,5.9)]:
        _plant(p)
    for p in [Vector3(-1.2,3.15,0.5),Vector3(2.1,3.15,0.55),Vector3(-1.0,3.15,3.35),Vector3(2.3,3.15,3.5)]:
        _pendant(p)
    var quote := Label3D.new()
    quote.text = "GOOD FOOD\nHAPPIER PEOPLE"
    quote.font_size = 25
    quote.modulate = C_DARK
    quote.position = Vector3(-6.7,1.75,4.1)
    quote.rotation_degrees = Vector3(0,90,0)
    add_child(quote)

func _build_entrance_v4() -> void:
    _box("Mat",Vector3(-4.95,0.08,6.15),Vector3(2.8,0.05,1.0),Color("#30332f"))
    _box("QueuePost1",Vector3(-5.65,0.55,2.8),Vector3(0.08,1.05,4.5),Color("#333734"))
    _box("QueuePost2",Vector3(-4.25,0.55,2.8),Vector3(0.08,1.05,4.5),Color("#333734"))

func _make_person(label: String, pos: Vector3, shirt: Color, is_player: bool) -> Dictionary:
    var root := Node3D.new()
    root.name = label
    root.position = pos
    add_child(root)
    _part_sphere(root,Vector3(0,1.08,0),Vector3(0.72,0.86,0.52),shirt)
    _part_sphere(root,Vector3(0,1.76,0),Vector3(0.48,0.52,0.48),Color("#e1ad7c"))
    _part_sphere(root,Vector3(0,2.07,-0.04),Vector3(0.50,0.23,0.47),Color("#34251f"))
    _part_capsule(root,Vector3(-0.25,0.38,0),0.095,0.62,C_DARK)
    _part_capsule(root,Vector3(0.25,0.38,0),0.095,0.62,C_DARK)
    _part_capsule(root,Vector3(-0.47,1.08,0),0.08,0.54,Color("#e1ad7c"))
    _part_capsule(root,Vector3(0.47,1.08,0),0.08,0.54,Color("#e1ad7c"))
    _part_sphere(root,Vector3(-0.16,1.82,-0.43),Vector3(0.07,0.07,0.04),C_DARK)
    _part_sphere(root,Vector3(0.16,1.82,-0.43),Vector3(0.07,0.07,0.04),C_DARK)
    if is_player:
        _cylinder_child(root,Vector3(0,0.035,0),0.58,0.05,C_GOLD)
        var badge := Label3D.new()
        badge.text = "YOU"
        badge.font_size = 16
        badge.modulate = C_DARK
        badge.position = Vector3(0,2.42,0)
        root.add_child(badge)
    return {"node":root,"target":pos,"speed":2.7 if is_player else 2.05,"phase":randf()*4.0}

func _request_station_work(station_key: String) -> void:
    super._request_station_work(station_key)
    if pending_station_action != "":
        _show_route_to_station(station_key)

func _update_player(delta: float) -> void:
    super._update_player(delta)
    if pending_station_action == "" and route_dots.size() > 0:
        _clear_route()

func _show_route_to_station(station_key: String) -> void:
    _clear_route()
    route_station = station_key
    if player.is_empty():
        return
    var start: Vector3 = player["node"].position
    var target: Vector3 = stations[station_key]["pos"] + Vector3(0,0,1.05)
    var dist: float = start.distance_to(target)
    var steps: int = maxi(3,int(dist/0.75))
    for i in range(1,steps):
        var t: float = float(i)/float(steps)
        var p: Vector3 = start.lerp(target,t)
        var dot := _cylinder("RouteDot",Vector3(p.x,0.14,p.z),0.13,0.04,Color("#62d9ef"))
        route_dots.append(dot)

func _clear_route() -> void:
    for dot in route_dots:
        if is_instance_valid(dot): dot.queue_free()
    route_dots.clear()
    route_station = ""
