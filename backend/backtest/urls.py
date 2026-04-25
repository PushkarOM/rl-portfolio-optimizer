from django.urls import path
from .views import backtest_result

urlpatterns = [
    path("result/", backtest_result),
]
