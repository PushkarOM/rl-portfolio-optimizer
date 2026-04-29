from django.urls import path
from .views import train_model, list_runs

urlpatterns = [
    path("start/", train_model),
    path("runs/", list_runs),
]
