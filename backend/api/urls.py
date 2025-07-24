from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,LoginView,
    PasswordResetRequestView,PasswordResetConfirmView,
    CheckAuthView,LogoutView,
    ProductCreateView,ProductListView,ProductDetailView,ProductSearchView,
    UserProfileView,UserListView,UserDetailView,UserSearchView,UserOrderListView,
    OrderListView,OrderDetailView,
    ProductVariantSearchView,
    DailyReportView,MonthlyReportView,
    UserCouponsView,CouponValidateView,
    TrackVisitView,LiveVisitorsView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/<str:token>/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/check/', CheckAuthView.as_view(), name='auth-check'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('products/create/', ProductCreateView.as_view(), name='product-create'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('users/search/', UserSearchView.as_view(), name='user-search'),
    path('products/search/', ProductSearchView.as_view(), name='product-search'),
    path('reports/daily/', DailyReportView.as_view(), name='daily-report'),
    path('reports/monthly/', MonthlyReportView.as_view(), name='monthly-report'),
    path('products/variants/search/', ProductVariantSearchView.as_view(), name='product-variant-search'),
    path('user/orders/', UserOrderListView.as_view(), name='user-order-list'),
    path('user/coupons/', UserCouponsView.as_view(), name='user-coupons'),
    path('coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),
    path('track-visit/', TrackVisitView.as_view(), name='track-visit'), 
    path('live-visitors/', LiveVisitorsView.as_view(), name='live-visitors'), 
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)