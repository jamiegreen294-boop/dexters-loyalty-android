extends Control

@onready var status_label: Label = $SafeArea/Card/Status
@onready var progress: ProgressBar = $SafeArea/Card/Progress
@onready var start_button: Button = $SafeArea/Card/Start

func _ready() -> void:
    status_label.text = "Build 15 loaded successfully\nTap START CAFE to enter Dexter's"
    progress.value = 100
    start_button.disabled = false
    start_button.visible = true
    start_button.pressed.connect(_start_game)

func _start_game() -> void:
    start_button.disabled = true
    start_button.text = "LOADING..."
    status_label.text = "Loading Dexter's Cafe..."
    progress.value = 35
    await get_tree().process_frame

    var packed := load("res://Main.tscn") as PackedScene
    if packed == null:
        _show_error("Game scene could not be loaded")
        return

    var game := packed.instantiate()
    if game == null:
        _show_error("Game could not be started")
        return
    if game.get_script() == null:
        game.queue_free()
        _show_error("Game script did not load")
        return

    progress.value = 65
    get_tree().root.add_child(game)
    await get_tree().process_frame
    await get_tree().process_frame

    if not is_instance_valid(game):
        _show_error("Game stopped during startup")
        return
    if game.get_child_count() < 5:
        game.queue_free()
        _show_error("Cafe failed to build")
        return

    progress.value = 100
    get_tree().current_scene = game
    queue_free()

func _show_error(message: String) -> void:
    progress.value = 0
    status_label.text = message + "\nPlease send a screenshot of this message."
    start_button.disabled = false
    start_button.text = "TRY AGAIN"
    start_button.visible = true
