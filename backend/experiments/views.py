from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Experiment
from .serializers import ExperimentSerializer


@api_view(["POST"])
def create_experiment(request):

    serializer = ExperimentSerializer(data=request.data)

    if serializer.is_valid():
        experiment = serializer.save()
        return Response(
            ExperimentSerializer(experiment).data,
            status=status.HTTP_201_CREATED  # Fix: was returning 200
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def list_experiments(request):

    experiments = (
        Experiment.objects
        .select_related("dataset", "model_config")  # Fix: added model_config
        .order_by("-created_at")
    )

    serializer = ExperimentSerializer(experiments, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def experiment_detail(request, pk):

    try:
        experiment = (
            Experiment.objects
            .select_related("dataset", "model_config")
            .get(id=pk)
        )
    except Experiment.DoesNotExist:
        return Response({"error": "Experiment not found"}, status=404)

    serializer = ExperimentSerializer(experiment)
    return Response(serializer.data)


@api_view(["DELETE"])
def delete_experiment(request, pk):

    try:
        experiment = Experiment.objects.get(id=pk)
    except Experiment.DoesNotExist:
        return Response({"error": "Experiment not found"}, status=404)

    experiment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
