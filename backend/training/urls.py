from django.urls import path
from .views import train_model, list_runs, run_detail

urlpatterns = [
    path("start/",          train_model),
    path("runs/",           list_runs),
    path("runs/<int:pk>/",  run_detail),
]
