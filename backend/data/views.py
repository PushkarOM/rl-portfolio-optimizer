from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Dataset
from .serializers import DatasetSerializer

from .services.data_service import build_dataset


@api_view(["POST"])
def create_dataset(request):

    serializer = DatasetSerializer(data=request.data)

    if serializer.is_valid():
        dataset = serializer.save()

        # Build dataset 
        file_path = build_dataset(dataset)

        dataset.file_path = file_path
        dataset.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_datasets(request):

    datasets = Dataset.objects.all().order_by("-created_at")

    serializer = DatasetSerializer(datasets, many=True)

    return Response(serializer.data)


@api_view(["GET"])
def dataset_detail(request, pk):

    try:
        dataset = Dataset.objects.get(id=pk)
    except Dataset.DoesNotExist:
        return Response({"error": "Dataset not found"}, status=404)

    serializer = DatasetSerializer(dataset)

    return Response(serializer.data)

