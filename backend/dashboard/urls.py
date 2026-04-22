from django.urls import path
from . import views

urlpatterns = [
    path("summary/", views.summary),
    path("allocation/", views.allocation),
    path("performance/", views.performance),
    path("recommendation/", views.recommendation),
]
