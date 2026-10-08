from rest_framework import permissions
from rest_framework.generics import RetrieveAPIView

from .serializers import CurrentUserSerializer


class CurrentUserView(RetrieveAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
