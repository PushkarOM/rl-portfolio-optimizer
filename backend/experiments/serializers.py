from rest_framework import serializers
from .models import Experiment


class ExperimentSerializer(serializers.ModelSerializer):

    # Nested read fields — show names/details instead of raw IDs
    dataset_name = serializers.CharField(source="dataset.name", read_only=True)
    dataset_market = serializers.CharField(source="dataset.market", read_only=True)
    dataset_frequency = serializers.CharField(source="dataset.frequency", read_only=True)
    dataset_assets = serializers.JSONField(source="dataset.assets", read_only=True)

    model_name = serializers.CharField(source="model_config.name", read_only=True)
    model_algorithm = serializers.CharField(source="model_config.algorithm", read_only=True)

    # Write fields — accept IDs on create
    dataset = serializers.PrimaryKeyRelatedField(
        queryset=__import__("data.models", fromlist=["Dataset"]).Dataset.objects.all()
    )
    model_config = serializers.PrimaryKeyRelatedField(
        queryset=__import__("models_app.models", fromlist=["ModelConfig"]).ModelConfig.objects.all(),
        allow_null=True,
        required=False
    )

    class Meta:
        model = Experiment
        fields = [
            "id",
            "name",
            "description",
            "dataset",
            "dataset_name",
            "dataset_market",
            "dataset_frequency",
            "dataset_assets",
            "model_config",
            "model_name",
            "model_algorithm",
            "created_at",
        ]
