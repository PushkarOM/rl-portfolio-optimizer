import gymnasium as gym
import numpy as np


class PortfolioEnv(gym.Env):
    def __init__(self, df):
        super().__init__()

        self.df = df.copy()

        # Precompute for performance
        self.dates = sorted(self.df['date'].unique())
        self.tickers = sorted(self.df['ticker'].unique())
        self.grouped = self.df.groupby('date')

        self.num_assets = len(self.tickers)
        self.num_features = 5  # return, volatility, momentum, sma_ratio, vix_z

        # Action: portfolio weights
        self.action_space = gym.spaces.Box(
            low=0,
            high=1,
            shape=(self.num_assets,),
            dtype=np.float32
        )

        # Observation: flattened features
        self.observation_space = gym.spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(self.num_assets * self.num_features,),
            dtype=np.float32
        )

        self.current_step = None
        self.prev_weights = np.ones(self.num_assets) / self.num_assets
        self.portfolio_value = 1.0

    # RESET
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)

        self.current_step = 0
        self.prev_weights = np.ones(self.num_assets) / self.num_assets
        self.portfolio_value = 1.0

        return self._get_state(), {}

    # STATE — uses reindex + nan_to_num to handle missing tickers safely
    def _get_state(self):
        current_date = self.dates[self.current_step]

        data = self.grouped.get_group(current_date)
        data = data.set_index('ticker').reindex(self.tickers)

        features = data[['return', 'volatility', 'momentum', 'sma_ratio', 'vix_z']].values
        features = np.nan_to_num(features, nan=0.0)

        return features.flatten().astype(np.float32)

    # STEP
    def step(self, action):

        # --- Normalize weights safely ---
        weights = np.clip(action, 1e-6, None)
        weights = weights / np.sum(weights)

        # --- Step forward FIRST (lookahead bias fix) ---
        self.current_step += 1

        # --- Terminate one step before the last date
        # so there's always a valid next-day return to read ---
        terminated = self.current_step >= len(self.dates) - 2
        truncated = False

        # --- Get NEXT day's returns (what actually happens after the action) ---
        next_date = self.dates[self.current_step] if not terminated else self.dates[-2]

        data = self.grouped.get_group(next_date)
        data = data.set_index('ticker').reindex(self.tickers)

        returns = data['return'].values
        returns = np.nan_to_num(returns, nan=0.0)

        # --- Portfolio return ---
        portfolio_return = np.dot(weights, returns)

        # --- Transaction cost (0.1% per unit of rebalancing) ---
        cost = 0.001 * np.sum(np.abs(weights - self.prev_weights))

        net_return = portfolio_return - cost

        # --- Reward (log return) ---
        reward = np.log1p(net_return)

        # --- Update portfolio value ---
        self.portfolio_value *= (1 + net_return)

        # --- Update weights ---
        self.prev_weights = weights

        # --- Next state ---
        if not terminated:
            next_state = self._get_state()
        else:
            next_state = np.zeros(self.observation_space.shape, dtype=np.float32)

        info = {
            "portfolio_value": float(self.portfolio_value),
            "portfolio_return": float(portfolio_return),
            "cost": float(cost)
        }

        return next_state, float(reward), terminated, truncated, info
