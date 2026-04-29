from rest_framework import serializers
from .models import ModelConfig

class ModelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelConfig
        fields = [
            "id", "name", "description", "algorithm",
            "parameters", "created_at"
        ]
        read_only_fields = ["created_at"]
