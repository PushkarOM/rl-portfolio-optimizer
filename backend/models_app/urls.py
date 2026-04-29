from django.urls import path
from .views import create_model, list_models

urlpatterns = [
    path("create/", create_model),
    path("list/", list_models),
]
