import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from organizations.models import Membership, Organization
from suppliers.models import Supplier, SupplierStatusEvent


class Command(BaseCommand):
    help = "Create repeatable demonstration organizations, accounts and supplier workflows."

    @transaction.atomic
    def handle(self, *args, **options):
        password = os.getenv("VENDORFLOW_DEMO_PASSWORD")
        if not password or len(password) < 12:
            raise CommandError("Set VENDORFLOW_DEMO_PASSWORD to at least 12 characters.")

        primary, _ = Organization.objects.get_or_create(slug="vendorflow-demo", defaults={"name": "VendorFlow Demo"})
        other, _ = Organization.objects.get_or_create(slug="northstar-demo", defaults={"name": "Northstar Demo"})
        accounts = [
            ("alex", "alex@vendorflow.demo", primary, Membership.Role.ADMIN),
            ("carlos", "carlos@vendorflow.demo", primary, Membership.Role.MANAGER),
            ("maria", "maria@vendorflow.demo", primary, Membership.Role.VIEWER),
            ("nina", "nina@northstar.demo", other, Membership.Role.ADMIN),
        ]
        members = {}
        for username, email, organization, role in accounts:
            user, created = User.objects.get_or_create(email=email, defaults={"username": f"demo_{username}"})
            if created:
                user.set_password(password)
                user.save(update_fields=["password"])
            membership, _ = Membership.objects.update_or_create(
                user=user, organization=organization, defaults={"role": role}
            )
            members[username] = membership

        suppliers = [
            ("Acme Facilities Ltd", "Acme Facilities", "DEMO-001", Supplier.Status.PENDING, "carlos"),
            ("Bluewave Cloud Ltd", "Bluewave Cloud", "DEMO-002", Supplier.Status.APPROVED, "alex"),
            ("Cedar Logistics Ltd", "Cedar Logistics", "DEMO-003", Supplier.Status.SUSPENDED, "carlos"),
            ("Delta Office Ltd", "Delta Office", "DEMO-004", Supplier.Status.REJECTED, "alex"),
            ("Evergreen Data Ltd", "Evergreen Data", "DEMO-005", Supplier.Status.PENDING, "carlos"),
            ("Faro Security Ltd", "Faro Security", "DEMO-006", Supplier.Status.APPROVED, "alex"),
            ("Granite Parts Ltd", "Granite Parts", "DEMO-007", Supplier.Status.PENDING, "carlos"),
            ("Harbor Services Ltd", "Harbor Services", "DEMO-008", Supplier.Status.APPROVED, "alex"),
            ("Ion Systems Ltd", "Ion Systems", "DEMO-009", Supplier.Status.PENDING, "carlos"),
            ("Jade Materials Ltd", "Jade Materials", "DEMO-010", Supplier.Status.APPROVED, "alex"),
            ("Kite Consulting Ltd", "Kite Consulting", "DEMO-011", Supplier.Status.PENDING, "carlos"),
            ("Lumen Energy Ltd", "Lumen Energy", "DEMO-012", Supplier.Status.APPROVED, "alex"),
        ]
        for legal_name, trade_name, tax_id, status, responsible in suppliers:
            supplier, created = Supplier.objects.get_or_create(
                organization=primary, tax_id=tax_id,
                defaults={"created_by": members["alex"].user, "responsible": members[responsible],
                          "legal_name": legal_name, "trade_name": trade_name,
                          "email": f"contact@{trade_name.lower().replace(' ', '')}.example",
                          "notes": "Fictitious demonstration record."},
            )
            if created:
                SupplierStatusEvent.objects.create(supplier=supplier, actor=members["alex"].user, to_status=Supplier.Status.PENDING)
                if status != Supplier.Status.PENDING:
                    SupplierStatusEvent.objects.create(
                        supplier=supplier, actor=members["carlos" if status in (Supplier.Status.APPROVED, Supplier.Status.REJECTED) else "alex"].user,
                        from_status=Supplier.Status.PENDING, to_status=Supplier.Status.APPROVED if status == Supplier.Status.SUSPENDED else status,
                    )
                    if status == Supplier.Status.SUSPENDED:
                        SupplierStatusEvent.objects.create(supplier=supplier, actor=members["alex"].user,
                                                           from_status=Supplier.Status.APPROVED, to_status=Supplier.Status.SUSPENDED)
                    supplier.status = status
                    supplier.save(update_fields=["status", "updated_at"])

        supplier, created = Supplier.objects.get_or_create(
            organization=other, tax_id="DEMO-001",
            defaults={"created_by": members["nina"].user, "responsible": members["nina"],
                      "legal_name": "Northstar Private Supplier", "trade_name": "Northstar Private"},
        )
        if created:
            SupplierStatusEvent.objects.create(supplier=supplier, actor=members["nina"].user, to_status=Supplier.Status.PENDING)
        self.stdout.write(self.style.SUCCESS("Demo data ready: 4 accounts, 2 organizations, 13 suppliers."))
