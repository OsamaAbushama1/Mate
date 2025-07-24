import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import axios from "axios";
import styles from "./UserPoints.module.css";

function UserPoints({ apiUrl }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [points, setPoints] = useState(0);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const POINTS_PER_ORDER = 70;

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

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${apiUrl}user/profile/`, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      setPoints(response.data.points || 0);
    } catch (err) {
      setError("Failed to fetch points. Please try again.");
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${apiUrl}user/coupons/`, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      setCoupons(response.data || []);
    } catch (err) {
      setError("Failed to fetch coupons. Please try again.");
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${apiUrl}user/orders/`, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      const sortedOrders = (response.data || [])
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((order, index) => ({
          ...order,
          userOrderNumber: index + 1,
        }));
      setOrders(sortedOrders);
    } catch (err) {
      setError("Failed to fetch orders. Please try again.");
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      setLoading(true);
      Promise.all([fetchUserProfile(), fetchCoupons(), fetchOrders()]).finally(
        () => setLoading(false)
      );
    }
  }, [isAuthenticated, user, apiUrl]);

  if (isAuthLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>Please log in to view your points.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Points</h1>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.pointsSummary}>
        <h2 className={styles.summaryTitle}>Total Points</h2>
        <p className={styles.pointsValue}>{points} Points</p>
        <p className={styles.pointsInfo}>
          You earn {POINTS_PER_ORDER} points for each order placed.
          {points >= 500 && (
            <span>
              {" "}
              You've earned a coupon! Check your available coupons below.
            </span>
          )}
        </p>
      </div>

      {coupons.length > 0 && (
        <div className={styles.couponsSection}>
          <h2 className={styles.historyTitle}>Available Coupons</h2>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <table className={`table table-bordered ${styles.table}`}>
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Value</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.code}>
                    <td>{coupon.code}</td>
                    <td>{coupon.value} EGP</td>
                    <td>{new Date(coupon.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className={styles.orderHistory}>
        <h2 className={styles.historyTitle}>Order History</h2>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : orders.length === 0 ? (
          <div className={styles.noOrders}>No orders found.</div>
        ) : (
          <>
            <table className={`table table-bordered ${styles.table}`}>
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Points Earned</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.userOrderNumber}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>{order.status}</td>
                    <td>{POINTS_PER_ORDER} Points</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.mobileOrders}>
              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div>
                    <strong>Order Number:</strong> {order.userOrderNumber}
                  </div>
                  <div>
                    <strong>Date:</strong>{" "}
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Status:</strong> {order.status}
                  </div>
                  <div>
                    <strong>Points:</strong> {POINTS_PER_ORDER} Points
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserPoints;
