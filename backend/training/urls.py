from django.urls import path
from .views import train_model

urlpatterns = [
    path("start/", train_model),
]