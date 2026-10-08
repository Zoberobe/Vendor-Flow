from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from organizations.models import Membership, Organization
from .models import Supplier, SupplierStatusEvent


class SupplierApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organization = Organization.objects.create(name="VendorFlow Inc", slug="vendorflow")
        cls.other_organization = Organization.objects.create(name="ACME Corporation", slug="acme")
        cls.admin = User.objects.create_user(username="admin", email="admin@vendorflow.test")
        cls.manager = User.objects.create_user(username="manager", email="manager@vendorflow.test")
        cls.viewer = User.objects.create_user(username="viewer", email="viewer@vendorflow.test")
        cls.other_admin = User.objects.create_user(username="other-admin", email="admin@acme.test")
        cls.admin_membership = Membership.objects.create(
            user=cls.admin, organization=cls.organization, role=Membership.Role.ADMIN
        )
        cls.manager_membership = Membership.objects.create(
            user=cls.manager, organization=cls.organization, role=Membership.Role.MANAGER
        )
        cls.viewer_membership = Membership.objects.create(
            user=cls.viewer, organization=cls.organization, role=Membership.Role.VIEWER
        )
        cls.other_admin_membership = Membership.objects.create(
            user=cls.other_admin, organization=cls.other_organization, role=Membership.Role.ADMIN
        )
        cls.pending_supplier = Supplier.objects.create(
            organization=cls.organization,
            created_by=cls.admin,
            responsible=cls.admin_membership,
            legal_name="Alpha Services Ltd",
            trade_name="Alpha",
            tax_id="VF-001",
            status=Supplier.Status.PENDING,
        )
        cls.approved_supplier = Supplier.objects.create(
            organization=cls.organization,
            created_by=cls.admin,
            responsible=cls.manager_membership,
            legal_name="Beta Manufacturing Ltd",
            trade_name="Beta",
            tax_id="VF-002",
            status=Supplier.Status.APPROVED,
        )
        cls.other_supplier = Supplier.objects.create(
            organization=cls.other_organization,
            created_by=cls.other_admin,
            responsible=cls.other_admin_membership,
            legal_name="ACME Parts Ltd",
            trade_name="ACME Parts",
            tax_id="ACME-001",
        )

    def list_url(self, organization=None):
        organization = organization or self.organization
        return reverse("supplier-list", kwargs={"organization_id": organization.id})

    def detail_url(self, supplier, organization=None):
        organization = organization or self.organization
        return reverse("supplier-detail", kwargs={
            "organization_id": organization.id,
            "pk": supplier.id,
        })

    def action_url(self, supplier, action):
        return reverse(f"supplier-{action}", kwargs={
            "organization_id": self.organization.id,
            "pk": supplier.id,
        })

    def supplier_payload(self, suffix, **overrides):
        payload = {
            "legal_name": f"Supplier {suffix} Ltd",
            "trade_name": f"Supplier {suffix}",
            "tax_id": f"TAX-{suffix}",
        }
        payload.update(overrides)
        return payload

    def test_supplier_list_requires_authentication(self):
        response = self.client.get(self.list_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_is_isolated_by_tenant(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.json()["results"]}
        self.assertEqual(returned_ids, {self.pending_supplier.id, self.approved_supplier.id})
        self.assertNotIn(self.other_supplier.id, returned_ids)

    def test_supplier_from_another_tenant_is_not_accessible(self):
        self.client.force_authenticate(self.admin)
        hidden_response = self.client.get(self.detail_url(self.other_supplier))
        forbidden_response = self.client.get(
            self.detail_url(self.other_supplier, self.other_organization)
        )
        self.assertEqual(hidden_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_admin_and_manager_can_create(self):
        cases = [
            (self.admin, "ADMIN-CREATE", status.HTTP_201_CREATED),
            (self.manager, "MANAGER-CREATE", status.HTTP_201_CREATED),
            (self.viewer, "VIEWER-CREATE", status.HTTP_403_FORBIDDEN),
        ]
        for user, suffix, expected in cases:
            with self.subTest(user=user.email):
                self.client.force_authenticate(user)
                response = self.client.post(self.list_url(), self.supplier_payload(suffix))
                self.assertEqual(response.status_code, expected)

    def test_only_admin_and_manager_can_update(self):
        cases = [
            (self.admin, status.HTTP_200_OK),
            (self.manager, status.HTTP_200_OK),
            (self.viewer, status.HTTP_403_FORBIDDEN),
        ]
        for user, expected in cases:
            with self.subTest(user=user.email):
                self.client.force_authenticate(user)
                response = self.client.patch(
                    self.detail_url(self.pending_supplier),
                    {"notes": f"Updated by {user.username}"},
                )
                self.assertEqual(response.status_code, expected)

    def test_only_admin_can_delete(self):
        cases = [
            (self.admin, "ADMIN-DELETE", status.HTTP_204_NO_CONTENT),
            (self.manager, "MANAGER-DELETE", status.HTTP_403_FORBIDDEN),
            (self.viewer, "VIEWER-DELETE", status.HTTP_403_FORBIDDEN),
        ]
        for user, suffix, expected in cases:
            supplier = Supplier.objects.create(
                organization=self.organization,
                created_by=self.admin,
                legal_name=f"Delete {suffix}",
                tax_id=suffix,
            )
            with self.subTest(user=user.email):
                self.client.force_authenticate(user)
                response = self.client.delete(self.detail_url(supplier))
                self.assertEqual(response.status_code, expected)

    def test_admin_and_manager_are_valid_responsibles(self):
        for membership, suffix in [
            (self.admin_membership, "RESP-ADMIN"),
            (self.manager_membership, "RESP-MANAGER"),
        ]:
            with self.subTest(role=membership.role):
                self.client.force_authenticate(self.admin)
                response = self.client.post(
                    self.list_url(),
                    self.supplier_payload(suffix, responsible=membership.id),
                )
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(response.json()["responsible"], membership.id)

    def test_viewer_cannot_be_responsible(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url(),
            self.supplier_payload("RESP-VIEWER", responsible=self.viewer_membership.id),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("responsible", response.json())

    def test_member_of_another_tenant_cannot_be_responsible(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url(),
            self.supplier_payload("RESP-FOREIGN", responsible=self.other_admin_membership.id),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("responsible", response.json())

    def test_duplicate_tax_id_in_same_organization_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url(),
            self.supplier_payload("DUPLICATE", tax_id=self.pending_supplier.tax_id),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tax_id", response.json())

    def test_same_tax_id_is_allowed_in_different_organizations(self):
        self.client.force_authenticate(self.other_admin)
        response = self.client.post(
            self.list_url(self.other_organization),
            self.supplier_payload("CROSS-TENANT", tax_id=self.pending_supplier.tax_id),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_manager_can_approve_pending_supplier(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.action_url(self.pending_supplier, "approve"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], Supplier.Status.APPROVED)
        self.assertEqual(response.json()["status_history"][-1]["to_status"], Supplier.Status.APPROVED)
        event = SupplierStatusEvent.objects.get(supplier=self.pending_supplier)
        self.assertEqual((event.from_status, event.to_status, event.actor),
                         (Supplier.Status.PENDING, Supplier.Status.APPROVED, self.manager))

    def test_summary_uses_same_tenant_data_as_list(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get(reverse("supplier-summary", kwargs={"organization_id": self.organization.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["total"], 2)
        self.assertEqual(response.json()["pending"], 1)
        self.assertEqual(response.json()["approved"], 1)
        self.assertEqual([item["id"] for item in response.json()["attention"]], [self.pending_supplier.id])
        self.assertNotIn(self.other_supplier.id, [item["id"] for item in response.json()["attention"]])

    def test_invalid_transition_does_not_create_history(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.action_url(self.pending_supplier, "suspend"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(SupplierStatusEvent.objects.filter(supplier=self.pending_supplier).exists())

    def test_full_jwt_journey_across_roles(self):
        for user in (self.admin, self.manager, self.viewer):
            user.set_password("demo-test-password")
            user.save(update_fields=["password"])
        self.client.force_authenticate(user=None)
        for user, can_create, expected_count in ((self.admin, True, 2), (self.manager, True, 3), (self.viewer, False, 4)):
            with self.subTest(role=user.username):
                tokens = self.client.post(reverse("token_obtain_pair"),
                                          {"email": user.email, "password": "demo-test-password"}).json()
                refreshed = self.client.post(reverse("token_refresh"), {"refresh": tokens["refresh"]})
                self.assertEqual(refreshed.status_code, status.HTTP_200_OK)
                self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.json()['access']}")
                self.assertEqual(self.client.get(reverse("current-user")).status_code, status.HTTP_200_OK)
                self.assertEqual(self.client.get(self.list_url()).json()["count"], expected_count)
                self.assertEqual(self.client.get(self.list_url(self.other_organization)).status_code, status.HTTP_403_FORBIDDEN)
                result = self.client.post(self.list_url(), self.supplier_payload(f"JOURNEY-{user.username}"))
                self.assertEqual(result.status_code, status.HTTP_201_CREATED if can_create else status.HTTP_403_FORBIDDEN)

    def test_manager_can_reject_pending_supplier(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.action_url(self.pending_supplier, "reject"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], Supplier.Status.REJECTED)

    def test_admin_can_suspend_approved_supplier(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.action_url(self.approved_supplier, "suspend"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], Supplier.Status.SUSPENDED)

    def test_manager_cannot_suspend_supplier(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.action_url(self.approved_supplier, "suspend"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.approved_supplier.refresh_from_db()
        self.assertEqual(self.approved_supplier.status, Supplier.Status.APPROVED)

    def test_invalid_workflow_transition_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.action_url(self.pending_supplier, "suspend"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.pending_supplier.refresh_from_db()
        self.assertEqual(self.pending_supplier.status, Supplier.Status.PENDING)

    def test_status_cannot_be_changed_with_patch(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            self.detail_url(self.pending_supplier),
            {"status": Supplier.Status.APPROVED},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.json())

    def test_search_matches_legal_name_trade_name_and_tax_id(self):
        self.client.force_authenticate(self.admin)
        cases = [
            ("Alpha Services", self.pending_supplier.id),
            ("Beta", self.approved_supplier.id),
            ("VF-002", self.approved_supplier.id),
        ]
        for term, expected_id in cases:
            with self.subTest(term=term):
                response = self.client.get(self.list_url(), {"search": term})
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                returned_ids = {item["id"] for item in response.json()["results"]}
                self.assertIn(expected_id, returned_ids)
                self.assertNotIn(self.other_supplier.id, returned_ids)

    def test_status_and_responsible_filters_are_exact(self):
        self.client.force_authenticate(self.admin)
        status_response = self.client.get(
            self.list_url(), {"status": Supplier.Status.APPROVED}
        )
        responsible_response = self.client.get(
            self.list_url(), {"responsible": self.admin_membership.id}
        )
        self.assertEqual(
            {item["id"] for item in status_response.json()["results"]},
            {self.approved_supplier.id},
        )
        self.assertEqual(
            {item["id"] for item in responsible_response.json()["results"]},
            {self.pending_supplier.id},
        )

    def test_ordering_and_pagination(self):
        for index in range(23):
            Supplier.objects.create(
                organization=self.organization,
                created_by=self.admin,
                legal_name=f"Bulk Supplier {index:02d}",
                tax_id=f"BULK-{index:02d}",
            )
        self.client.force_authenticate(self.admin)
        default_page = self.client.get(self.list_url(), {"ordering": "legal_name"})
        full_page = self.client.get(
            self.list_url(), {"ordering": "legal_name", "page_size": 100}
        )
        self.assertEqual(default_page.status_code, status.HTTP_200_OK)
        self.assertEqual(default_page.json()["count"], 25)
        self.assertEqual(len(default_page.json()["results"]), 20)
        self.assertIsNotNone(default_page.json()["next"])
        names = [item["legal_name"] for item in full_page.json()["results"]]
        self.assertEqual(names, sorted(names))
