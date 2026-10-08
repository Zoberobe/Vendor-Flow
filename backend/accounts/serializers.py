from rest_framework import serializers

from .models import User


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
        ]
        read_only_fields = fields
