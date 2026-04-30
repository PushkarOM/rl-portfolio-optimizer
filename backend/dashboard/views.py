# dashboard/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone

from data.models import Dataset
from models_app.models import ModelConfig
from experiments.models import Experiment
from training.models import TrainingRun


@api_view(["GET"])
def dashboard_summary(request):

    #  counts 
    total_datasets    = Dataset.objects.filter(status="ready").count()
    total_models      = ModelConfig.objects.count()
    total_experiments = Experiment.objects.count()
    total_runs        = TrainingRun.objects.count()
    completed_runs    = TrainingRun.objects.filter(status="completed").count()

    #  best run — highest final_portfolio_value 
    best_run_data = None
    best_run = (
        TrainingRun.objects
        .filter(status="completed", result_metrics__isnull=False)
        .select_related("experiment", "model_config")
        .order_by("-created_at")
    )

    # Find best by final_portfolio_value stored in result_metrics JSON
    best = None
    best_value = None
    for run in best_run:
        val = run.result_metrics.get("final_portfolio_value") if run.result_metrics else None
        if val is not None:
            if best_value is None or val > best_value:
                best_value = val
                best = run

    if best:
        metrics = best.result_metrics or {}
        best_run_data = {
            "id":                     best.id,
            "experiment_name":        best.experiment.name,
            "model_name":             best.model_config.name,
            "model_algorithm":        best.model_config.algorithm,
            "final_portfolio_value":  metrics.get("final_portfolio_value"),
            "portfolio_curve":        metrics.get("portfolio_curve", []),
            "completed_at":           best.completed_at,
        }

    #  recent runs — last 5 
    recent_qs = (
        TrainingRun.objects
        .select_related("experiment", "model_config")
        .order_by("-created_at")[:5]
    )

    recent_runs = []
    for r in recent_qs:
        metrics = r.result_metrics or {}
        recent_runs.append({
            "id":                    r.id,
            "status":                r.status,
            "progress":              r.progress or 0,
            "experiment_name":       r.experiment.name,
            "model_name":            r.model_config.name,
            "model_algorithm":       r.model_config.algorithm,
            "final_portfolio_value": metrics.get("final_portfolio_value"),
            "avg_reward":            metrics.get("avg_reward"),
            "started_at":            r.started_at,
            "completed_at":          r.completed_at,
            "created_at":            r.created_at,
        })

    #  activity feed — mixed events sorted by time 
    events = []

    for ds in Dataset.objects.order_by("-created_at")[:5]:
        events.append({
            "type":      "dataset",
            "label":     f"Dataset \"{ds.name}\" created",
            "status":    ds.status,
            "timestamp": ds.created_at,
        })

    for exp in Experiment.objects.order_by("-created_at")[:5]:
        events.append({
            "type":      "experiment",
            "label":     f"Experiment \"{exp.name}\" created",
            "timestamp": exp.created_at,
        })

    for run in TrainingRun.objects.order_by("-created_at")[:8]:
        if run.status == "completed":
            label = f"Run #{run.id} completed"
        elif run.status == "failed":
            label = f"Run #{run.id} failed"
        elif run.status == "running":
            label = f"Run #{run.id} is running"
        else:
            label = f"Run #{run.id} queued"
        events.append({
            "type":      "run",
            "label":     label,
            "status":    run.status,
            "run_id":    run.id,
            "timestamp": run.created_at,
        })

    # Sort all events newest first, take top 10
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    activity_feed = events[:10]

    return Response({
        "total_datasets":    total_datasets,
        "total_models":      total_models,
        "total_experiments": total_experiments,
        "total_runs":        total_runs,
        "completed_runs":    completed_runs,
        "best_run":          best_run_data,
        "recent_runs":       recent_runs,
        "activity_feed":     activity_feed,
    })
