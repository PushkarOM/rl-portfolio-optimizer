from django.urls import path
from .views import models_list

urlpatterns = [
    path("list/", models_list),
]
