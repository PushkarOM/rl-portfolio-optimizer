from django.db import models


class Experiment(models.Model):

    name = models.CharField(max_length=255)

    dataset = models.ForeignKey(
        "data.Dataset",
        on_delete=models.CASCADE,
        related_name="experiments"
    )

    model_config = models.ForeignKey(
        "models_app.ModelConfig",
        on_delete=models.CASCADE,
        related_name="experiments",
        null=True,
        blank=True
    )

    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
