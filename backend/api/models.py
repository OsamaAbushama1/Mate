from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(unique=True)
    last_activity = models.DateTimeField(null=True, blank=True, default=timezone.now)
    points = models.PositiveIntegerField(default=0)



class PasswordResetToken(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        return self.expires_at > timezone.now()

class Coupon(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='coupons')
    code = models.CharField(max_length=20, unique=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=500)  
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.code} - {self.user.email}"


class Product(models.Model):
    name = models.CharField(max_length=255)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2) 
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    color = models.CharField(max_length=50)
    size = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()

    class Meta:
        unique_together = ('product', 'color', 'size')

    def __str__(self):
        return f"{self.product.name} - {self.color}, {self.size} ({self.quantity})"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    color = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"Image of {self.product.name} ({self.color or 'No color'})"
    



class Order(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('delivered', 'Delivered'),
            ('cancelled', 'Cancelled')
        ],
        default='pending'
    )
    cart_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  
    shipping_info = models.JSONField(default=dict)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE,default=1)
    quantity = models.PositiveIntegerField(default=1)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)  
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)   

    def __str__(self):
        return f"{self.product_variant.product.name} ({self.product_variant.color}, {self.product_variant.size}) x{self.quantity}"


class Report(models.Model):
    date = models.DateField(unique=True,null=True)
    total_orders = models.IntegerField(default=0)
    total_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_profit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Report for {self.date}"
    



class VisitorLog(models.Model):
    visited_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.CharField(max_length=45, blank=True, null=True)  # يدعم IPv4 وIPv6
    page_url = models.CharField(max_length=255, blank=True, null=True)   # الصفحة التي تم زيارتها

    class Meta:
        indexes = [
            models.Index(fields=['visited_at']),
            models.Index(fields=['ip_address']),
        ]

    def __str__(self):
        return f"Visit at {self.visited_at} from {self.ip_address}"
