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
        return Response(ExperimentSerializer(experiment).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def list_experiments(request):

    experiments = Experiment.objects.select_related("dataset").all().order_by("-created_at")

    serializer = ExperimentSerializer(experiments, many=True)

    return Response(serializer.data)


@api_view(["GET"])
def experiment_detail(request, pk):

    try:
        experiment = Experiment.objects.select_related("dataset").get(id=pk)
    except Experiment.DoesNotExist:
        return Response({"error": "Experiment not found"}, status=404)

    serializer = ExperimentSerializer(experiment)

    return Response(serializer.data)
