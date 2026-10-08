from django.urls import path

from .views import (
    OrganizationMemberListView,
    UserOrganizationListView,
)


urlpatterns = [
    path(
        "organizations/",
        UserOrganizationListView.as_view(),
        name="user-organizations",
    ),

    path(
        "organizations/<int:organization_id>/members/",
        OrganizationMemberListView.as_view(),
        name="organization-members",
    ),
]