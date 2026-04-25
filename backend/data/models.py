from django.db import models


class Dataset(models.Model):

    MARKET_CHOICES = [
        ("stocks", "Stocks"),
        ("crypto", "Crypto"),
        ("forex", "Forex"),
    ]

    FREQUENCY_CHOICES = [
        ("1d", "Daily"),
        ("1h", "Hourly"),
        ("5m", "5 Minutes"),
    ]

    name = models.CharField(max_length=255)

    assets = models.JSONField()

    market = models.CharField(
        max_length=20,
        choices=MARKET_CHOICES
    )

    frequency = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES
    )

    start_date = models.DateField()
    end_date = models.DateField()

    data_source = models.CharField(
        max_length=50,
        default="yfinance"
    )

    file_path = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name