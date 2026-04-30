from rest_framework.decorators import api_view
from rest_framework.response import Response

from django.utils import timezone

from .services.training_service import start_training
from .models import TrainingRun

from experiments.models import Experiment
from models_app.models import ModelConfig

from .tasks import run_training_task

@api_view(["POST"])
def train_model(request):

    experiment_id = request.data.get("experiment_id")
    model_id = request.data.get("model_id")
    parameters = request.data.get("parameters", {})

    experiment = Experiment.objects.get(id=experiment_id)
    model_config = ModelConfig.objects.get(id=model_id)

    run = TrainingRun.objects.create(
        experiment=experiment,
        model_config=model_config,
        parameters=parameters,
        status="pending"
    )

    run_training_task.delay(run.id)

    return Response({
        "run_id": run.id,
        "status": "queued"
    })


@api_view(["GET"])
def list_runs(request):

    runs = TrainingRun.objects.select_related(
        "experiment", "model_config"
    ).all().order_by("-created_at")

    data = []

    for r in runs:
        data.append({
            "id": r.id,
            "status": r.status,
            "model_config": r.model_config.name,
            "experiment": r.experiment.name,
            "result_metrics": r.result_metrics,
        })

    return Response(data)

@api_view(["GET"])
def run_detail(request, pk):
    try:
        run = TrainingRun.objects.select_related(
            "experiment",
            "experiment__dataset",
            "model_config"
        ).get(id=pk)
    except TrainingRun.DoesNotExist:
        return Response({"error": "Run not found."}, status=404)

    return Response({
        "id":                   run.id,
        "status":               run.status,
        "progress":             run.progress or 0,
        "experiment_id":        run.experiment.id,
        "experiment_name":      run.experiment.name,
        "model_name":           run.model_config.name,
        "model_algorithm":      run.model_config.algorithm,
        "model_parameters":     run.model_config.parameters,
        "dataset_name":         run.experiment.dataset.name if run.experiment.dataset else None,
        "dataset_frequency":    run.experiment.dataset.frequency if run.experiment.dataset else None,
        "result_metrics":       run.result_metrics,
        "error_message":        run.error_message,
        "started_at":           run.started_at,
        "completed_at":         run.completed_at,
        "created_at":           run.created_at,
    })
