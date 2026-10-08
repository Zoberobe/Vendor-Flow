from django.db import models
from django.conf import settings

# Create your models here.
class Organization(models.Model):
    name = models.CharField(max_length=255)

    slug = models.SlugField(
        max_length=255,
        unique=True,
    )

    created_at = models.DateField(
        auto_now_add=True,
    )

    updated_at = models.DateField(
        auto_now=True,
    )

    def __str__(self):
        return self.name

class Membership(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        VIEWER = "VIEWER", "Viewer"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
    )

    created_at = models.DateField(
        auto_now_add=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                name="unique_user_organization_membership",
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.organization} ({self.role})"
    