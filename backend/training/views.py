import os

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse

from .models import TrainingRun
from experiments.models import Experiment
from .tasks import run_training_task


@api_view(["POST"])
def train_model(request):
    experiment_id = request.data.get("experiment_id")

    if not experiment_id:
        return Response({"error": "experiment_id is required."}, status=400)

    try:
        experiment = Experiment.objects.select_related("model_config").get(id=experiment_id)
    except Experiment.DoesNotExist:
        return Response({"error": "Experiment not found."}, status=404)

    model_config = experiment.model_config

    if model_config is None:
        return Response({"error": "Experiment has no model config linked."}, status=400)

    active_run = TrainingRun.objects.filter(
        experiment=experiment,
        status__in=["pending", "running"],
    ).first()

    if active_run:
        return Response(
            {
                "error": "A run is already active for this experiment.",
                "run_id": active_run.id,
                "status": active_run.status,
            },
            status=400,
        )

    run = TrainingRun.objects.create(
        experiment=experiment,
        model_config=model_config,
        parameters={},
        status="pending",
    )

    run_training_task.delay(run.id)

    return Response({"run_id": run.id, "status": "queued"}, status=201)


@api_view(["GET"])
def list_runs(request):
    runs = (
        TrainingRun.objects
        .select_related("experiment", "experiment__dataset", "model_config")
        .order_by("-created_at")
    )

    data = []
    for r in runs:
        data.append({
            "id":              r.id,
            "status":          r.status,
            "progress":        r.progress or 0,
            "experiment_id":   r.experiment.id,
            "experiment_name": r.experiment.name,
            "model_name":      r.model_config.name,
            "model_algorithm": r.model_config.algorithm,
            "model_path":      r.model_path,
            "dataset_name":    r.experiment.dataset.name if r.experiment.dataset else None,
            "result_metrics":  r.result_metrics,
            "error_message":   r.error_message,
            "started_at":      r.started_at,
            "completed_at":    r.completed_at,
            "created_at":      r.created_at,
        })

    return Response(data)


@api_view(["GET"])
def run_detail(request, pk):
    try:
        run = (
            TrainingRun.objects
            .select_related("experiment", "experiment__dataset", "model_config")
            .get(id=pk)
        )
    except TrainingRun.DoesNotExist:
        return Response({"error": "Run not found"}, status=404)

    metrics = run.result_metrics or {}
    return Response({
        "id":               run.id,
        "status":           run.status,
        "progress":         run.progress or 0,
        "experiment_id":    run.experiment.id,
        "experiment_name":  run.experiment.name,
        "model_name":       run.model_config.name,
        "model_algorithm":  run.model_config.algorithm,
        "model_parameters": run.model_config.parameters,
        "model_path":       run.model_path,
        "dataset_name":     run.experiment.dataset.name,
        "result_metrics":   metrics,
        "logs":             run.logs,
        "model_path":       run.model_path,
        "error_message":    run.error_message,
        "started_at":       run.started_at,
        "completed_at":     run.completed_at,
        "created_at":       run.created_at,
    })

@api_view(["GET"])
def download_model(request, pk):
    try:
        run = TrainingRun.objects.get(id=pk)
    except TrainingRun.DoesNotExist:
        return Response({"error": "Run not found."}, status=404)
 
    if not run.model_path or not os.path.exists(run.model_path):
        return Response({"error": "Model file not found. Re-train to generate it."}, status=404)
 
    f = open(run.model_path, "rb")
    response = FileResponse(f, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="run_{pk}_{run.model_config.algorithm}.zip"'
    return response
