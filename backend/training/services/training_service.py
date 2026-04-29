from django.utils import timezone
from ..models import TrainingRun

import pandas as pd
import numpy as np

from rl_envs.portfolio_env import PortfolioEnv
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv

import math

def sanitize_for_json(lst):
    return [0.0 if (v is None or math.isnan(v) or math.isinf(v)) else v for v in lst]

def start_training(run_id):

    run = TrainingRun.objects.get(id=run_id)

    try:
        run.status = "running"
        run.started_at = timezone.now()
        run.save()

        dataset = run.experiment.dataset

        # Load dataset — drop NaN warmup rows so PPO never sees NaN states
        df = pd.read_parquet(dataset.file_path)
        df = df.dropna()

        # --- Create environment ---
        env = DummyVecEnv([lambda: PortfolioEnv(df)])

        # --- PPO Agent ---
        model = PPO(
            policy="MlpPolicy",
            env=env,
            verbose=0,
            learning_rate=3e-4,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,        # encourages exploration, prevents policy collapsing early
            max_grad_norm=0.5
        )

        # --- Collect loop (eval, not training) ---
        # First train the model, then do one eval rollout to collect curves
        total_timesteps = len(PortfolioEnv(df).dates) * 10  # 10 episodes of training
        model.learn(total_timesteps=total_timesteps)

        # --- Eval rollout for metrics ---
        eval_env = PortfolioEnv(df)
        state, _ = eval_env.reset()

        rewards = []
        portfolio_values = []

        step = 0
        total_steps = len(eval_env.dates)
        progress_interval = max(1, total_steps // 100)  # write every ~1%

        while True:
            # PPO gives deterministic action during eval
            action, _ = model.predict(state, deterministic=True)

            # Normalize to valid portfolio weights (sum to 1)
            action = np.abs(action)
            total = action.sum()
            if total < 1e-8:
                action = np.ones(eval_env.num_assets) / eval_env.num_assets
            else:
                action = action / total

            next_state, reward, terminated, truncated, info = eval_env.step(action)

            rewards.append(float(reward))
            portfolio_values.append(float(info["portfolio_value"]))

            step += 1

            # Throttled DB progress update
            if step % progress_interval == 0:
                run.progress = (step / total_steps) * 100
                run.save(update_fields=["progress"])

            if terminated or truncated:
                break

            state = next_state

        # --- Save full results ---
        run.result_metrics = {
            "reward_curve": sanitize_for_json(rewards),
            "portfolio_curve": sanitize_for_json(portfolio_values),
            "final_portfolio_value": portfolio_values[-1],
            "total_steps": step,
            "total_timesteps_trained": total_timesteps,
        }

        run.progress = 100
        run.status = "completed"
        run.completed_at = timezone.now()
        run.save()

    except Exception as e:
        run.status = "failed"
        run.error_message = str(e)
        run.completed_at = timezone.now()
        run.save()
        raise e
