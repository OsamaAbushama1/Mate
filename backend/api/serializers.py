from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Product, ProductVariant, ProductImage,CustomUser,Order,Report,OrderItem,Coupon
import logging
import json
import uuid
from django.utils import timezone
from decimal import Decimal

logger = logging.getLogger(__name__)

User = get_user_model()


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['code', 'value', 'created_at', 'is_used', 'used_at']


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    fullName = serializers.CharField(source="get_full_name", read_only=True)
    coupons = CouponSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'phone_number', 'address', 'password', 'points',
            'fullName', 'is_staff', 'is_superuser', 'coupons'
        ]
        read_only_fields = ['id', 'fullName', 'is_staff', 'is_superuser', 'coupons']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'phone_number': {'required': True},
            'address': {'required': True},
        }

    def create(self, validated_data):
        try:
            user = User.objects.create_user(
                username=validated_data['email'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                phone_number=validated_data.get('phone_number', ''),
                address=validated_data.get('address', '')
            )
            return user
        except Exception as e:
            raise serializers.ValidationError(f"Failed: {str(e)}")

    def validate_email(self, value):
        if self.instance and self.instance.email == value:
            return value
        if CustomUser.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Email Already Used")
        return value

    def validate_phone_number(self, value):
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Phone Number Already Used")
        return value


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['color', 'size', 'quantity']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['image', 'color']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request:
                ret['image'] = request.build_absolute_uri(instance.image.url)
            else:
                ret['image'] = instance.image.url
        return ret


class ProductSerializer(serializers.ModelSerializer):
    purchase_price = serializers.FloatField()
    sale_price = serializers.FloatField()
    images = ProductImageSerializer(many=True, read_only=False, required=False)
    variants = ProductVariantSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ['id', 'name', 'purchase_price', 'sale_price', 'category', 'images', 'variants']
        read_only_fields = ['id']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['images'] = ProductImageSerializer(instance.images.all(), many=True, context=self.context).data
        ret['variants'] = ProductVariantSerializer(instance.variants.all(), many=True).data
        return ret

    def validate_price(self, data):
        if data.get('purchase_price', 0) <= 0:
            raise serializers.ValidationError({"purchase_price": "Purchase price must be greater than zero."})
        if data.get('sale_price', 0) <= 0:
            raise serializers.ValidationError({"sale_price": "Sale price must be greater than zero."})
        if data.get('sale_price', 0) < data.get('purchase_price', 0):
            raise serializers.ValidationError({"sale_price": "Sale price must be greater than or equal to purchase price."})
        return data

    def create(self, validated_data):
        images_data = self.context['request'].FILES.getlist('images')
        colors_data = self.context['request'].POST.getlist('image_colors', [])
        variants_data = self.context['request'].POST.getlist('variants[]')

        validated_data.pop('images', None)
        validated_data.pop('variants', None)
        product = Product.objects.create(**validated_data)

        for i, image_data in enumerate(images_data):
            color = colors_data[i] if i < len(colors_data) else None
            ProductImage.objects.create(product=product, image=image_data, color=color)

        if variants_data:
            for variant_str in variants_data:
                variant_data = json.loads(variant_str)
                ProductVariant.objects.create(
                    product=product,
                    color=variant_data.get('color'),
                    size=variant_data.get('size'),
                    quantity=variant_data.get('quantity', 0)
                )

        return product

    def update(self, instance, validated_data):
        images_data = self.context['request'].FILES.getlist('images')
        colors_data = self.context['request'].POST.getlist('image_colors', [])
        variants_data = self.context['request'].POST.getlist('variants[]')

        validated_data.pop('images', None)
        validated_data.pop('variants', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if images_data:
            instance.images.all().delete()
            for i, image_data in enumerate(images_data):
                color = colors_data[i] if i < len(colors_data) else None
                ProductImage.objects.create(product=instance, image=image_data, color=color)

        if variants_data:
            instance.variants.all().delete()
            for variant_str in variants_data:
                variant_data = json.loads(variant_str)
                ProductVariant.objects.create(
                    product=instance,
                    color=variant_data.get('color'),
                    size=variant_data.get('size'),
                    quantity=variant_data.get('quantity', 0)
                )

        return instance
    


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(write_only=True, required=True)
    color = serializers.CharField(max_length=50, write_only=True, required=True)
    size = serializers.CharField(max_length=50, write_only=True, required=True)
    product_variant = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all(), required=False)
    sale_price = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = OrderItem
        fields = ['id', 'product_variant', 'product_name', 'color', 'size', 'quantity', 'sale_price']
        read_only_fields = ['id', 'product_variant', 'sale_price']

    def validate(self, data):
        product_name = data.get('product_name')
        color = data.get('color')
        size = data.get('size')
        quantity = data.get('quantity', 1)

        try:
            product = Product.objects.get(name__iexact=product_name)
            product_variant = ProductVariant.objects.get(
                product=product,
                color__iexact=color,
                size__iexact=size
            )
            if quantity > product_variant.quantity:
                raise serializers.ValidationError({
                    "quantity": f"Out of Stock: Only {product_variant.quantity} items available for {product_name} ({color}, {size})."
                })
            data['product_variant'] = product_variant
            data['sale_price'] = product.sale_price
            data['purchase_price'] = product.purchase_price
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product_name": "Product with this name does not exist."})
        except Product.MultipleObjectsReturned:
            raise serializers.ValidationError({"product_name": "Multiple products found with this name. Please be more specific."})
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError({"color": f"No variant found for {product_name} with color {color} and size {size}."})
        except ProductVariant.MultipleObjectsReturned:
            raise serializers.ValidationError({"color": "Multiple variants found for this product, color, and size combination."})

        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['product_name'] = instance.product_variant.product.name
        representation['color'] = instance.product_variant.color
        representation['size'] = instance.product_variant.size
        return representation




class OrderSerializer(serializers.ModelSerializer):
    user_first_name = serializers.CharField(write_only=True, required=False)
    user = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    items = OrderItemSerializer(many=True, required=True)
    cart_total = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    shipping_info = serializers.JSONField(required=False)
    coupon_code = serializers.CharField(write_only=True, required=False)
    applied_coupon = serializers.CharField(source='coupon_code', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_first_name', 'items', 'status',
            'cart_total', 'delivery_fee', 'total_price', 'shipping_info',
            'created_at', 'updated_at', 'coupon_code', 'applied_coupon'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'applied_coupon']

    def validate(self, data):
        logger.info(f"Validating order data: {data}")
        if not self.instance:
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError({"user": "Authentication required to create an order."})
            data['user'] = request.user

        if 'user_first_name' in data:
            first_name = data.get('user_first_name')
            try:
                user = CustomUser.objects.get(first_name__iexact=first_name)
                data['user'] = user
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError({"user_first_name": "User with this first name does not exist."})
            except CustomUser.MultipleObjectsReturned:
                raise serializers.ValidationError({"user_first_name": "Multiple users found with this first name."})

        if not self.instance and not data.get('items'):
            raise serializers.ValidationError({"items": "At least one item is required."})

        if not self.instance:
            shipping_info = data.get('shipping_info', {})
            required_fields = ['fullName', 'address', 'phone', 'governorate']
            for field in required_fields:
                if field not in shipping_info or not shipping_info[field]:
                    raise serializers.ValidationError({field: f"{field} is required in shipping_info."})

            governorate = shipping_info.get('governorate')
            delivery_fee = data.get('delivery_fee')
            if governorate == 'Cairo' and delivery_fee != 40:
                raise serializers.ValidationError({"delivery_fee": "Delivery fee for Cairo must be 40 EGP."})
            elif governorate == 'Alexandria' and delivery_fee != 50:
                raise serializers.ValidationError({"delivery_fee": "Delivery fee for Alexandria must be 50 EGP."})
            elif governorate not in ['Cairo', 'Alexandria'] and delivery_fee != 70:
                raise serializers.ValidationError({"delivery_fee": "Delivery fee for other governorates must be 70 EGP."})

            coupon_code = data.get('coupon_code')
            coupon_discount = Decimal('0.00')
            if coupon_code:
                try:
                    coupon = Coupon.objects.get(
                        code=coupon_code, user=data['user'], is_used=False
                    )
                    coupon_discount = coupon.value
                except Coupon.DoesNotExist:
                    raise serializers.ValidationError({"coupon_code": "Invalid or already used coupon code."})

            cart_total = sum(item.get('sale_price', 0) * item.get('quantity', 1) for item in data.get('items', []))
            data['cart_total'] = cart_total
            if coupon_discount:
                if data.get('items'):
                    item_price = data['items'][0].get('sale_price', 0)
                    coupon_discount = min(Decimal(item_price), coupon_discount)
                    data['cart_total'] = max(Decimal('0.00'), cart_total - coupon_discount)

            if data.get('total_price') != data['cart_total'] + delivery_fee:
                raise serializers.ValidationError({"total_price": "Total price must be cart_total + delivery_fee."})

        return data

    def create(self, validated_data):
        logger.info(f"Creating order with data: {validated_data}")
        items_data = validated_data.pop('items', [])
        validated_data.pop('user_first_name', None)
        input_coupon_code = validated_data.pop('coupon_code', None)
        user = validated_data['user']

        if input_coupon_code:
            validated_data['coupon_code'] = input_coupon_code

        order = Order.objects.create(**validated_data)

        for item_data in items_data:
            product_variant = item_data.pop('product_variant')
            quantity = item_data.get('quantity', 1)
            product_variant.quantity -= quantity
            if product_variant.quantity < 0:
                raise serializers.ValidationError({
                    "quantity": f"Out of Stock: {product_variant.product.name} ({product_variant.color}, {product_variant.size}) has no stock left."
                })
            product_variant.save()

            item_data.pop('product_name', None)
            item_data.pop('color', None)
            item_data.pop('size', None)
            item_data['purchase_price'] = product_variant.product.purchase_price
            OrderItem.objects.create(order=order, product_variant=product_variant, **item_data)

        if input_coupon_code:
            try:
                coupon = Coupon.objects.get(code=input_coupon_code, user=user, is_used=False)
                coupon.is_used = True
                coupon.used_at = timezone.now()
                coupon.save()
            except Coupon.DoesNotExist:
                pass

        return order

    def update(self, instance, validated_data):
        logger.info(f"Updating order {instance.id} with data: {validated_data}")
        items_data = validated_data.pop('items', None)
        validated_data.pop('user_first_name', None)
        validated_data.pop('coupon_code', None)
        new_status = validated_data.get('status', instance.status)
        old_status = instance.status  
        instance.status = new_status
        instance.cart_total = validated_data.get('cart_total', instance.cart_total)
        instance.delivery_fee = validated_data.get('delivery_fee', instance.delivery_fee)
        instance.total_price = validated_data.get('total_price', instance.total_price)
        instance.shipping_info = validated_data.get('shipping_info', instance.shipping_info)
        instance.save()

        user = instance.user
        logger.info(f"Order {instance.id} status changed from {old_status} to {new_status}")

        if new_status == 'delivered' and old_status != 'delivered' and not instance.coupon_code:
            logger.info(f"Awarding 70 points to user {user.id} for order {instance.id}")
            user.points += 70
            user.save()

            if user.points >= 500:
                logger.info(f"Generating coupon for user {user.id} with points {user.points}")
                new_coupon_code = f"OS-{uuid.uuid4().hex[:2].upper()}"
                Coupon.objects.create(user=user, code=new_coupon_code, value=500)
                user.points = 0
                user.save()
        elif old_status == 'delivered' and new_status != 'delivered':
            logger.info(f"Deducting 70 points from user {user.id} for order {instance.id}")
            user.points = max(0, user.points - 70)
            user.save()

        if items_data:
            old_items = {item.id: item for item in instance.items.all()}
            for old_item in old_items.values():
                old_item.product_variant.quantity += old_item.quantity
                old_item.product_variant.save()

            instance.items.all().delete()

            for item_data in items_data:
                product_variant = item_data.pop('product_variant')
                quantity = item_data.get('quantity', 1)

                matching_old_item = None

                for old_item in old_items.values():
                    if (old_item.product_variant.product.name.lower() == item_data.get('product_name', '').lower() and
                        old_item.product_variant.color.lower() == item_data.get('color', '').lower() and
                        old_item.product_variant.size.lower() == item_data.get('size', '').lower()):
                        matching_old_item = old_item
                        break
                
                if not matching_old_item or quantity > matching_old_item.quantity:
                    available_quantity = product_variant.quantity
                    if matching_old_item:
                        available_quantity += matching_old_item.quantity
                    if quantity > available_quantity:
                        raise serializers.ValidationError({
                            "quantity": f"Out of Stock: Only {available_quantity} items available for {product_variant.product.name} ({product_variant.color}, {product_variant.size})."
                        })

                product_variant.quantity -= quantity
                product_variant.save()

                item_data.pop('product_name', None)
                item_data.pop('color', None)
                item_data.pop('size', None)
                item_data['purchase_price'] = product_variant.product.purchase_price
                OrderItem.objects.create(order=instance, product_variant=product_variant, **item_data)

        logger.info(f"Order {instance.id} updated successfully, user points: {user.points}")
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['user_first_name'] = instance.user.first_name
        return representation


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'date', 'total_orders', 'total_sales', 'total_profit', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

