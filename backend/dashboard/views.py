from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import data_service, model_service


@api_view(["GET"])
def summary(request):
    data = data_service.get_portfolio_summary()
    return Response(data)


@api_view(["GET"])
def allocation(request):
    data = data_service.get_allocation()
    return Response(data)


@api_view(["GET"])
def performance(request):
    data = data_service.get_performance()
    return Response(data)


@api_view(["GET"])
def recommendation(request):
    data = model_service.get_recommendation()
    return Response(data)
