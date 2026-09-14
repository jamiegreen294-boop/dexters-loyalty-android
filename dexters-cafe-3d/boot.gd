extends Control

@onready var status_label: Label = $SafeArea/Card/Status
@onready var progress: ProgressBar = $SafeArea/Card/Progress

func _ready() -> void:
    status_label.text = "Starting Dexter's Cafe..."
    progress.value = 20
    await get_tree().process_frame
    await get_tree().create_timer(0.15).timeout
    _start_game()

func _start_game() -> void:
    progress.value = 55
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

    status_label.text = "Loading cafe..."
    progress.value = 80
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
