from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthenticationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="alex",
            email="alex@vendorflow.test",
            password="strong-test-password",
        )

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("current-user"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("current-user"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json(),
            {
                "id": self.user.id,
                "email": self.user.email,
                "username": self.user.username,
            },
        )

    def test_valid_jwt_authenticates_requests(self):
        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {
                "email": self.user.email,
                "password": "strong-test-password",
            },
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.json()['access']}"
        )
        response = self.client.get(reverse("current-user"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], self.user.email)

    def test_openapi_schema_and_swagger_ui_are_available(self):
        schema_response = self.client.get(reverse("schema"))
        docs_response = self.client.get(reverse("swagger-ui"))
        self.assertEqual(schema_response.status_code, status.HTTP_200_OK)
        self.assertIn("application/vnd.oai.openapi", schema_response["Content-Type"])
        self.assertEqual(docs_response.status_code, status.HTTP_200_OK)

    def test_cors_allows_only_configured_frontend_origins(self):
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://vendorflow-operations.alexaugustokastro.chatgpt.site",
        ]
        for origin in allowed_origins:
            with self.subTest(origin=origin):
                allowed_response = self.client.get(
                    reverse("swagger-ui"),
                    HTTP_ORIGIN=origin,
                )
                self.assertEqual(
                    allowed_response["Access-Control-Allow-Origin"],
                    origin,
                )

        denied_response = self.client.get(
            reverse("swagger-ui"),
            HTTP_ORIGIN="https://untrusted.example",
        )
        self.assertNotIn("Access-Control-Allow-Origin", denied_response)
