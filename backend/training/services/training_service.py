def start_training(config):

    return {
        "status": "training_started",
        "algorithm": config["algorithm"],
        "episodes": config["episodes"]
    }