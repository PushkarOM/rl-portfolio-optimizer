import os

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import FileResponse

from training.models import TrainingRun
from .tasks import run_backtest_task


@api_view(["POST"])
def run_backtest(request):
    run_id = request.data.get("run_id")
    if not run_id:
        return Response({"error": "run_id is required."}, status=400)

    try:
        run = TrainingRun.objects.select_related(
            "experiment__dataset", "model_config"
        ).get(id=run_id)
    except TrainingRun.DoesNotExist:
        return Response({"error": "Run not found."}, status=404)

    if run.status != "completed":
        return Response({"error": "Run is not completed yet."}, status=400)

    if not run.model_path or not os.path.exists(run.model_path):
        return Response({"error": "Model file not found. Re-train to generate it."}, status=400)

    # Reject if a backtest is already running for this run
    if run.backtest_status == "running":
        return Response({"error": "Backtest already in progress."}, status=400)

    # Queue the Celery task
    run.backtest_status = "pending"
    run.save(update_fields=["backtest_status"])

    task = run_backtest_task.delay(run.id)

    return Response({
        "run_id":  run.id,
        "task_id": task.id,
        "status":  "queued",
    }, status=202)


@api_view(["GET"])
def backtest_status(request, pk):
    """
    Poll this to check if the backtest is done and get results.
    Frontend polls every 3s until status = completed or failed.
    """
    try:
        run = TrainingRun.objects.get(id=pk)
    except TrainingRun.DoesNotExist:
        return Response({"error": "Run not found."}, status=404)

    status = run.backtest_status or "idle"

    if status == "completed":
        metrics = run.result_metrics or {}
        return Response({
            "status": "completed",
            "result": metrics.get("backtest"),
        })

    if status == "failed":
        return Response({
            "status": "failed",
            "error":  getattr(run, "backtest_error", "Unknown error"),
        })

    return Response({"status": status})


@api_view(["GET"])
def download_model(request, pk):
    try:
        run = TrainingRun.objects.get(id=pk)
    except TrainingRun.DoesNotExist:
        return Response({"error": "Run not found."}, status=404)

    if not run.model_path or not os.path.exists(run.model_path):
        return Response({"error": "Model file not found."}, status=404)

    f = open(run.model_path, "rb")
    response = FileResponse(f, content_type="application/zip")
    response["Content-Disposition"] = (
        f'attachment; filename="run_{pk}_{run.model_config.algorithm}.zip"'
    )
    return response
