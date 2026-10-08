from django.conf import settings
from django.db import models

from organizations.models import Membership, Organization


class Supplier(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="suppliers",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_suppliers",
    )

    responsible = models.ForeignKey(
        Membership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="responsible_suppliers",
    )

    legal_name = models.CharField(
        max_length=255,
    )

    trade_name = models.CharField(
        max_length=255,
        blank=True,
    )

    tax_id = models.CharField(
        max_length=32,
    )

    email = models.EmailField(
        blank=True,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    website = models.URLField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "tax_id"],
                name="unique_supplier_tax_id_per_organization",
            )
        ]

    def __str__(self):
        return self.trade_name or self.legal_name


class SupplierStatusEvent(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="status_history")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20, choices=Supplier.Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
