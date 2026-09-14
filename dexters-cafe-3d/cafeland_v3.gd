extends "res://cafeland_v2.gd"

var pending_station_action: String = ""
var helpers: Dictionary = {
    "cashier": {"name":"Cashier","cost":200.0,"hired":false,"home":Vector3(-2.8,0,-2.25)},
    "grill": {"name":"Grill Helper","cost":260.0,"hired":false,"home":Vector3(0.9,0,-2.45)},
    "fryer": {"name":"Fryer Helper","cost":280.0,"hired":false,"home":Vector3(4.5,0,-2.45)},
    "coffee": {"name":"Barista","cost":240.0,"hired":false,"home":Vector3(-4.1,0,-2.30)},
    "cleaner": {"name":"Cleaner","cost":220.0,"hired":false,"home":Vector3(4.8,0,4.8)}
}
var helper_timers: Dictionary = {
    "grill": 0.0,
    "fryer": 0.0,
    "coffee": 0.0
}
var helper_panel: Panel
var helper_status: Label

func _ready() -> void:
    super._ready()
    _toast("Tap a station, walk to it, then work. Hire helpers when you can afford them.")

func _build_people() -> void:
    player = _make_person("YOU",Vector3(0,0,5.5),C_RED,true)
    player_target = player["node"].position

func _build_ui() -> void:
    super._build_ui()
    var helper_layer := CanvasLayer.new()
    add_child(helper_layer)

    var staff_button := Button.new()
    staff_button.anchor_left = 0.86
    staff_button.anchor_right = 0.98
    staff_button.anchor_top = 0.49
    staff_button.anchor_bottom = 0.535
    staff_button.text = "STAFF"
    staff_button.add_theme_font_size_override("font_size",13)
    staff_button.add_theme_color_override("font_color",Color.WHITE)
    staff_button.add_theme_stylebox_override("normal",_style(C_GREEN,16))
    staff_button.add_theme_stylebox_override("pressed",_style(C_GREEN.darkened(0.1),16))
    staff_button.pressed.connect(_toggle_helper_panel)
    helper_layer.add_child(staff_button)

    helper_panel = Panel.new()
    helper_panel.anchor_left = 0.08
    helper_panel.anchor_right = 0.92
    helper_panel.anchor_top = 0.56
    helper_panel.anchor_bottom = 0.80
    helper_panel.add_theme_stylebox_override("panel",_style(Color("#faf5ebf5"),20))
    helper_panel.visible = false
    helper_layer.add_child(helper_panel)

    var title := Label.new()
    title.position = Vector2(18,8)
    title.size = Vector2(520,34)
    title.text = "HIRE HELPERS"
    title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    title.add_theme_font_size_override("font_size",20)
    title.add_theme_color_override("font_color",C_DARK)
    helper_panel.add_child(title)

    helper_status = Label.new()
    helper_status.position = Vector2(18,42)
    helper_status.size = Vector2(520,28)
    helper_status.text = "Use game money to automate jobs"
    helper_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    helper_status.add_theme_font_size_override("font_size",13)
    helper_status.add_theme_color_override("font_color",Color("#5f5a52"))
    helper_panel.add_child(helper_status)

    var roles: Array[String] = ["cashier","grill","fryer","coffee","cleaner"]
    for i in range(roles.size()):
        var role: String = roles[i]
        var info: Dictionary = helpers[role]
        var b := Button.new()
        var col: int = i % 2
        var row: int = i / 2
        b.position = Vector2(20 + col*260,76 + row*58)
        b.size = Vector2(245,48)
        b.text = "%s  £%d" % [info["name"],int(info["cost"])]
        b.add_theme_font_size_override("font_size",13)
        b.add_theme_color_override("font_color",Color.WHITE)
        b.add_theme_stylebox_override("normal",_style(C_TEAL if role != "cleaner" else C_GREEN,14))
        b.add_theme_stylebox_override("pressed",_style(C_DARK,14))
        b.pressed.connect(func(): _hire_helper(role,b))
        helper_panel.add_child(b)

func _station_button(parent: Control, text: String, key: String) -> void:
    var b := Button.new()
    b.text = text
    b.custom_minimum_size = Vector2(104,56)
    b.add_theme_font_size_override("font_size",14)
    b.add_theme_color_override("font_color",Color.WHITE)
    b.add_theme_stylebox_override("normal",_style(Color("#2b2824e8"),14))
    b.add_theme_stylebox_override("pressed",_style(C_GOLD,14))
    b.pressed.connect(func(): _request_station_work(key))
    parent.add_child(b)

func _request_station_work(station_key: String) -> void:
    if not shift_open:
        _toast("Open Dexter's first")
        return
    selected_station = station_key
    pending_station_action = station_key
    var target: Vector3 = stations[station_key]["pos"] + Vector3(0,0,1.05)
    player_target = target
    _toast("Walking to %s..." % String(stations[station_key]["name"]))

func _update_player(delta: float) -> void:
    super._update_player(delta)
    if pending_station_action == "" or player.is_empty():
        return
    var target: Vector3 = stations[pending_station_action]["pos"] + Vector3(0,0,1.05)
    if player["node"].position.distance_to(target) <= 0.32:
        var key: String = pending_station_action
        pending_station_action = ""
        _begin_batch_now(key,false)

func _begin_batch_now(station_key: String, automated: bool) -> void:
    var s: Dictionary = stations[station_key]
    if bool(s["cooking"]):
        if not automated:
            _toast("%s is already cooking" % s["name"])
        return
    if int(s["stock"]) >= int(s["max_stock"]):
        if not automated:
            _toast("%s is fully stocked" % s["name"])
        return
    var cost: int = 2 + int(s["level"])
    if cash < float(cost):
        if not automated:
            _toast("Need £%d ingredients" % cost)
        return
    cash -= float(cost)
    s["cooking"] = true
    s["timer"] = max(2.2,float(s["duration"])-(float(s["level"])-1.0)*0.65)
    stations[station_key] = s
    if automated:
        _toast("%s started a %s batch" % [helpers[station_key]["name"],s["name"]])
    else:
        _toast("You started %s" % s["name"])

func _start_batch(station_key: String) -> void:
    _request_station_work(station_key)

func _toggle_helper_panel() -> void:
    helper_panel.visible = not helper_panel.visible
    if helper_panel.visible:
        _refresh_helper_status()

func _hire_helper(role: String, button: Button) -> void:
    var info: Dictionary = helpers[role]
    if bool(info["hired"]):
        helper_status.text = "%s already works for you" % info["name"]
        return
    var cost: float = float(info["cost"])
    if cash < cost:
        helper_status.text = "Need £%d to hire %s" % [int(cost),info["name"]]
        return
    cash -= cost
    info["hired"] = true
    helpers[role] = info
    var shirt: Color = C_BLUE
    if role == "grill": shirt = C_RED
    elif role == "fryer": shirt = C_GOLD
    elif role == "coffee": shirt = Color("#7a5b46")
    elif role == "cleaner": shirt = C_GREEN
    var person: Dictionary = _make_staff_person(String(info["name"]),info["home"],shirt,"cleaner" if role == "cleaner" else ("cashier" if role == "cashier" else "chef"))
    person["role"] = role
    staff.append(person)
    button.text = "%s  HIRED" % info["name"]
    button.disabled = true
    helper_status.text = "%s hired!" % info["name"]
    _toast("%s joined Dexter's" % info["name"])

func _refresh_helper_status() -> void:
    var hired: int = 0
    for role in helpers.keys():
        if bool(helpers[role]["hired"]):
            hired += 1
    helper_status.text = "%d / %d helpers hired   •   Cash £%d" % [hired,helpers.size(),int(cash)]

func _update_staff(delta: float) -> void:
    for i in range(staff.size()):
        var person: Dictionary = staff[i]
        var role: String = String(person.get("role",""))
        if role == "":
            continue
        var target: Vector3 = helpers[role]["home"]
        if role == "cleaner":
            var cleaning_idx: int = -1
            for ti in range(tables.size()):
                if tables[ti]["state"] == "dirty":
                    cleaning_idx = ti
                    target = tables[ti]["pos"] + Vector3(0.75,0,0.55)
                    break
            _move_person(person,target,delta)
            if cleaning_idx >= 0 and person["node"].position.distance_to(target) < 0.3:
                tables[cleaning_idx]["clean_timer"] = float(tables[cleaning_idx]["clean_timer"]) + delta
                if float(tables[cleaning_idx]["clean_timer"]) >= 2.0:
                    tables[cleaning_idx]["state"] = "clean"
                    tables[cleaning_idx]["clean_timer"] = 0.0
                    tables[cleaning_idx]["plate"].visible = false
                    reputation = min(100.0,reputation+0.2)
                    _toast("Cleaner cleared a table")
        elif role == "cashier":
            _move_person(person,target,delta)
            for c in customers:
                if c["state"] == "queue" and int(c["queue_index"]) == 0:
                    c["order_delay"] = max(0.0,float(c["order_delay"])-delta*0.9)
        else:
            var station_key: String = role
            target = stations[station_key]["pos"] + Vector3(0,0,1.0)
            _move_person(person,target,delta)
            helper_timers[station_key] = max(0.0,float(helper_timers[station_key])-delta)
            if int(stations[station_key]["stock"]) <= 2 and not bool(stations[station_key]["cooking"]) and float(helper_timers[station_key]) <= 0.0:
                _begin_batch_now(station_key,true)
                helper_timers[station_key] = 3.0
        staff[i] = person

func _update_ui() -> void:
    super._update_ui()
    if helper_status != null and helper_panel != null and helper_panel.visible:
        _refresh_helper_status()
