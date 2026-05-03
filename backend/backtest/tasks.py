from celery import shared_task
from django.utils import timezone

from training.models import TrainingRun
from .services.backtest_service import run_backtest_for_run


@shared_task(bind=True, max_retries=0)
def run_backtest_task(self, run_id):
    """
    Celery task that runs the backtest for a given TrainingRun.
    Stores the result back on the run under result_metrics["backtest"],
    and tracks status via run.backtest_status.
    """
    try:
        run = TrainingRun.objects.select_related(
            "experiment__dataset", "model_config"
        ).get(id=run_id)
    except TrainingRun.DoesNotExist:
        return {"error": f"Run {run_id} not found."}

    # Mark as running
    run.backtest_status = "running"
    run.save(update_fields=["backtest_status"])

    try:
        result = run_backtest_for_run(run)

        # Store backtest result inside result_metrics under a "backtest" key
        # so it doesn't overwrite the original training metrics
        metrics = run.result_metrics or {}
        metrics["backtest"] = result
        run.result_metrics   = metrics
        run.backtest_status  = "completed"
        run.save(update_fields=["result_metrics", "backtest_status"])

        return result

    except Exception as e:
        run.backtest_status  = "failed"
        run.backtest_error   = str(e)
        run.save(update_fields=["backtest_status"])
        raise
