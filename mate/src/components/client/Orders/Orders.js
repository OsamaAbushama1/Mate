import { useContext, useState, useEffect } from "react";
import axios from "axios";
import styles from "./Orders.module.css";
import { AuthContext } from "../../../context/AuthContext";

function Orders({ apiUrl = "http://localhost:8000/api/" }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const isAdmin = user && (user.is_staff || user.is_superuser);

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

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      const config = {
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      };
      try {
        const endpoint = isAdmin ? `${apiUrl}orders/` : `${apiUrl}user/orders/`;
        const response = await axios.get(endpoint, config);
        const processedOrders = isAdmin
          ? response.data
          : (response.data || [])
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              .map((order, index) => ({
                ...order,
                userOrderNumber: index + 1,
              }));
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
      } catch (err) {
        setError("Failed to fetch orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchOrders();
    }
  }, [isAuthenticated, user, isAdmin, apiUrl]);

  useEffect(() => {
    let filtered = orders;
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter(
        (order) =>
          new Date(order.created_at).toISOString().split("T")[0] === dateFilter
      );
    }
    setFilteredOrders(filtered);
  }, [statusFilter, dateFilter, orders]);

  const handleMarkAsDelivered = async (orderId) => {
    if (!isAdmin) {
      setError("Only admins can update order status.");
      return;
    }

    if (!window.confirm("Mark this order as delivered?")) return;

    setLoading(true);
    setError(null);
    const config = {
      withCredentials: true,
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios.patch(
        `${apiUrl}orders/${orderId}/`,
        { status: "delivered" },
        config
      );
      setOrders(
        orders.map((order) => (order.id === orderId ? response.data : order))
      );
      alert("Order marked as delivered!");
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to update order status. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.message}>
        You must be logged in to view orders.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{isAdmin ? "All Orders" : "Your Orders"}</h1>
      {isAdmin && (
        <div className={styles["filter-container"]}>
          <label htmlFor="statusFilter">Filter by Status: </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles["filter-select"]}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
          </select>
          <label htmlFor="dateFilter">Filter by Date: </label>
          <input
            id="dateFilter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={styles["filter-input"]}
          />
        </div>
      )}
      {error && <div className={styles["error-message"]}>{error}</div>}
      {loading && <div className={styles.loading}>Loading orders...</div>}

      {filteredOrders.length === 0 && !loading ? (
        <div className={styles.message}>No orders found.</div>
      ) : (
        <div className={styles["order-grid"]}>
          {filteredOrders.map((order) => (
            <div key={order.id} className={styles["order-card"]}>
              <h3 className={styles["card-title"]}>
                {isAdmin
                  ? `Order #${order.id}`
                  : `Order #${order.userOrderNumber}`}
              </h3>
              <div className={styles["card-content"]}>
                {isAdmin && <p>User: {order.user_first_name || "N/A"}</p>}
                <p>
                  Status:{" "}
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </p>
                <p>Items:</p>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.product_name} ({item.color}, {item.size}, x
                      {item.quantity},{" "}
                      {parseFloat(item.sale_price || 0).toFixed(2)} EGP)
                    </li>
                  ))}
                </ul>
                <p>
                  Subtotal: {parseFloat(order.cart_total || 0).toFixed(2)} EGP
                </p>
                {order.applied_coupon && (
                  <p>
                    Coupon Applied: {order.applied_coupon} (500 EGP discount)
                  </p>
                )}
                <p>
                  Delivery Fee: {parseFloat(order.delivery_fee || 0).toFixed(2)}{" "}
                  EGP
                </p>
                <p>
                  <strong>
                    Total: {parseFloat(order.total_price || 0).toFixed(2)} EGP
                  </strong>
                </p>
                <p>Shipping Information:</p>
                <ul>
                  <li>Name: {order.shipping_info?.fullName || "N/A"}</li>
                  <li>Address: {order.shipping_info?.address || "N/A"}</li>
                  <li>Phone: {order.shipping_info?.phone || "N/A"}</li>
                  <li>
                    Governorate: {order.shipping_info?.governorate || "N/A"}
                  </li>
                </ul>
                <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              {isAdmin && order.status === "pending" && (
                <div className={styles["card-actions"]}>
                  <button
                    className={styles["deliver-button"]}
                    onClick={() => handleMarkAsDelivered(order.id)}
                    disabled={loading}
                  >
                    Mark as Delivered
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
