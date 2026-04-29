from django.db import models

class ModelConfig(models.Model):

    ALGORITHM_CHOICES = [
        ("ppo", "PPO"),
        ("dqn", "DQN"),
        ("a2c", "A2C"),
        ("sac", "SAC"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    algorithm = models.CharField(
        max_length=20,
        choices=ALGORITHM_CHOICES
    )

    parameters = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
