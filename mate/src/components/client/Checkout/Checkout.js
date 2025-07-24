import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./Checkout.module.css";
import { AuthContext } from "../../../context/AuthContext";

function Checkout() {
  const { isAuthenticated, isAuthLoading } = useContext(AuthContext);
  const [cart, setCart] = useState([]);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    address: "",
    phone: "",
    governorate: "Cairo",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const governorates = [
    "Cairo",
    "Alexandria",
    "Giza",
    "Qalyubia",
    "Beheira",
    "Sharqia",
    "Dakahlia",
    "Kafr El Sheikh",
    "Gharbia",
    "Monufia",
    "Minya",
    "Beni Suef",
    "Fayoum",
    "Assiut",
    "Sohag",
    "Qena",
    "Aswan",
    "Luxor",
    "Red Sea",
    "New Valley",
    "Matruh",
    "North Sinai",
    "South Sinai",
    "Port Said",
    "Suez",
    "Ismailia",
    "Damietta",
  ];

  const getDeliveryFee = (governorate) => {
    if (governorate === "Cairo") return 40;
    if (governorate === "Alexandria") return 50;
    return 70;
  };

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(storedCart);

    if (isAuthenticated && !isAuthLoading) {
      const fetchUserProfile = async () => {
        try {
          const response = await axios.get(
            "http://localhost:8000/api/user/profile/",
            { withCredentials: true }
          );
          const {
            fullName,
            address,
            phone_number: phone,
            governorate,
          } = response.data;
          setShippingInfo((prev) => ({
            ...prev,
            fullName: fullName || "",
            address: address || "",
            phone: phone || "",
            governorate: governorate || "Cairo",
          }));
        } catch (err) {
          setError(
            "Failed to load user profile. Please fill in the details manually."
          );
        }
      };
      fetchUserProfile();
    }
  }, [isAuthenticated, isAuthLoading]);

  const handleCouponChange = (e) => {
    setCouponCode(e.target.value);
    setCouponStatus(null);
    setCouponDiscount(0);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponStatus("invalid");
      setError("Please enter a coupon code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post(
        "http://localhost:8000/api/coupons/validate/",
        { code: couponCode },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
          },
        }
      );
      setCouponStatus("valid");
      setCouponDiscount(500);
      setError(null);
    } catch (err) {
      setCouponStatus("invalid");
      setCouponDiscount(0);
      setError(err.response?.data?.error || "Invalid coupon code.");
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.sale_price || 0) * item.quantity,
    0
  );
  const deliveryFee = getDeliveryFee(shippingInfo.governorate);
  const totalPrice = Math.max(0, cartTotal - couponDiscount + deliveryFee);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (
      !shippingInfo.fullName ||
      !shippingInfo.address ||
      !shippingInfo.phone ||
      !shippingInfo.governorate
    ) {
      setError("Please fill in all shipping details, including governorate.");
      return;
    }

    setLoading(true);
    setError(null);

    const orderData = {
      items: cart.map((item) => ({
        productId: item.id,
        product_name: item.name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        sale_price: parseFloat(item.sale_price || 0),
      })),
      cart_total: cartTotal - couponDiscount,
      delivery_fee: deliveryFee,
      total_price: totalPrice,
      shipping_info: {
        fullName: shippingInfo.fullName,
        address: shippingInfo.address,
        phone: shippingInfo.phone,
        governorate: shippingInfo.governorate,
      },
      status: "pending",
      coupon_code: couponStatus === "valid" ? couponCode : undefined,
    };

    try {
      const response = await axios.post(
        "http://localhost:8000/api/orders/",
        orderData,
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
          },
        }
      );
      localStorage.removeItem("cart");
      setCart([]);
      navigate("/orders", { state: { orderData: response.data } });
    } catch (err) {
      let errorMessage = "Failed to place order. Please try again.";
      if (err.response?.data?.items) {
        const itemErrors = err.response.data.items
          .map((itemError, index) =>
            itemError.quantity
              ? `${orderData.items[index].product_name} (${orderData.items[index].color}, ${orderData.items[index].size}): ${itemError.quantity[0]}`
              : null
          )
          .filter(Boolean)
          .join("; ");
        if (itemErrors) errorMessage = itemErrors;
      } else if (err.response?.data?.quantity) {
        errorMessage = err.response.data.quantity[0];
      } else if (err.response?.data?.coupon_code) {
        errorMessage = err.response.data.coupon_code[0];
        setCouponStatus("invalid");
        setCouponDiscount(0);
      } else if (err.response?.data?.non_field_errors) {
        errorMessage = err.response.data.non_field_errors[0];
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  if (isAuthLoading) {
    return <div className={styles.checkoutContainer}>Loading...</div>;
  }

  return (
    <div className={styles.checkoutContainer}>
      <h1 className={styles.checkoutTitle}>Checkout</h1>
      {cart.length === 0 ? (
        <p className={styles.emptyCart}>
          Your cart is empty. <Link to="/">Continue Shopping</Link>
        </p>
      ) : (
        <div className={styles.checkoutContent}>
          <div className={styles.orderSummary}>
            <h2 className={styles.summaryTitle}>Order Summary</h2>
            {cart.map((item, index) => (
              <div key={index} className={styles.summaryItem}>
                <span>
                  {item.name} (Color: {item.color}, Size: {item.size})
                </span>
                <span>
                  {parseFloat(item.sale_price || 0).toFixed(2)} x{" "}
                  {item.quantity} =
                  {(parseFloat(item.sale_price || 0) * item.quantity).toFixed(
                    2
                  )}{" "}
                  EGP
                </span>
              </div>
            ))}
            <div className={styles.couponSection}>
              <h3>Do you have a coupon?</h3>
              <div className={styles.couponInputGroup}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={handleCouponChange}
                  className={styles.couponInput}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={loading}
                  className={styles.applyCouponButton}
                >
                  {loading ? "Applying..." : "Apply"}
                </button>
              </div>
              {couponStatus === "valid" && (
                <p className={styles.couponSuccess}>
                  Coupon activated! 500 EGP discount applied.
                </p>
              )}
              {couponStatus === "invalid" && (
                <p className={styles.couponError}>Invalid coupon code.</p>
              )}
            </div>
            <div className={styles.total}>
              <div>Subtotal: EGP {cartTotal.toFixed(2)}</div>
              {couponStatus === "valid" && (
                <div>Coupon Discount: -EGP {couponDiscount.toFixed(2)}</div>
              )}
              <div>Delivery Fee: EGP {deliveryFee.toFixed(2)}</div>
              <div>
                <strong>Total: EGP {totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handlePlaceOrder} className={styles.shippingForm}>
            <h2 className={styles.formTitle}>Shipping Information</h2>
            <div className={styles.formGroup}>
              <label htmlFor="fullName" className={styles.label}>
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={shippingInfo.fullName}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.label}>
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={shippingInfo.address}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={shippingInfo.phone}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="governorate" className={styles.label}>
                Governorate
              </label>
              <select
                id="governorate"
                name="governorate"
                value={shippingInfo.governorate}
                onChange={handleInputChange}
                className={styles.input}
                required
              >
                {governorates.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className={styles.placeOrderButton}
              disabled={loading}
            >
              {loading ? "Processing..." : "Place Order"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Checkout;
