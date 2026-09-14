extends Control

@onready var status_label: Label = $SafeArea/Card/Content/Status
@onready var progress: ProgressBar = $SafeArea/Card/Content/Progress
@onready var start_button: Button = $SafeArea/Card/Content/Start

func _ready() -> void:
    status_label.text = "New cafe graphics + interactive station movement\nTap ENTER DEXTER'S to play"
    progress.value = 100
    start_button.disabled = false
    start_button.visible = true
    start_button.pressed.connect(_start_game)

func _start_game() -> void:
    start_button.disabled = true
    start_button.text = "LOADING CAFE..."
    status_label.text = "Building Dexter's Cafe..."
    progress.value = 35
    await get_tree().process_frame

    var packed := load("res://Main.tscn") as PackedScene
    if packed == null:
        _show_error("Game scene could not be loaded")
        return
    var game := packed.instantiate()
    if game == null or game.get_script() == null:
        if game != null: game.queue_free()
        _show_error("Game script did not load")
        return

    progress.value = 70
    get_tree().root.add_child(game)
    await get_tree().process_frame
    await get_tree().process_frame
    if not is_instance_valid(game) or game.get_child_count() < 5:
        if is_instance_valid(game): game.queue_free()
        _show_error("Cafe failed to build")
        return

    progress.value = 100
    get_tree().current_scene = game
    queue_free()

func _show_error(message: String) -> void:
    progress.value = 0
    status_label.text = message + "\nSend me a screenshot of this message."
    start_button.disabled = false
    start_button.text = "TRY AGAIN"
    start_button.visible = true
