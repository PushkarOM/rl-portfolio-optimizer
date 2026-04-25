from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.model_service import get_models_list


@api_view(["GET"])
def models_list(request):

    models = get_models_list()

    return Response(models)