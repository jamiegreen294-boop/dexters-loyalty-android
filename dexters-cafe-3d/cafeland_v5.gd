extends "res://cafeland_v4.gd"

# Cafeland-style presentation pass: fixed isometric angle, free pan, pinch zoom,
# larger cafe footprint and denser surrounding world. All artwork remains original
# Dexter's geometry/assets rather than copying Cafeland's protected art.

var camera_focus := Vector3(0.0, 0.55, 0.9)
var camera_offset := Vector3(12.3, 16.8, 14.8)
var touches: Dictionary = {}
var drag_distance: float = 0.0
var pinch_distance: float = 0.0
var mouse_dragging: bool = false
var mouse_last := Vector2.ZERO

func _ready() -> void:
    super._ready()
    _apply_camera_transform()
    _toast("Drag the cafe to move around • pinch to zoom • tap stations to work")

func _build_world() -> void:
    super._build_world()
    _build_cafeland_surroundings()
    _build_extra_cafe_detail()

func _build_camera_and_light() -> void:
    camera = Camera3D.new()
    camera.projection = Camera3D.PROJECTION_ORTHOGONAL
    camera.size = 13.8
    camera.position = camera_focus + camera_offset
    camera.look_at_from_position(camera.position,camera_focus,Vector3.UP)
    camera.current = true
    add_child(camera)

    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-52,-36,0)
    sun.light_energy = 0.56
    sun.light_color = Color("#fff4e6")
    sun.shadow_enabled = true
    add_child(sun)

    var fill := DirectionalLight3D.new()
    fill.rotation_degrees = Vector3(-30,145,0)
    fill.light_energy = 0.12
    fill.light_color = Color("#d9ecff")
    add_child(fill)

    var env_node := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_COLOR
    env.background_color = Color("#8fbe68")
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color("#d9d2c8")
    env.ambient_light_energy = 0.30
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env_node.environment = env
    add_child(env_node)

func _apply_camera_transform() -> void:
    if camera == null:
        return
    camera.position = camera_focus + camera_offset
    camera.look_at_from_position(camera.position,camera_focus,Vector3.UP)

func _pan_camera(screen_delta: Vector2) -> void:
    if camera == null:
        return
    var scale := camera.size / 900.0
    var dx := -screen_delta.x * scale
    var dz := -screen_delta.y * scale
    # Map screen drag onto the isometric floor axes.
    camera_focus.x += dx * 0.92 + dz * 0.68
    camera_focus.z += -dx * 0.72 + dz * 0.92
    camera_focus.x = clampf(camera_focus.x,-5.8,5.8)
    camera_focus.z = clampf(camera_focus.z,-4.5,6.0)
    _apply_camera_transform()

func _zoom_camera(amount: float) -> void:
    if camera == null:
        return
    camera.size = clampf(camera.size + amount,8.7,19.5)
    _apply_camera_transform()

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        var t := event as InputEventScreenTouch
        if t.pressed:
            touches[t.index] = t.position
            if touches.size() == 1:
                drag_distance = 0.0
            if touches.size() == 2:
                var vals: Array = touches.values()
                pinch_distance = (vals[0] as Vector2).distance_to(vals[1] as Vector2)
        else:
            var was_tap := touches.size() == 1 and drag_distance < 12.0
            touches.erase(t.index)
            pinch_distance = 0.0
            if was_tap:
                _world_tap(t.position)
    elif event is InputEventScreenDrag:
        var d := event as InputEventScreenDrag
        touches[d.index] = d.position
        if touches.size() >= 2:
            var vals: Array = touches.values()
            var now_dist: float = (vals[0] as Vector2).distance_to(vals[1] as Vector2)
            if pinch_distance > 0.0:
                _zoom_camera((pinch_distance-now_dist)*0.018)
            pinch_distance = now_dist
        else:
            drag_distance += d.relative.length()
            if drag_distance > 8.0:
                _pan_camera(d.relative)
    elif event is InputEventMouseButton:
        var mb := event as InputEventMouseButton
        if mb.button_index == MOUSE_BUTTON_LEFT:
            mouse_dragging = mb.pressed
            mouse_last = mb.position
            if mb.pressed:
                drag_distance = 0.0
            elif drag_distance < 8.0:
                _world_tap(mb.position)
        elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
            _zoom_camera(-0.8)
        elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
            _zoom_camera(0.8)
    elif event is InputEventMouseMotion and mouse_dragging:
        var mm := event as InputEventMouseMotion
        var rel := mm.position - mouse_last
        mouse_last = mm.position
        drag_distance += rel.length()
        if drag_distance > 6.0:
            _pan_camera(rel)

func _build_cafeland_surroundings() -> void:
    # Cafeland-like "whole lot" view: street, pavement and exterior greenery
    # around the cafe so panning feels like moving around a place, not a static room.
    _box("Street",Vector3(0,-0.42,-9.3),Vector3(24.0,0.20,4.2),Color("#6d7374"))
    _box("Pavement",Vector3(0,-0.30,-7.05),Vector3(24.0,0.18,1.15),Color("#c8c2b7"))
    for x in range(-10,11,2):
        _box("RoadMark",Vector3(float(x),-0.30,-9.3),Vector3(0.85,0.025,0.12),Color("#f4e8b0"))
    _box("GrassLeft",Vector3(-9.0,-0.36,1.0),Vector3(3.6,0.16,15.4),Color("#78a85e"))
    _box("GrassRight",Vector3(9.0,-0.36,1.0),Vector3(3.6,0.16,15.4),Color("#78a85e"))
    for p in [Vector3(-8.7,0,-5.5),Vector3(-8.5,0,-1.8),Vector3(-8.8,0,2.0),Vector3(-8.4,0,5.5),Vector3(8.6,0,-4.7),Vector3(8.7,0,-0.8),Vector3(8.5,0,3.3),Vector3(8.7,0,6.0)]:
        _tree_v5(p)
    _street_lamp(Vector3(-5.8,0,-6.9))
    _street_lamp(Vector3(0.0,0,-6.9))
    _street_lamp(Vector3(5.8,0,-6.9))

func _build_extra_cafe_detail() -> void:
    # Dense decorative objects make the room read more like a designed sim cafe.
    _box("FrontAwning",Vector3(-3.2,2.85,-5.95),Vector3(5.6,0.16,0.78),Color("#5b9d61"))
    for x in [-5.2,-4.3,-3.4,-2.5,-1.6,-0.7]:
        _box("AwningStripe",Vector3(x,2.83,-6.35),Vector3(0.42,0.10,0.16),Color("#f3eadc"))
    _box("DisplayShelf",Vector3(5.75,1.20,1.8),Vector3(1.5,2.1,0.42),Color("#b57d4d"))
    for y in [0.58,1.15,1.72]:
        _box("Shelf",Vector3(5.75,y,1.55),Vector3(1.35,0.08,0.55),Color("#eadcc9"))
        for x in [5.35,5.75,6.15]:
            _cup(Vector3(x,y+0.16,1.48),Color("#faf4ea"))
    _box("CommunityBoard",Vector3(-6.72,1.75,4.8),Vector3(0.07,1.45,1.7),Color("#b87e4d"))
    for z in [4.35,4.8,5.25]:
        _box("Note",Vector3(-6.64,1.75,z),Vector3(0.04,0.35,0.32),Color("#f4d978"))

func _tree_v5(pos: Vector3) -> void:
    _cylinder("TreeTrunk",pos+Vector3(0,0.72,0),0.18,1.45,Color("#765038"))
    _sphere("TreeCrownA",pos+Vector3(0,1.85,0),Vector3(1.15,1.1,1.0),Color("#4f8f52"))
    _sphere("TreeCrownB",pos+Vector3(0.55,2.05,0.12),Vector3(0.78,0.82,0.75),Color("#67a85f"))
    _sphere("TreeCrownC",pos+Vector3(-0.50,2.10,-0.12),Vector3(0.78,0.85,0.78),Color("#75b267"))

func _street_lamp(pos: Vector3) -> void:
    _cylinder("LampPost",pos+Vector3(0,1.4,0),0.055,2.8,Color("#333633"))
    _part_box(self,pos+Vector3(0.28,2.72,0),Vector3(0.55,0.07,0.07),Color("#333633"))
    _sphere("LampGlow",pos+Vector3(0.52,2.62,0),Vector3(0.24,0.18,0.24),Color("#ffe0a0"))

func _make_person(label: String, pos: Vector3, shirt: Color, is_player: bool) -> Dictionary:
    # Smaller, rounder chibi proportions to move away from the old capsule prototype.
    var root := Node3D.new()
    root.name = label
    root.position = pos
    root.scale = Vector3(0.82,0.82,0.82)
    add_child(root)
    _part_capsule(root,Vector3(0,0.95,0),0.34,0.74,shirt)
    _part_sphere(root,Vector3(0,1.64,0),Vector3(0.48,0.50,0.48),Color("#e0aa78"))
    _part_sphere(root,Vector3(0,1.89,-0.02),Vector3(0.47,0.22,0.45),Color("#3b2922"))
    _part_capsule(root,Vector3(-0.26,0.34,0),0.095,0.54,Color("#292724"))
    _part_capsule(root,Vector3(0.26,0.34,0),0.095,0.54,Color("#292724"))
    _part_capsule(root,Vector3(-0.40,0.98,0),0.075,0.50,Color("#e0aa78"))
    _part_capsule(root,Vector3(0.40,0.98,0),0.075,0.50,Color("#e0aa78"))
    _part_sphere(root,Vector3(-0.15,1.66,0.43),Vector3(0.055,0.07,0.04),Color("#252321"))
    _part_sphere(root,Vector3(0.15,1.66,0.43),Vector3(0.055,0.07,0.04),Color("#252321"))
    _part_box(root,Vector3(0,1.03,0.33),Vector3(0.42,0.42,0.035),Color("#f2ece2"))
    if is_player:
        _part_cylinder(root,Vector3(0,2.03,0),0.34,0.13,Color("#242724"))
        _cylinder_child(root,Vector3(0,0.03,0),0.52,0.045,C_GOLD)
        var badge := Label3D.new()
        badge.text = "YOU"
        badge.font_size = 16
        badge.modulate = C_DARK
        badge.position = Vector3(0,2.34,0)
        root.add_child(badge)
    return {"node":root,"target":pos,"speed":2.65 if is_player else 2.0,"phase":randf()*4.0}
