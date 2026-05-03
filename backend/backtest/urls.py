from django.urls import path
from .views import run_backtest, backtest_status
 
urlpatterns = [
    path("run/",             run_backtest,    name="run_backtest"),
    path("status/<int:pk>/", backtest_status, name="backtest_status"),
]