def get_portfolio_summary():
    return {
        "portfolio_value": 105430,
        "daily_return": 0.012,
        "expected_return": 0.15,
        "volatility": 0.09
    }


def get_allocation():
    return {
        "assets": [
            {"symbol": "AAPL", "weight": 0.3},
            {"symbol": "MSFT", "weight": 0.25},
            {"symbol": "GOOG", "weight": 0.2},
            {"symbol": "BOND", "weight": 0.25},
        ]
    }


def get_performance():
    return {
        "dates": ["2026-04-01","2026-04-02","2026-04-03"],
        "portfolio": [100000,101200,102300],
        "benchmark": [100000,100900,101100]
    }
