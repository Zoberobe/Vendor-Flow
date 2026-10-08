from rest_framework import serializers

from organizations.models import Membership
from .models import Supplier, SupplierStatusEvent


class SupplierStatusEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = SupplierStatusEvent
        fields = ["id", "from_status", "to_status", "actor_name", "created_at"]

    def get_actor_name(self, obj) -> str:
        return obj.actor.username or obj.actor.email if obj.actor else "Deleted user"


class SupplierSerializer(serializers.ModelSerializer):
    responsible_name = serializers.SerializerMethodField()
    status_history = SupplierStatusEventSerializer(many=True, read_only=True)

    def get_responsible_name(self, obj) -> str:
        if obj.responsible_id and obj.responsible.user_id:
            return obj.responsible.user.username or obj.responsible.user.email
        return "Unassigned"

    class Meta:
        model = Supplier
        fields = [
            "id",
            "legal_name",
            "trade_name",
            "tax_id",
            "email",
            "phone",
            "website",
            "responsible",
            "responsible_name",
            "status",
            "status_history",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "responsible_name",
            "status_history",
            "created_at",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        organization = self.context.get("organization")

        if organization:
            self.fields["responsible"].queryset = (
                Membership.objects.filter(
                    organization=organization,
                    role__in=[
                        Membership.Role.ADMIN,
                        Membership.Role.MANAGER,
                    ],
                )
            )

    def validate_responsible(self, responsible):
        if responsible is None:
            return responsible

        organization = self.context["organization"]

        if responsible.organization_id != organization.id:
            raise serializers.ValidationError(
                "Responsible must belong to this organization."
            )

        if responsible.role not in [
            Membership.Role.ADMIN,
            Membership.Role.MANAGER,
        ]:
            raise serializers.ValidationError(
                "Responsible must be an admin or manager."
            )

        return responsible

    def validate(self, attrs):
        if "status" in self.initial_data:
            raise serializers.ValidationError(
            {
                "status": (
                    "Status can only be changed through workflow actions."
                )
            }
        )

        organization = self.context["organization"]

        tax_id = attrs.get("tax_id")

        if tax_id is not None:
            queryset = Supplier.objects.filter(
                organization=organization,
                tax_id=tax_id,
            )

            if self.instance:
                queryset = queryset.exclude(
                pk=self.instance.pk
            )

            if queryset.exists():
                raise serializers.ValidationError(
                    {
                        "tax_id": (
                            "A supplier with this tax ID "
                            "already exists in this organization."
                        )
                    }
                )

        return attrs
