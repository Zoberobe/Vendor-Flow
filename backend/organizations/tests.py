from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Membership, Organization


class OrganizationApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.vendorflow = Organization.objects.create(name="VendorFlow Inc", slug="vendorflow")
        cls.acme = Organization.objects.create(name="ACME Corporation", slug="acme")
        cls.alex = User.objects.create_user(username="alex", email="alex@vendorflow.test")
        cls.maria = User.objects.create_user(username="maria", email="maria@vendorflow.test")
        cls.ana = User.objects.create_user(username="ana", email="ana@acme.test")
        cls.alex_membership = Membership.objects.create(
            user=cls.alex, organization=cls.vendorflow, role=Membership.Role.ADMIN
        )
        cls.maria_membership = Membership.objects.create(
            user=cls.maria, organization=cls.vendorflow, role=Membership.Role.VIEWER
        )
        cls.ana_membership = Membership.objects.create(
            user=cls.ana, organization=cls.acme, role=Membership.Role.ADMIN
        )

    def test_organization_list_requires_authentication(self):
        response = self.client.get(reverse("user-organizations"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_organization_list_contains_only_user_memberships(self):
        self.client.force_authenticate(self.alex)
        response = self.client.get(reverse("user-organizations"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json(),
            [{
                "id": self.vendorflow.id,
                "name": self.vendorflow.name,
                "slug": self.vendorflow.slug,
                "role": Membership.Role.ADMIN,
            }],
        )

    def test_members_endpoint_lists_only_requested_tenant(self):
        self.client.force_authenticate(self.alex)
        response = self.client.get(reverse(
            "organization-members", kwargs={"organization_id": self.vendorflow.id}
        ))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {member["id"] for member in response.json()}
        self.assertEqual(returned_ids, {self.alex_membership.id, self.maria_membership.id})
        self.assertNotIn(self.ana_membership.id, returned_ids)

    def test_member_cannot_read_another_tenants_members(self):
        self.client.force_authenticate(self.alex)
        response = self.client.get(reverse(
            "organization-members", kwargs={"organization_id": self.acme.id}
        ))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_organization_returns_not_found(self):
        self.client.force_authenticate(self.alex)
        response = self.client.get(reverse(
            "organization-members", kwargs={"organization_id": 999999}
        ))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
