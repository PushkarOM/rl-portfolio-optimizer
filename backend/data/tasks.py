# data/tasks.py
from celery import shared_task
from .models import Dataset
from .services.data_service import build_dataset

@shared_task
def build_dataset_task(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)

    try:
        dataset.status = "processing"
        dataset.save()

        file_path = build_dataset(dataset)

        dataset.file_path = file_path
        dataset.status = "ready"
        dataset.save()

    except Exception as e:
        dataset.status = "failed"
        dataset.error_message = str(e)
        dataset.save()
        raise e
