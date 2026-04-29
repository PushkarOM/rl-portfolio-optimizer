from django.db import models


class TrainingRun(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    experiment = models.ForeignKey(
        "experiments.Experiment",
        on_delete=models.CASCADE,
        related_name="runs"
    )

    model_config = models.ForeignKey(
        "models_app.ModelConfig",
        on_delete=models.CASCADE
    )

    parameters = models.JSONField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    result_metrics = models.JSONField(blank=True, null=True)

    model_path = models.CharField(max_length=255, blank=True, null=True)

    logs = models.TextField(blank=True, null=True)

    error_message = models.TextField(blank=True, null=True)

    progress = models.FloatField(default=0.0)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

