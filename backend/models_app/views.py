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
        return Response(ModelConfigSerializer(model).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_models(request):
    models = ModelConfig.objects.all().order_by("-created_at")
    return Response(ModelConfigSerializer(models, many=True).data)


@api_view(["GET"])
def model_detail(request, pk):
    try:
        model = ModelConfig.objects.get(id=pk)
    except ModelConfig.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    return Response(ModelConfigSerializer(model).data)


@api_view(["DELETE"])
def delete_model(request, pk):
    try:
        model = ModelConfig.objects.get(id=pk)
    except ModelConfig.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    model.delete()
    return Response({"message": "Deleted"}, status=204)
