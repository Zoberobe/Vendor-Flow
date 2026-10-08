import os
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from accounts.models import User
from organizations.models import Membership, Organization
from suppliers.models import Supplier, SupplierStatusEvent


class DemoSeedTests(TestCase):
    def test_demo_seed_is_repeatable_and_preserves_existing_passwords(self):
        with patch.dict(os.environ, {"VENDORFLOW_DEMO_PASSWORD": "example-demo-password-123"}):
            call_command("seed_demo", stdout=StringIO())
            self.assertEqual(User.objects.count(), 4)
            self.assertEqual(Organization.objects.count(), 2)
            self.assertEqual(Supplier.objects.count(), 13)
            self.assertEqual(SupplierStatusEvent.objects.count(), 21)

            alex = User.objects.get(email="alex@vendorflow.demo")
            self.assertTrue(alex.check_password("example-demo-password-123"))
            alex.set_password("another-private-password-123")
            alex.save(update_fields=["password"])

            call_command("seed_demo", stdout=StringIO())

        alex.refresh_from_db()
        self.assertTrue(alex.check_password("another-private-password-123"))
        self.assertEqual(User.objects.count(), 4)
        self.assertEqual(Organization.objects.count(), 2)
        self.assertEqual(Supplier.objects.count(), 13)
        self.assertEqual(SupplierStatusEvent.objects.count(), 21)
        self.assertEqual(
            Membership.objects.get(user=alex, organization__slug="vendorflow-demo").role,
            Membership.Role.ADMIN,
        )
        self.assertEqual(
            Supplier.objects.filter(tax_id="DEMO-001").count(),
            2,
        )
