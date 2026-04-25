from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.training_service import start_training


@api_view(["POST"])
def train_model(request):

    config = request.data

    result = start_training(config)

    return Response(result)