from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from .models import CustomUser,Report,Order,OrderItem,Product,ProductVariant,Coupon,VisitorLog, PasswordResetToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import UserSerializer,ProductSerializer,ReportSerializer,OrderSerializer,CouponSerializer
from django.utils import timezone
from datetime import timedelta , datetime
from rest_framework.permissions import IsAuthenticated
from api.authentication import CookieJWTAuthentication
from django.db.models import Sum, F, DecimalField
import uuid
from django.conf import settings
from django.core.mail import send_mail
import logging
logger = logging.getLogger(__name__)


def is_admin_user(request):
    access_token = request.COOKIES.get('access_token')
    if not access_token:
        return False, Response(
            {'detail': 'Authentication credentials were not provided.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    try:
        token = AccessToken(access_token)
        user_id = token['user_id']
        user = CustomUser.objects.get(id=user_id)
        return (user.is_superuser or user.is_staff), user
    except (TokenError, CustomUser.DoesNotExist):
        return False, Response(
            {'detail': 'Invalid token.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
def is_admin_us(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)

class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Registration successful!"}, status=status.HTTP_201_CREATED)
        
        error_response = {"message": "Invalid registration data.", "errors": serializer.errors}
        
        if "email" in serializer.errors:
            error_response["email"] = "Email already in use."
        if "phone_number" in serializer.errors:
            error_response["phone_number"] = "Phone number already in use."
        
        return Response(error_response, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.check_password(password):
            refresh = RefreshToken.for_user(user)
            serializer = UserSerializer(user)

            access_token_lifetime = timedelta(days=4)  
            refresh_token_lifetime = timedelta(days=4)

            refresh.set_exp(lifetime=refresh_token_lifetime)


            user.last_activity = timezone.now()
            user.save()

            response = Response({
                'user': serializer.data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })

            response.set_cookie(
                key='access_token',
                value=str(refresh.access_token),
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=int(access_token_lifetime.total_seconds()),
                path='/',
            )
            response.set_cookie(
                key='refresh_token',
                value=str(refresh),
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=int(refresh_token_lifetime.total_seconds()),
                path='/',
            )

            return response
        return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_400_BAD_REQUEST)




class CheckAuthView(APIView):
    def get(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            print("No access token found in cookies")
            return Response({'user': None}, status=status.HTTP_200_OK)

        try:
            token = AccessToken(access_token)
            user_id = token['user_id']
            user = CustomUser.objects.get(id=user_id)

            current_time = timezone.now()
            if user.last_activity:
                time_difference = current_time - user.last_activity
                if time_difference > timedelta(days=4):
                    print("User logged out due to inactivity")
                    response = Response({'user': None}, status=status.HTTP_200_OK)
                    response.delete_cookie('access_token')
                    response.delete_cookie('refresh_token')
                    return response

            user.last_activity = current_time
            user.save()
            serializer = UserSerializer(user)
            print(f"User authenticated: {user.email}")
            return Response({
                'user': serializer.data,
                'current_password_hash': user.password,
            }, status=status.HTTP_200_OK) # Changed status from None to 200_OK
        except (TokenError, TokenError, CustomUser.DoesNotExist) as e:
            print(f"Auth check error: {str(e)}")
            response = Response({'user': 'Invalid or expired token'}, status=status.HTTP_403_FORBIDDEN)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response


class LogoutView(APIView):
    def post(self, request):
        response = Response({'detail': 'Logged out successfully'})
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        return response
    



class ProductCreateView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def post(self, request):
        print("Received data:", request.data)
        print("Files:", request.FILES)
        print("User:", request.user, "Is authenticated:", request.user.is_authenticated)

        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response

        serializer = ProductSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Product added successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(
            {"message": "Invalid product data", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    


class ProductListView(APIView):
    def get(self, request):
        try:
            products = Product.objects.all()
            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error fetching products: {str(e)}")
            return Response(
                {"message": "Failed to fetch products", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductDetailView(APIView):
    def get(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
            serializer = ProductSerializer(product)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Product.DoesNotExist:
            return Response(
                {"message": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error fetching product details: {str(e)}")
            return Response(
                {"message": "Failed to fetch product details", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            product = Product.objects.get(pk=pk)
            serializer = ProductSerializer(product, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(
                    {"message": "Product updated successfully", "data": serializer.data},
                    status=status.HTTP_200_OK
                )
            return Response(
                {"message": "Invalid product data", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Product.DoesNotExist:
            return Response(
                {"message": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    def delete(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            product = Product.objects.get(pk=pk)
            product.delete()
            return Response(
                {"message": "Product deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Product.DoesNotExist:
            return Response(
                {"message": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        


class UserProfileView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
        try:
            user = request.user
            serializer = UserSerializer(user)
            data = serializer.data
            data['fullName'] = f"{user.first_name} {user.last_name}".strip()
            data['governorate'] = request.user.governorate if hasattr(request.user, 'governorate') else None
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"message": "Failed to fetch user profile", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        


class UserListView(APIView):
    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        users = CustomUser.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(APIView):
    def get(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            user = CustomUser.objects.get(pk=pk)
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            user = CustomUser.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            user = CustomUser.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            user = CustomUser.objects.get(pk=pk)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CustomUser.DoesNotExist:
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)



from .models import Coupon
from .serializers import CouponSerializer
class UserCouponsView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
        coupons = Coupon.objects.filter(user=request.user, is_used=False)
        serializer = CouponSerializer(coupons, many=True)
        return Response(serializer.data)
    






class CouponValidateView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({"error": "Coupon code is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            coupon = Coupon.objects.get(code=code, user=request.user, is_used=False)
            serializer = CouponSerializer(coupon)
            return Response({
                "message": "Coupon is valid.",
                "coupon": serializer.data
            }, status=status.HTTP_200_OK)
        except Coupon.DoesNotExist:
            return Response({"error": "Invalid or already used coupon code."}, status=status.HTTP_400_BAD_REQUEST)



class UserOrderListView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
        try:
            user = request.user
            if not user.is_authenticated:
                return Response(
                    {"message": "Authentication required."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            orders = Order.objects.prefetch_related('items__product_variant__product').filter(user=user)
            serializer = OrderSerializer(orders, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"message": "Failed to fetch user orders", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrderListView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        orders = Order.objects.prefetch_related('items__product_variant__product').all()
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"message": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            serializer = OrderSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                order = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error creating order: {str(e)}") 
            return Response(
                {"message": "Failed to create order", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrderDetailView(APIView):
    def get(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            order = Order.objects.prefetch_related('items__product_variant__product').get(pk=pk)
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({"message": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            order = Order.objects.get(pk=pk)
            serializer = OrderSerializer(order, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Order.DoesNotExist:
            return Response({"message": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        try:
            order = Order.objects.get(pk=pk)
            order.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Order.DoesNotExist:
            return Response({"message": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

class UserSearchView(APIView):
    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        query = request.query_params.get('q', '')
        users = CustomUser.objects.filter(first_name__icontains=query)[:10]
        return Response([{'id': u.id, 'first_name': u.first_name} for u in users], status=status.HTTP_200_OK)

class ProductSearchView(APIView):
    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        query = request.query_params.get('q', '')
        products = Product.objects.filter(name__icontains=query)[:10]
        return Response([
            {'id': p.id, 'name': p.name, 'sale_price': str(p.sale_price)} 
            for p in products
        ], status=status.HTTP_200_OK)
    
    
class ProductVariantSearchView(APIView):
    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response
        product_id = request.query_params.get('product_id', '')
        if not product_id:
            return Response({"message": "Product ID required."}, status=status.HTTP_400_BAD_REQUEST)
        variants = ProductVariant.objects.filter(product_id=product_id)
        return Response([
            {'id': v.id, 'color': v.color, 'size': v.size, 'quantity': v.quantity}
            for v in variants
        ], status=status.HTTP_200_OK)




from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .authentication import CookieJWTAuthentication
from .models import VisitorLog, Order, OrderItem, Coupon, Report
from django.db.models import Sum, F, DecimalField
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class DailyReportView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response

        try:
            date_str = request.query_params.get('date', timezone.now().date().isoformat())
            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"message": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            start_date = timezone.make_aware(datetime.combine(report_date, datetime.min.time()))
            end_date = start_date + timedelta(days=1)

            orders = Order.objects.filter(
                created_at__gte=start_date,
                created_at__lt=end_date,
                status='delivered'
            ).prefetch_related('items__product_variant__product')

            total_orders = orders.count()
            total_sales = sum(
                float(order.total_price - order.delivery_fee)
                for order in orders
            ) if orders.exists() else 0
            total_sales_with_delivery = sum(
                float(order.total_price)
                for order in orders
            ) if orders.exists() else 0

            product_sales = (
                OrderItem.objects.filter(order__in=orders)
                .values('product_variant__product__name')
                .annotate(
                    total_quantity=Sum('quantity'),
                    total_sale_price=Sum(F('sale_price') * F('quantity'), output_field=DecimalField()),
                    total_purchase_price=Sum(F('purchase_price') * F('quantity'), output_field=DecimalField()),
                    total_profit=Sum(
                        (F('sale_price') - F('purchase_price')) * F('quantity'),
                        output_field=DecimalField()
                    )
                )
            )

            total_profit = sum(item['total_profit'] for item in product_sales) or 0

            # حساب عدد الزوار الفريدين بناءً على ip_address
            unique_visitors = VisitorLog.objects.filter(
                visited_at__gte=start_date,
                visited_at__lt=end_date
            ).values('ip_address').distinct().count()

            order_details = []
            for order in orders:
                original_cart_total = sum(float(item.sale_price * item.quantity) for item in order.items.all())
                coupon_discount = 0.0
                if order.coupon_code:
                    try:
                        coupon = Coupon.objects.get(code=order.coupon_code, is_used=True)
                        first_item_price = order.items.first().sale_price if order.items.exists() else 0
                        coupon_discount = float(min(coupon.value, first_item_price))
                    except Coupon.DoesNotExist:
                        logger.warning(f"Coupon {order.coupon_code} not found for order {order.id}")

                order_details.append({
                    'order_id': order.id,
                    'original_cart_total': float(original_cart_total),
                    'cart_total': float(order.cart_total),
                    'delivery_fee': float(order.delivery_fee),
                    'total_price': float(order.total_price),
                    'coupon_code': order.coupon_code,
                    'coupon_discount': coupon_discount,
                    'items': [
                        {
                            'product_name': item.product_variant.product.name,
                            'quantity': item.quantity,
                            'sale_price': float(item.sale_price),
                            'total_sale_price': float(item.sale_price * item.quantity),
                        }
                        for item in order.items.all()
                    ]
                })

            report_data = {
                'date': report_date.isoformat(),
                'total_orders': total_orders,
                'total_sales': float(total_sales),
                'total_sales_with_delivery': float(total_sales_with_delivery),
                'total_profit': float(total_profit),
                'total_visitors': unique_visitors,  # إضافة عدد الزوار
                'products': [
                    {
                        'product_name': item['product_variant__product__name'],
                        'quantity_sold': item['total_quantity'],
                        'total_sale_price': float(item['total_sale_price']),
                        'total_purchase_price': float(item['total_purchase_price']),
                        'total_profit': float(item['total_profit'])
                    }
                    for item in product_sales
                ],
                'orders': order_details
            }

            report, created = Report.objects.get_or_create(
                date=report_date,
                defaults={'total_sales': total_sales, 'total_orders': total_orders, 'total_profit': total_profit}
            )
            if not created:
                report.total_sales = total_sales
                report.total_orders = total_orders
                report.total_profit = total_profit
                report.save()

            return Response(report_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"message": "Failed to generate report", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .authentication import CookieJWTAuthentication
from .models import VisitorLog, Order, OrderItem, Coupon
from django.db.models import Sum, F, DecimalField
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class MonthlyReportView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin, response = is_admin_user(request)
        if not is_admin:
            return response

        try:
            year = int(request.query_params.get('year', timezone.now().year))
            month = int(request.query_params.get('month', timezone.now().month))

            if not (1 <= month <= 12):
                return Response(
                    {"message": "Invalid month. Must be between 1 and 12."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            start_date = timezone.make_aware(datetime(year, month, 1))
            if month == 12:
                end_date = timezone.make_aware(datetime(year + 1, 1, 1))
            else:
                end_date = timezone.make_aware(datetime(year, month + 1, 1))

            orders = Order.objects.filter(
                created_at__gte=start_date,
                created_at__lt=end_date,
                status='delivered'
            ).prefetch_related('items__product_variant__product')

            total_orders = orders.count()
            total_sales = sum(
                float(order.total_price - order.delivery_fee)
                for order in orders
            ) if orders.exists() else 0
            total_sales_with_delivery = sum(
                float(order.total_price)
                for order in orders
            ) if orders.exists() else 0

            product_sales = (
                OrderItem.objects.filter(order__in=orders)
                .values('product_variant__product__name')
                .annotate(
                    total_quantity=Sum('quantity'),
                    total_sale_price=Sum(F('sale_price') * F('quantity'), output_field=DecimalField()),
                    total_purchase_price=Sum(F('purchase_price') * F('quantity'), output_field=DecimalField()),
                    total_profit=Sum(
                        (F('sale_price') - F('purchase_price')) * F('quantity'),
                        output_field=DecimalField()
                    )
                )
            )

            total_profit = sum(item['total_profit'] for item in product_sales) or 0

            # حساب عدد الزوار الفريدين بناءً على ip_address
            unique_visitors = VisitorLog.objects.filter(
                visited_at__gte=start_date,
                visited_at__lt=end_date
            ).values('ip_address').distinct().count()

            order_details = []
            for order in orders:
                original_cart_total = sum(float(item.sale_price * item.quantity) for item in order.items.all())
                coupon_discount = 0.0
                if order.coupon_code:
                    try:
                        coupon = Coupon.objects.get(code=order.coupon_code, is_used=True)
                        first_item_price = order.items.first().sale_price if order.items.exists() else 0
                        coupon_discount = float(min(coupon.value, first_item_price))
                    except Coupon.DoesNotExist:
                        logger.warning(f"Coupon {order.coupon_code} not found for order {order.id}")

                order_details.append({
                    'order_id': order.id,
                    'original_cart_total': float(original_cart_total),
                    'cart_total': float(order.cart_total),
                    'delivery_fee': float(order.delivery_fee),
                    'total_price': float(order.total_price),
                    'coupon_code': order.coupon_code,
                    'coupon_discount': coupon_discount,
                    'items': [
                        {
                            'product_name': item.product_variant.product.name,
                            'quantity': item.quantity,
                            'sale_price': float(item.sale_price),
                            'total_sale_price': float(item.sale_price * item.quantity),
                        }
                        for item in order.items.all()
                    ]
                })

            report_data = {
                'year': year,
                'month': month,
                'total_orders': total_orders,
                'total_sales': float(total_sales),
                'total_sales_with_delivery': float(total_sales_with_delivery),
                'total_profit': float(total_profit),
                'total_visitors': unique_visitors,  # إضافة عدد الزوار
                'products': [
                    {
                        'product_name': item['product_variant__product__name'],
                        'quantity_sold': item['total_quantity'],
                        'total_sale_price': float(item['total_sale_price']),
                        'total_purchase_price': float(item['total_purchase_price']),
                        'total_profit': float(item['total_profit'])
                    }
                    for item in product_sales
                ],
                'orders': order_details
            }

            return Response(report_data, status=status.HTTP_200_OK)

        except ValueError:
            return Response(
                {"message": "Invalid year or month format."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"message": "Failed to generate report", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        


class TrackVisitView(APIView):
    def post(self, request):
        try:
            ip_address = request.META.get('REMOTE_ADDR')
            page_url = request.data.get('page_url', '')

            if not ip_address:
                return Response({"error": "Unable to detect IP address."}, status=status.HTTP_400_BAD_REQUEST)

            VisitorLog.objects.create(
                ip_address=ip_address,
                page_url=page_url
            )
            return Response({"message": "Visit tracked successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        



class LiveVisitorsView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def get(self, request):
        try:
            # تحديد النطاق الزمني (آخر 5 دقائق)
            time_threshold = timezone.now() - timedelta(minutes=5)
            
            # حساب عدد الزوار الفريدين بناءً على ip_address
            live_visitors = VisitorLog.objects.filter(
                visited_at__gte=time_threshold
            ).values('ip_address').distinct().count()

            return Response(
                {"live_visitors": live_visitors},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"message": "Failed to fetch live visitors", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        



class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        try:
            user = CustomUser.objects.get(email=email)
            token = str(uuid.uuid4())  # Generate UUID token
            PasswordResetToken.objects.create(
                user=user,
                token=token,  # Store the UUID token
                expires_at=timezone.now() + timedelta(hours=24)
            )
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}/"
            send_mail(
                'Password Reset Request',
                f'Click here to reset your password: {reset_link}\nThis link will expire in 24 hours.',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response(
                {'message': 'Password reset email sent successfully.'},
                status=status.HTTP_200_OK
            )
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'No account found with that email address.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        

class PasswordResetConfirmView(APIView):
    def post(self, request, token):
        try:
            password = request.data.get('password')
            reset_token = PasswordResetToken.objects.get(
                token=token,
                expires_at__gt=timezone.now()
            )
            user = reset_token.user
            user.set_password(password)
            user.save()
            # Delete used token
            reset_token.delete()
            # Delete all expired tokens
            PasswordResetToken.objects.filter(expires_at__lte=timezone.now()).delete()
            return Response(
                {'message': 'Password reset successfully.'},
                status=status.HTTP_200_OK
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )