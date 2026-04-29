from django.urls import path
from .views import create_experiment, list_experiments, experiment_detail, delete_experiment

urlpatterns = [
    path("", list_experiments),
    path("create/", create_experiment),
    path("<int:pk>/", experiment_detail),
    path("<int:pk>/delete/", delete_experiment),  
]