import gymnasium as gym
import numpy as np


class PortfolioEnv(gym.Env):
    def __init__(self, df):
        super().__init__()

        self.df = df.copy()

        self.dates   = sorted(self.df['date'].unique())
        self.tickers = sorted(self.df['ticker'].unique())
        self.grouped = self.df.groupby('date')

        self.num_assets  = len(self.tickers)
        self.num_features = 5  # return, volatility, momentum, sma_ratio, vix_z

        self.action_space = gym.spaces.Box(
            low=0, high=1,
            shape=(self.num_assets,),
            dtype=np.float32
        )
        self.observation_space = gym.spaces.Box(
            low=-np.inf, high=np.inf,
            shape=(self.num_assets * self.num_features,),
            dtype=np.float32
        )

        self.current_step  = None
        self.prev_weights  = np.ones(self.num_assets) / self.num_assets
        self.portfolio_value = 1.0

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step  = 0
        self.prev_weights  = np.ones(self.num_assets) / self.num_assets
        self.portfolio_value = 1.0
        return self._get_state(), {}

    def _get_state(self):
        current_date = self.dates[self.current_step]
        data = self.grouped.get_group(current_date)
        data = data.set_index('ticker').reindex(self.tickers)
        features = data[['return', 'volatility', 'momentum', 'sma_ratio', 'vix_z']].values
        features = np.nan_to_num(features, nan=0.0)
        return features.flatten().astype(np.float32)

    def step(self, action):
        # Normalize weights
        weights = np.clip(action, 1e-6, None)
        weights = weights / np.sum(weights)

        # Step forward first (lookahead bias fix)
        self.current_step += 1
        terminated = self.current_step >= len(self.dates) - 2
        truncated  = False

        next_date = self.dates[self.current_step] if not terminated else self.dates[-2]
        data = self.grouped.get_group(next_date)
        data = data.set_index('ticker').reindex(self.tickers)

        returns = np.nan_to_num(data['return'].values, nan=0.0)

        # --- Richer reward (from zip) ---
        gross_profit = np.dot(weights, returns)

        # Downside penalty: 20% extra pain on losses
        downside_penalty = 0.2 * np.minimum(0, gross_profit)

        # Transaction cost
        transaction_cost = 0.001 * np.sum(np.abs(weights - self.prev_weights))

        # Diversification penalty (HHI) — discourages concentration
        diversification_penalty = 0.01 * np.sum(weights ** 2)

        reward = gross_profit + downside_penalty - transaction_cost - diversification_penalty

        # Update portfolio value using gross return (before penalties)
        net_return = gross_profit - transaction_cost
        self.portfolio_value *= (1 + net_return)

        self.prev_weights = weights

        next_state = self._get_state() if not terminated else np.zeros(
            self.observation_space.shape, dtype=np.float32
        )

        info = {
            "portfolio_value":  float(self.portfolio_value),
            "portfolio_return": float(gross_profit),
            "cost":             float(transaction_cost),
        }

        return next_state, float(reward), terminated, truncated, info
