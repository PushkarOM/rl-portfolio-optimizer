from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import ModelConfig
from .serializers import ModelConfigSerializer


@api_view(["POST"])
def create_model(request):

    serializer = ModelConfigSerializer(data=request.data)

    if serializer.is_valid():
        model = serializer.save()
        return Response(ModelConfigSerializer(model).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def list_models(request):

    models = ModelConfig.objects.all().order_by("-created_at")

    serializer = ModelConfigSerializer(models, many=True)

    return Response(serializer.data)

