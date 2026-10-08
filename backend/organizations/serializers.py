from rest_framework import serializers

from .models import Membership


class UserOrganizationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(
        source="organization.id",
        read_only=True,
    )

    name = serializers.CharField(
        source="organization.name",
        read_only=True,
    )

    slug = serializers.CharField(
        source="organization.slug",
        read_only=True,
    )

    class Meta:
        model = Membership
        fields = [
            "id",
            "name",
            "slug",
            "role",
        ]

class MembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True,
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = Membership
        fields = [
            "id",
            "user_id",
            "email",
            "username",
            "role",
        ]    