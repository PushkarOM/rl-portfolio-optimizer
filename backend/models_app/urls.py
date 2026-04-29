from django.urls import path
from .views import create_model, list_models, model_detail, delete_model

urlpatterns = [
    path("create/", create_model),
    path("list/", list_models),
    path("<int:pk>/", model_detail),
    path("<int:pk>/delete/", delete_model),
]
