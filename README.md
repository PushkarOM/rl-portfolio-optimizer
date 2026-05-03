# RL Portfolio Optimizer

A full-stack web application for training, evaluating, and comparing Reinforcement Learning agents on portfolio trading tasks. Build datasets from real market data, configure RL algorithms, run training experiments, and analyze results — all from a clean UI.

> **Stack:** Django · Celery · Redis · React · shadcn/ui · Tailwind · Docker Compose

---

## Screenshots

> _Add screenshots here once deployed_

---

## Features

- **Dataset Builder** — fetch historical OHLCV data for stocks, crypto, or forex with a ticker tag input and preset picker (Dow 30, S&P 500 Top 20, Crypto 20)
- **Model Configuration** — configure PPO, DQN, A2C, or SAC with per-algorithm hyperparameter grids and glossary tooltips
- **Experiments** — link a dataset + model config into a named experiment
- **Training** — launch Celery-backed training jobs with live progress polling, metrics snapshots, and error reporting
- **Results** — 8 stat cards, 5 interactive Recharts charts (portfolio curve, reward, drawdown, rolling Sharpe, reward distribution), run comparison overlay, CSV export, training logs, and model parameters
- **Dashboard** — summary stats, best run chart, recent runs, and activity feed

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React + Vite                   │
│         (shadcn/ui · Tailwind · Recharts)       │
└─────────────────────┬───────────────────────────┘
                      │ HTTP (REST)
┌─────────────────────▼───────────────────────────┐
│              Django REST Framework              │
│   /api/data/  /api/models/  /api/experiments/  │
│   /api/training/  /api/dashboard/              │
└────────────┬────────────────────┬───────────────┘
             │ enqueue task       │ read/write
┌────────────▼──────────┐  ┌─────▼───────────────┐
│    Celery Worker      │  │      SQLite DB       │
│  (training_service)   │  │   (PostgreSQL in     │
│                       │  │    production)       │
│  stable-baselines3    │  └─────────────────────-┘
│  Gymnasium env        │
└────────────┬──────────┘
             │
┌────────────▼──────────┐
│         Redis         │
│   (Celery broker)     │
└───────────────────────┘
```

---

## RL Environment

- **Observation space:** `Box(-inf, inf, (num_assets * 5,))` — features per ticker: return, volatility, momentum, SMA ratio, VIX-z
- **Action space:** `Box(0, 1, (num_assets,))` — continuous portfolio weights, normalised to sum to 1
- **Reward:** `gross_profit + downside_penalty(0.2) − transaction_cost(0.001) − diversification_penalty(HHI 0.01)`
- **Data split:** 80% train / 10% dev (EvalCallback) / 10% test (reported in Results)
- **Baseline:** equal-weight buy-and-hold on the same test set

---

## Local Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend dev without Docker)
- Python 3.10+ (for local backend dev without Docker)

### With Docker Compose (recommended)

```bash
git clone https://github.com/PushkarOM/rl-portfolio-optimizer.git
cd rl-portfolio-optimizer

cp .env.example .env        # fill in values (see Environment Variables below)

docker compose up --build
```

| Service   | URL                      |
|-----------|--------------------------|
| Frontend  | http://localhost:5173    |
| Backend   | http://localhost:8000    |
| Redis     | localhost:6379           |

### Without Docker

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
```

**Celery worker** (separate terminal):
```bash
cd backend
celery -A myproject worker --loglevel=info
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL (frontend) | `http://localhost:8000` |
| `DJANGO_SECRET_KEY` | Django secret key | `your-secret-key` |
| `CELERY_BROKER_URL` | Redis URL for Celery | `redis://localhost:6379/0` |
| `DEBUG` | Django debug mode | `True` |
| `ALLOWED_HOSTS` | Django allowed hosts | `localhost,127.0.0.1` |

---

## Project Structure

```
rl-portfolio-optimizer/
├── backend/
│   ├── data/                  # Dataset model, Celery fetch task, preview
│   ├── models_app/            # ModelConfig — algorithm + hyperparameters
│   ├── experiments/           # Experiment — links dataset + model config
│   ├── training/              # TrainingRun, train_model view, training_service
│   ├── rl_envs/               # Gymnasium PortfolioEnv
│   ├── dashboard/             # Summary endpoint
│   └── myproject/             # Django settings, URLs, Celery app
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios API clients per app
│   │   ├── components/        # Reusable: StatCard, ChartCard, GlossaryTip, etc.
│   │   ├── constants/         # tickerPresets (Dow30, S&P500, Crypto20)
│   │   ├── pages/             # Data, Models, Experiments, Training, Results, Dashboard
│   │   └── utils/             # exportCsv
│   └── public/
├── docker-compose.yml
└── README.md
```

---

## API Reference

### Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data/datasets/` | List all datasets |
| `POST` | `/api/data/create-dataset/` | Create + enqueue dataset build |
| `GET` | `/api/data/datasets/<pk>/` | Dataset detail |
| `DELETE` | `/api/data/datasets/<pk>/delete/` | Delete dataset + parquet file |
| `GET` | `/api/data/datasets/<pk>/preview/` | First 20 rows |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/models/list/` | List model configs |
| `POST` | `/api/models/create/` | Create model config |
| `GET` | `/api/models/<pk>/` | Model detail |
| `DELETE` | `/api/models/<pk>/delete/` | Delete model config |

### Experiments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/experiments/` | List experiments |
| `POST` | `/api/experiments/create/` | Create experiment |
| `GET` | `/api/experiments/<pk>/` | Experiment detail |
| `DELETE` | `/api/experiments/<pk>/delete/` | Delete experiment |

### Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/training/start/` | Start training run (rejects if active run exists) |
| `GET` | `/api/training/runs/` | List all runs |
| `GET` | `/api/training/runs/<pk>/` | Run detail + logs + metrics |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/summary/` | Counts, best run, recent runs, activity feed |

---

## Supported Algorithms

| Algorithm | Key Hyperparameters |
|-----------|-------------------|
| PPO | `learning_rate`, `n_steps`, `batch_size`, `n_epochs`, `gamma`, `gae_lambda`, `clip_range`, `ent_coef`, `max_grad_norm` |
| DQN | `learning_rate`, `batch_size`, `gamma`, `exploration_fraction`, `exploration_final_eps`, `target_update_interval`, `learning_starts` |
| A2C | `learning_rate`, `n_steps`, `gamma`, `gae_lambda`, `ent_coef`, `vf_coef`, `max_grad_norm` |
| SAC | `learning_rate`, `batch_size`, `gamma`, `tau`, `ent_coef`, `learning_starts`, `train_freq` |

---

## Result Metrics

After each training run, the following are computed on the **test set** (last 10% of dates):

| Metric | Description |
|--------|-------------|
| Final Portfolio Value | Portfolio multiplier vs 1.0 start |
| Total Return % | End-to-end return on test set |
| vs Baseline | Outperformance vs equal-weight buy-and-hold |
| Sharpe Ratio | Risk-adjusted return (RL vs baseline) |
| Max Drawdown | Worst peak-to-trough decline |
| Volatility | Std deviation of step returns |
| Win Rate | % of steps with positive reward |
| Avg Reward / Step | Mean reward across all test steps |

---

## Deployment

### Frontend → Vercel
```bash
# Set environment variable in Vercel dashboard:
VITE_BASE_API_URL=https://your-railway-backend-url.railway.app
```

### Backend → Railway
- Add a Redis plugin for Celery broker
- Mount a persistent disk volume at `/app/datasets` and `/app/models`
- Set `MEDIA_ROOT` in Django settings to the persistent disk path
- Deploy a second Railway service from the same repo as the Celery worker:
  ```bash
  celery -A myproject worker --loglevel=info
  ```

---

## Roadmap

- [ ] Backtest page (in Progress)
- [ ] WebSocket live training updates
- [ ] Model download from Results page
- [ ] Multi-asset weight visualisation
- [ ] Hyperparameter sweep / grid search

---

## License

MIT