from django.urls import path
from .views import create_experiment, list_experiments, experiment_detail

urlpatterns = [
    path("create/", create_experiment),
    path("", list_experiments),
    path("<int:pk>/", experiment_detail),
]
