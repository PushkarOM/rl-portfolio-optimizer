import io
import math
import logging
import numpy as np
import pandas as pd

from django.utils import timezone
from ..models import TrainingRun
from rl_envs.portfolio_env import PortfolioEnv

from stable_baselines3 import PPO, DQN, A2C, SAC
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.callbacks import EvalCallback, BaseCallback

#  Algorithm registry 
ALGO_MAP = {
    "ppo": PPO,
    "dqn": DQN,
    "a2c": A2C,
    "sac": SAC,
}

#  Hyperparameter keys each algorithm actually accepts 
# Prevents passing PPO-only keys (like n_epochs) into DQN etc.
ALGO_PARAM_KEYS = {
    "ppo": {"learning_rate", "n_steps", "batch_size", "n_epochs",
            "gamma", "gae_lambda", "clip_range", "ent_coef", "max_grad_norm"},
    "dqn": {"learning_rate", "batch_size", "gamma", "exploration_fraction",
            "exploration_final_eps", "target_update_interval", "learning_starts"},
    "a2c": {"learning_rate", "n_steps", "gamma", "gae_lambda",
            "ent_coef", "vf_coef", "max_grad_norm"},
    "sac": {"learning_rate", "batch_size", "gamma", "tau",
            "ent_coef", "learning_starts", "train_freq"},
}

#  Metrics utils (from zip's utils.py) 
def compute_returns(portfolio_values):
    values = np.array(portfolio_values)
    return np.diff(values) / (values[:-1] + 1e-8)

def sharpe_ratio(returns):
    return float(np.mean(returns) / (np.std(returns) + 1e-8))

def max_drawdown(portfolio_values):
    values = np.array(portfolio_values)
    peak = np.maximum.accumulate(values)
    drawdown = (values - peak) / (peak + 1e-8)
    return float(drawdown.min())

def volatility(returns):
    return float(np.std(returns))

def sanitize_for_json(lst):
    return [
        0.0 if (v is None or math.isnan(v) or math.isinf(v)) else float(v)
        for v in lst
    ]

#  Log capture callback 
class LogCaptureCallback(BaseCallback):
    """
    Captures SB3 training logs at each rollout and writes them to the DB.
    Also updates run.progress during training (not just eval).
    """
    def __init__(self, run, total_timesteps, log_buffer, progress_interval=1000):
        super().__init__(verbose=0)
        self.run               = run
        self.total_timesteps   = total_timesteps
        self.log_buffer        = log_buffer   # shared list we append to
        self.progress_interval = progress_interval
        self._last_saved_step  = 0

    def _on_step(self) -> bool:
        step = self.num_timesteps

        # Throttle DB writes to every progress_interval steps
        if step - self._last_saved_step >= self.progress_interval:
            progress = min((step / self.total_timesteps) * 50, 50)  # training = first 50%
            self.run.progress = progress
            self.run.save(update_fields=["progress"])
            self._last_saved_step = step

        return True  # returning False would stop training

    def _on_rollout_end(self):
        # Capture any logger output SB3 has buffered
        if hasattr(self.model, "logger") and self.model.logger:
            try:
                output = self.model.logger.output_formats
                for fmt in output:
                    if hasattr(fmt, "writer"):
                        # TensorBoard writer — skip
                        continue
                    if hasattr(fmt, "file"):
                        content = fmt.file.getvalue() if hasattr(fmt.file, "getvalue") else ""
                        if content:
                            self.log_buffer.append(content)
            except Exception:
                pass

#  Main training function 
def start_training(run_id):

    run = TrainingRun.objects.select_related(
        "experiment__dataset", "model_config"
    ).get(id=run_id)

    try:
        run.status     = "running"
        run.started_at = timezone.now()
        run.save()

        model_config = run.model_config
        algorithm    = model_config.algorithm.lower()
        params       = model_config.parameters or {}

        if algorithm not in ALGO_MAP:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

        AlgoClass  = ALGO_MAP[algorithm]
        valid_keys = ALGO_PARAM_KEYS[algorithm]

        # Filter params to only what this algorithm accepts
        algo_kwargs = {k: v for k, v in params.items() if k in valid_keys}

        #  Load dataset & split 80/10/10 by date (from zip) 
        dataset = run.experiment.dataset
        df = pd.read_parquet(dataset.file_path)
        df = df.dropna()

        df['date'] = pd.to_datetime(df['date'])
        sort_dates   = sorted(df['date'].unique())
        train_cutoff = int(len(sort_dates) * 0.8)
        dev_cutoff   = int(len(sort_dates) * 0.9)

        train_dates = sort_dates[:train_cutoff]
        dev_dates   = sort_dates[train_cutoff:dev_cutoff]
        test_dates  = sort_dates[dev_cutoff:]

        train_df = df[df['date'].isin(train_dates)]
        dev_df   = df[df['date'].isin(dev_dates)]
        test_df  = df[df['date'].isin(test_dates)]

        # Find tickers present in ALL three splits
        train_tickers = set(train_df['ticker'].unique())
        dev_tickers   = set(dev_df['ticker'].unique())
        test_tickers  = set(test_df['ticker'].unique())
        common_tickers = train_tickers & dev_tickers & test_tickers

        # Filter all splits to common tickers only
        train_df = train_df[train_df['ticker'].isin(common_tickers)]
        dev_df   = dev_df[dev_df['ticker'].isin(common_tickers)]
        test_df  = test_df[test_df['ticker'].isin(common_tickers)]

        
        # Log the split info
        log_lines = [
            f"Algorithm: {algorithm.upper()}",
            f"Train: {len(train_dates)} days | Dev: {len(dev_dates)} days | Test: {len(test_dates)} days",
            f"Hyperparameters: {algo_kwargs}",
            "---",
        ]

        log_lines.append(
            f"Common tickers across all splits: {len(common_tickers)} "
            f"(dropped {len(train_tickers) - len(common_tickers)} tickers with incomplete data)"
        )
        log_lines.append(
            f"Train: {len(train_dates)} days | Dev: {len(dev_dates)} days | "
            f"Test: {len(test_dates)} days"
        )

        #  Environments 
        train_env = DummyVecEnv([lambda: PortfolioEnv(train_df)])
        dev_env   = DummyVecEnv([lambda: PortfolioEnv(dev_df)])

        #  Total timesteps 
        total_timesteps = len(train_dates) * 100
        progress_interval = max(200_000, total_timesteps // 100)

        #  Build model with filtered hyperparams 
        log_buffer = []
        model = AlgoClass(
            policy="MlpPolicy",
            env=train_env,
            verbose=1,
            device="cpu",
            **algo_kwargs,
        )

        #  EvalCallback — saves best model on dev set 
        import os, tempfile
        best_model_dir = tempfile.mkdtemp()

        eval_callback = EvalCallback(
            dev_env,
            best_model_save_path=best_model_dir,
            eval_freq=max(500, total_timesteps // 20),  # eval ~20 times
            deterministic=True,
            render=False,
            verbose=1,
        )

        log_capture = LogCaptureCallback(
            run=run,
            total_timesteps=total_timesteps,
            log_buffer=log_buffer,
            progress_interval=progress_interval,
        )

        #  Train 
        # Capture stdout from SB3 verbose=1
        import sys
        stdout_capture = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = stdout_capture

        try:
            model.learn(
                total_timesteps=total_timesteps,
                callback=[eval_callback, log_capture],
            )
        finally:
            sys.stdout = old_stdout
            captured = stdout_capture.getvalue()
            if captured:
                log_lines.append(captured)

        # Load best model from dev eval if it exists
        best_model_path = os.path.join(best_model_dir, "best_model.zip")
        if os.path.exists(best_model_path):
            model = AlgoClass.load(best_model_path, env=train_env)
            log_lines.append("Loaded best model from dev evaluation.")
        else:
            log_lines.append("No best model saved — using final model.")

        #  Eval on TEST set 
        test_env_raw  = PortfolioEnv(test_df)
        state, _      = test_env_raw.reset()

        rewards          = []
        portfolio_values = [1.0]

        total_eval_steps = len(test_env_raw.dates)
        step = 0

        while True:
            action, _ = model.predict(state, deterministic=True)

            action = np.abs(action)
            total  = action.sum()
            if total < 1e-8:
                action = np.ones(test_env_raw.num_assets) / test_env_raw.num_assets
            else:
                action = action / total

            next_state, reward, terminated, truncated, info = test_env_raw.step(action)

            rewards.append(float(reward))
            portfolio_values.append(float(info["portfolio_value"]))

            step += 1

            # Eval = second 50% of progress
            progress = 50 + (step / total_eval_steps) * 50
            if step % max(1, total_eval_steps // 50) == 0:
                run.progress = min(progress, 99)
                run.save(update_fields=["progress"])

            if terminated or truncated:
                break

            state = next_state

        #  Baseline: equal-weight on test set 
        baseline_env    = PortfolioEnv(test_df)
        baseline_state, _ = baseline_env.reset()
        baseline_values = [1.0]

        while True:
            equal_action = np.ones(baseline_env.num_assets) / baseline_env.num_assets
            b_next, _, b_term, b_trunc, b_info = baseline_env.step(equal_action)
            baseline_values.append(float(b_info["portfolio_value"]))
            if b_term or b_trunc:
                break
            baseline_state = b_next

        #  Compute metrics 
        rl_returns       = compute_returns(portfolio_values)
        baseline_returns = compute_returns(baseline_values)

        metrics = {
            "reward_curve":            sanitize_for_json(rewards),
            "portfolio_curve":         sanitize_for_json(portfolio_values),
            "baseline_curve":          sanitize_for_json(baseline_values),
            "final_portfolio_value":   portfolio_values[-1],
            "final_baseline_value":    baseline_values[-1],
            "total_return_pct":        (portfolio_values[-1] - 1.0) * 100,
            "baseline_return_pct":     (baseline_values[-1] - 1.0) * 100,
            "sharpe_ratio":            sharpe_ratio(rl_returns),
            "max_drawdown":            max_drawdown(portfolio_values),
            "volatility":              volatility(rl_returns),
            "avg_reward":              float(np.mean(rewards)),
            "total_steps":             step,
            "total_timesteps_trained": total_timesteps,
            "train_days":              len(train_dates),
            "dev_days":                len(dev_dates),
            "test_days":               len(test_dates),
        }

        #  Save logs 
        log_lines.append(f"\n--- Final Metrics ---")
        log_lines.append(f"Final Portfolio Value : {portfolio_values[-1]:.4f}")
        log_lines.append(f"Total Return         : {metrics['total_return_pct']:.2f}%")
        log_lines.append(f"Sharpe Ratio         : {metrics['sharpe_ratio']:.4f}")
        log_lines.append(f"Max Drawdown         : {metrics['max_drawdown']:.4f}")
        log_lines.append(f"Volatility           : {metrics['volatility']:.4f}")
        log_lines.append(f"Avg Reward           : {metrics['avg_reward']:.4f}")
        log_lines.append(f"Baseline Return      : {metrics['baseline_return_pct']:.2f}%")

        run.logs           = "\n".join(log_lines)
        run.result_metrics = metrics
        run.progress       = 100
        run.status         = "completed"
        run.completed_at   = timezone.now()
        run.save()

    except Exception as e:
        run.status        = "failed"
        run.error_message = str(e)
        run.completed_at  = timezone.now()
        run.save()
        raise e
