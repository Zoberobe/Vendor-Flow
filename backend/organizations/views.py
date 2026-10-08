from django.shortcuts import get_object_or_404

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView

from .models import Membership, Organization
from .serializers import (
    MembershipSerializer,
    UserOrganizationSerializer,
)


class UserOrganizationListView(ListAPIView):
    serializer_class = UserOrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Membership.objects
            .filter(user=self.request.user)
            .select_related("organization")
        )

class OrganizationMemberListView(ListAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_organization(self):
        return get_object_or_404(
            Organization,
            id=self.kwargs["organization_id"],
        )

    def get_queryset(self):
        organization = self.get_organization()

        has_membership = Membership.objects.filter(
            user=self.request.user,
            organization=organization,
        ).exists()

        if not has_membership:
            raise PermissionDenied(
                "You are not a member of this organization."
            )

        return (
            Membership.objects
            .filter(organization=organization)
            .select_related("user")
            .order_by("user__username")
        )