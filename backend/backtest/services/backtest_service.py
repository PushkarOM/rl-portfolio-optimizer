import os
import math
import numpy as np
import pandas as pd

from rl_envs.portfolio_env import PortfolioEnv
from stable_baselines3 import PPO, DQN, A2C, SAC

ALGO_MAP = {
    "ppo": PPO,
    "dqn": DQN,
    "a2c": A2C,
    "sac": SAC,
}

#  Helpers 

def sanitize(lst):
    return [
        0.0 if (v is None or math.isnan(v) or math.isinf(v)) else float(v)
        for v in lst
    ]

def compute_returns(values):
    v = np.array(values)
    return np.diff(v) / (v[:-1] + 1e-8)

def sharpe(returns):
    return float(np.mean(returns) / (np.std(returns) + 1e-8))

def max_dd(values):
    v = np.array(values)
    peak = np.maximum.accumulate(v)
    return float(((v - peak) / (peak + 1e-8)).min())

def vol(returns):
    return float(np.std(returns))


#  Main service function 

def run_backtest_for_run(run):
    """
    Loads the saved model for `run`, re-runs it on the held-out test set,
    computes metrics, and returns a result dict.

    Raises on any error — caller (view or Celery task) handles the exception.
    """

    #  Load dataset + rebuild test split 
    dataset = run.experiment.dataset
    df = pd.read_parquet(dataset.file_path)
    df = df.dropna()
    df["date"] = pd.to_datetime(df["date"])

    sort_dates = sorted(df["date"].unique())
    dev_cutoff = int(len(sort_dates) * 0.9)
    test_dates = sort_dates[dev_cutoff:]
    test_df    = df[df["date"].isin(test_dates)]

    # Keep only tickers present in the test set
    test_tickers = set(test_df["ticker"].unique())
    test_df = test_df[test_df["ticker"].isin(test_tickers)]

    #  Load saved model 
    algorithm = run.model_config.algorithm.lower()
    AlgoClass = ALGO_MAP.get(algorithm)
    if not AlgoClass:
        raise ValueError(f"Unknown algorithm: {algorithm}")

    model = AlgoClass.load(run.model_path)

    #  RL agent backtest 
    env = PortfolioEnv(test_df)
    state, _ = env.reset()

    portfolio_values = [1.0]
    rewards          = []
    dates_used       = [str(env.dates[0].date())]

    while True:
        action, _ = model.predict(state, deterministic=True)
        action = np.abs(action)
        total  = action.sum()
        action = action / total if total > 1e-8 else np.ones(env.num_assets) / env.num_assets

        next_state, reward, terminated, truncated, info = env.step(action)
        rewards.append(float(reward))
        portfolio_values.append(float(info["portfolio_value"]))

        step_idx = env.current_step
        if step_idx < len(env.dates):
            dates_used.append(str(env.dates[step_idx].date()))

        if terminated or truncated:
            break
        state = next_state

    #  Equal-weight baseline 
    b_env = PortfolioEnv(test_df)
    b_env.reset()
    baseline_values = [1.0]

    while True:
        eq = np.ones(b_env.num_assets) / b_env.num_assets
        _, _, b_term, b_trunc, b_info = b_env.step(eq)
        baseline_values.append(float(b_info["portfolio_value"]))
        if b_term or b_trunc:
            break

    #  Metrics 
    rl_ret = compute_returns(portfolio_values)
    b_ret  = compute_returns(baseline_values)

    return {
        "run_id":                run.id,
        "experiment_name":       run.experiment.name,
        "model_algorithm":       algorithm,
        "dataset_name":          dataset.name,
        "test_days":             len(test_dates),
        "portfolio_curve":       sanitize(portfolio_values),
        "baseline_curve":        sanitize(baseline_values),
        "reward_curve":          sanitize(rewards),
        "dates":                 dates_used,
        # RL metrics
        "final_value":           portfolio_values[-1],
        "total_return_pct":      (portfolio_values[-1] - 1.0) * 100,
        "sharpe_ratio":          sharpe(rl_ret),
        "max_drawdown":          max_dd(portfolio_values),
        "volatility":            vol(rl_ret),
        "win_rate":              float(np.mean(np.array(rewards) > 0)) * 100,
        # Baseline metrics
        "baseline_final_value":  baseline_values[-1],
        "baseline_return_pct":   (baseline_values[-1] - 1.0) * 100,
        "baseline_sharpe":       sharpe(b_ret),
        "baseline_max_drawdown": max_dd(baseline_values),
        "baseline_volatility":   vol(b_ret),
    }
