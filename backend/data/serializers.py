# serializers.py
from rest_framework import serializers
from .models import Dataset

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = [
            "id", "name", "assets", "market", "frequency",
            "start_date", "end_date", "status", "error_message",
            "file_path", "created_at"
        ]
        read_only_fields = ["status", "error_message", "file_path", "created_at"]
        