from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
import logging

logger = logging.getLogger(__name__)

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            logger.warning("No access token found in cookies")
            return None
        try:
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            raise AuthenticationFailed(f'Invalid token: {str(e)}')