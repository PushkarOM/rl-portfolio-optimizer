def get_models_list():
    return [
        {
            "id": 1,
            "name": "PPO Conservative",
            "algorithm": "PPO",
            "assets": ["AAPL", "MSFT", "GOOG"],
            "is_pretrained": True,
            "sharpe_ratio": 1.42
        },
        {
            "id": 2,
            "name": "DQN Crypto",
            "algorithm": "DQN",
            "assets": ["BTC", "ETH"],
            "is_pretrained": True,
            "sharpe_ratio": 1.10
        },
        {
            "id": 3,
            "name": "Custom Model",
            "algorithm": "PPO",
            "assets": ["TSLA", "AAPL"],
            "is_pretrained": False,
            "sharpe_ratio": 1.28
        }
    ]