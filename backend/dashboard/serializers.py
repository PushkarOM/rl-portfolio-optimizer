from rest_framework import serializers

class DashboardSummarySerializer(serializers.Serializer):
    portfolio_value = serializers.FloatField()
    total_return = serializers.FloatField()
    sharpe_ratio = serializers.FloatField()
    max_drawdown = serializers.FloatField()
    volatility = serializers.FloatField()
