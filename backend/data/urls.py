from django.urls import path
from .views import create_dataset, list_datasets, dataset_detail

urlpatterns = [
    path("create-dataset/", create_dataset),
    path("datasets/", list_datasets),
    path("dataset/<int:pk>/", dataset_detail),
]