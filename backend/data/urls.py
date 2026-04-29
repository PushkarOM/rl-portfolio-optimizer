from django.urls import path
from . import views

urlpatterns = [
    path("datasets/", views.list_datasets),
    path("create-dataset/", views.create_dataset),
    path("datasets/<int:pk>/", views.dataset_detail),
    path("datasets/<int:pk>/delete/", views.delete_dataset),
    path("datasets/<int:pk>/preview/", views.dataset_preview),
]
