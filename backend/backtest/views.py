from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.backtest_service import run_backtest


@api_view(["GET"])
def backtest_result(request):

    data = run_backtest()

    return Response(data)
