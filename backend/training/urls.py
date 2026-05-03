from django.urls import path
from .views import train_model, list_runs, run_detail, download_model

urlpatterns = [
    path("start/",          train_model),
    path("runs/",           list_runs),
    path("runs/<int:pk>/",  run_detail),
    path("runs/<int:pk>/download-model/", download_model, name="download_model"),
]
