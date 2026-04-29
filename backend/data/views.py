# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Dataset
from .serializers import DatasetSerializer
from .tasks import build_dataset_task

import numpy as np

@api_view(["POST"])
def create_dataset(request):
    serializer = DatasetSerializer(data=request.data)

    if serializer.is_valid():
        dataset = serializer.save(status="pending")

        # Kick off async — no longer blocks the request
        build_dataset_task.delay(dataset.id)

        return Response(DatasetSerializer(dataset).data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_datasets(request):
    datasets = Dataset.objects.all().order_by("-created_at")
    return Response(DatasetSerializer(datasets, many=True).data)


@api_view(["GET"])
def dataset_detail(request, pk):
    try:
        dataset = Dataset.objects.get(id=pk)
    except Dataset.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    return Response(DatasetSerializer(dataset).data)


@api_view(["DELETE"])
def delete_dataset(request, pk):
    try:
        dataset = Dataset.objects.get(id=pk)
    except Dataset.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # Delete parquet file if it exists
    if dataset.file_path:
        import os
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)

    dataset.delete()
    return Response({"message": "Deleted"}, status=204)


@api_view(["GET"])
def dataset_preview(request, pk):
    try:
        dataset = Dataset.objects.get(id=pk)
    except Dataset.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if dataset.status != "ready":
        return Response({"error": "Dataset not ready yet"}, status=400)

    import pandas as pd
    df = pd.read_parquet(dataset.file_path)

    preview = df.head(20).round(6)
    preview["date"] = preview["date"].astype(str)
    preview = preview.replace({np.nan: None, np.inf: None, -np.inf: None})

    return Response({
        "columns": list(preview.columns),
        "rows": preview.values.tolist(),
        "total_rows": len(df),
        "tickers": list(df["ticker"].unique()),
    })
