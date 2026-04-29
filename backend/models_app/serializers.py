from rest_framework import serializers
from .models import ModelConfig


class ModelConfigSerializer(serializers.ModelSerializer):

    class Meta:
        model = ModelConfig
        fields = "__all__"
