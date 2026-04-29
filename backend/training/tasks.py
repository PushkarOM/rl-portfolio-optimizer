from celery import shared_task
from .services.training_service import start_training


@shared_task
def run_training_task(run_id):
    start_training(run_id)
