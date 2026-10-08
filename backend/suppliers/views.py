from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q

from rest_framework import permissions
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from organizations.models import Membership, Organization

from .models import Supplier, SupplierStatusEvent
from .pagination import SupplierPagination
from .serializers import SupplierSerializer


class SupplierViewSet(ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = SupplierPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "responsible"]
    search_fields = ["legal_name", "trade_name", "tax_id"]
    ordering_fields = ["created_at", "updated_at", "legal_name"]
    ordering = ["-created_at"]

    def get_organization(self):
        if not hasattr(self, "_organization"):
            self._organization = get_object_or_404(
                Organization,
                id=self.kwargs["organization_id"],
            )

        return self._organization

    def get_membership(self):
        if not hasattr(self, "_membership"):
            organization = self.get_organization()

            membership = Membership.objects.filter(
                user=self.request.user,
                organization=organization,
            ).first()

            if membership is None:
                raise PermissionDenied(
                    "You are not a member of this organization."
                )

            self._membership = membership

        return self._membership

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Supplier.objects.none()

        organization = self.get_organization()

        self.get_membership()

        return (
            Supplier.objects
            .filter(organization=organization)
            .select_related(
                "organization",
                "created_by",
                "responsible",
                "responsible__user",
            )
            .prefetch_related("status_history__actor")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()

        if "organization_id" in self.kwargs:
            context["organization"] = self.get_organization()

        return context

    def perform_create(self, serializer):
        membership = self.get_membership()

        if membership.role not in [
            Membership.Role.ADMIN,
            Membership.Role.MANAGER,
        ]:
            raise PermissionDenied(
                "You do not have permission to create suppliers."
            )

        supplier = serializer.save(
            organization=membership.organization,
            created_by=self.request.user,
        )
        SupplierStatusEvent.objects.create(
            supplier=supplier, actor=self.request.user,
            to_status=Supplier.Status.PENDING,
        )

    def perform_update(self, serializer):
        membership = self.get_membership()

        if membership.role not in [
            Membership.Role.ADMIN,
            Membership.Role.MANAGER,
        ]:
            raise PermissionDenied(
                "You do not have permission to update suppliers."
            )

        serializer.save()


    def require_roles(self, allowed_roles):
        membership = self.get_membership()

        if membership.role not in allowed_roles:
            raise PermissionDenied(
                "You do not have permission to perform this action."
            )

        return membership


    @transaction.atomic
    def transition_supplier(
        self,
        supplier,
        *,
        expected_status,
        new_status,
    ):
        supplier = self.get_queryset().select_for_update().get(pk=supplier.pk)
        if supplier.status != expected_status:
            raise ValidationError(
                {
                    "status": (
                        f"Supplier must be {expected_status} "
                        f"to transition to {new_status}."
                    )
                }
            )

        previous_status = supplier.status
        supplier.status = new_status

        supplier.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        SupplierStatusEvent.objects.create(
            supplier=supplier, actor=self.request.user,
            from_status=previous_status, to_status=new_status,
        )
        if hasattr(supplier, "_prefetched_objects_cache"):
            supplier._prefetched_objects_cache.pop("status_history", None)

        return supplier

    @action(detail=False, methods=["get"])
    def summary(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        counts = queryset.aggregate(
            total=Count("id"),
            pending=Count("id", filter=Q(status=Supplier.Status.PENDING)),
            approved=Count("id", filter=Q(status=Supplier.Status.APPROVED)),
            suspended=Count("id", filter=Q(status=Supplier.Status.SUSPENDED)),
        )
        attention = queryset.filter(
            status__in=[Supplier.Status.PENDING, Supplier.Status.SUSPENDED]
        ).order_by("-updated_at")[:5]
        return Response({**counts, "attention": self.get_serializer(attention, many=True).data})
        
    def perform_destroy(self, instance):
        membership = self.get_membership()

        if membership.role != Membership.Role.ADMIN:
            raise PermissionDenied(
                "Only admins can delete suppliers."
            )

        instance.delete()

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(self, request, *args, **kwargs):
        self.require_roles(
            [
                Membership.Role.ADMIN,
                Membership.Role.MANAGER,
            ]
        )

        supplier = self.get_object()

        supplier = self.transition_supplier(
            supplier,
            expected_status=Supplier.Status.PENDING,
            new_status=Supplier.Status.APPROVED,
        )

        return Response(
            self.get_serializer(supplier).data
        )     

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(self, request, *args, **kwargs):
        self.require_roles(
            [
                Membership.Role.ADMIN,
                Membership.Role.MANAGER,
            ]
        )

        supplier = self.get_object()

        supplier = self.transition_supplier(
            supplier,
            expected_status=Supplier.Status.PENDING,
            new_status=Supplier.Status.REJECTED,
        )

        return Response(
            self.get_serializer(supplier).data
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def suspend(self, request, *args, **kwargs):
        self.require_roles(
            [
                Membership.Role.ADMIN,
            ]
        )

        supplier = self.get_object()

        supplier = self.transition_supplier(
            supplier,
            expected_status=Supplier.Status.APPROVED,
            new_status=Supplier.Status.SUSPENDED,
        )

        return Response(
            self.get_serializer(supplier).data
        )
