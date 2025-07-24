import { useContext, useState, useEffect } from "react";
import { Link, useLocation, Routes, Route } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import axios from "axios";
import styles from "./Dashboard.module.css";
import ProductManager from "../ProductManager/ProductManager";
import OrderManager from "../OrderManager/OrderManager";
import UserManager from "../UserManager/UserManager";
import PointsManager from "../PointsManager/PointsManager";
import Reports from "../Reports/Reports";

function Dashboard({ apiUrl = "http://localhost:8000/api/" }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const location = useLocation();

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
    const fetchData = async () => {
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
        const [
          usersResponse,
          ordersResponse,
          productsResponse,
          reportsResponse,
        ] = await Promise.all([
          axios.get(`${apiUrl}users/`, config).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}orders/`, config).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}products/`, config).catch(() => ({ data: [] })),
          axios
            .get(`${apiUrl}reports/daily/`, config)
            .catch(() => ({ data: {} })),
        ]);
        setUsers(usersResponse.data || []);
        setOrders(ordersResponse.data || []);
        setProducts(productsResponse.data || []);
        const reportData = reportsResponse.data;
        const reportArray = Array.isArray(reportData)
          ? reportData
          : reportData.date
          ? [reportData]
          : [];
        setReports(
          reportArray.map((report) => ({
            date: report.date,
            total_orders: report.total_orders,
            total_sales: report.total_sales,
            total_profit: report.total_profit,
          })) || []
        );
      } catch (err) {
        setError("Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchData();
    }
  }, [isAuthenticated, isAdmin, apiUrl]);

  const totalStock = products.reduce((sum, product) => {
    const variantsStock = product.variants.reduce(
      (vSum, variant) => vSum + variant.quantity,
      0
    );
    return sum + variantsStock;
  }, 0);
  const lowStockProducts = products.filter((product) => {
    const variantsStock = product.variants.reduce(
      (sum, variant) => sum + variant.quantity,
      0
    );
    return variantsStock < 10;
  }).length;

  const totalSales = reports.reduce(
    (sum, report) => sum + parseFloat(report.total_sales),
    0
  );
  const totalProfit = reports.reduce(
    (sum, report) => sum + parseFloat(report.total_profit || 0),
    0
  );
  const totalOrders = reports.reduce(
    (sum, report) => sum + report.total_orders,
    0
  );
  const recentReports = reports.filter(
    (r) => new Date(r.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  if (isAuthLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          You must be logged in to access this page.
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div
        className={`${styles.sidebar} ${
          !isSidebarExpanded ? styles.collapsed : ""
        }`}
      >
        <button className={styles.toggleButton} onClick={toggleSidebar}>
          <svg
            className={styles.toggleIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isSidebarExpanded ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
            />
          </svg>
        </button>
        <nav className={styles["nav"]}>
          <Link
            to="/admin"
            className={`${styles["nav-link"]} ${
              location.pathname === "/admin" ? styles.active : ""
            }`}
            title="Dashboard"
          >
            <svg
              className={styles["nav-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className={styles["nav-text"]}>Dashboard</span>
          </Link>
          <Link
            to="/admin/users"
            className={`${styles["nav-link"]} ${
              location.pathname === "/admin/users" ? styles.active : ""
            }`}
            title="Users"
          >
            <svg
              className={styles["nav-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span className={styles["nav-text"]}>Users</span>
          </Link>
          <Link
            to="/admin/products"
            className={`${styles["nav-link"]} ${
              location.pathname === "/admin/products" ? styles.active : ""
            }`}
            title="Products"
          >
            <svg
              className={styles["nav-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H8m12 0l-4 4m4-4l-4-4M4 6h16M4 18h16"
              />
            </svg>
            <span className={styles["nav-text"]}>Products</span>
          </Link>
          <Link
            to="/admin/points"
            className={`${styles["nav-link"]} ${
              location.pathname === "/admin/points" ? styles.active : ""
            }`}
            title="Points Management"
          >
            <svg
              className={styles["nav-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span className={styles["nav-text"]}>Points</span>
          </Link>
          <Link
            to="/admin/orders"
            className={`${styles["nav-link"]} ${
              location.pathname === "/admin/orders" ? styles.active : ""
            }`}
            title="Orders"
          >
            <svg
              className={styles["nav-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.4 2.4M17 13l2.4 2.4M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z"
              />
            </svg>
            <span className={styles["nav-text"]}>Orders</span>
          </Link>
          <Link
            to="/admin/reports"
            className={`${styles["nav-link"]} ${
              location.pathname === "/admin/reports" ? styles.active : ""
            }`}
            title="Reports"
          >
            <svg
              className={styles["nav-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className={styles["nav-text"]}>Reports</span>
          </Link>
        </nav>
      </div>

      <div className={styles["main-content"]}>
        {location.pathname === "/admin" && (
          <h1 className={styles.title}>Admin Dashboard</h1>
        )}
        {error && <div className={styles["error-message"]}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <div className={styles.grid}>
            <Routes>
              <Route
                path="/"
                element={
                  <div className={styles.grid}>
                    <div className={styles.card}>
                      <h2 className={styles["card-title"]}>Users Overview</h2>
                      <div className={styles["card-content"]}>
                        <p>Total Users: {users.length}</p>
                        <p>
                          Active Users:{" "}
                          {users.filter((u) => u.is_active ?? true).length}
                        </p>
                        <p>
                          Admins:{" "}
                          {
                            users.filter((u) => u.is_staff || u.is_superuser)
                              .length
                          }
                        </p>
                      </div>
                    </div>

                    <div className={styles.card}>
                      <h2 className={styles["card-title"]}>
                        Products Overview
                      </h2>
                      <div className={styles["card-content"]}>
                        <p>Total Products: {products.length}</p>
                        <p>Total Stock: {totalStock}</p>
                        <p>Low Stock Products: {lowStockProducts}</p>
                      </div>
                    </div>

                    <div className={styles.card}>
                      <h2 className={styles["card-title"]}>Reports Overview</h2>
                      <div className={styles["card-content"]}>
                        <p>Total Sales (All Time): ${totalSales.toFixed(2)}</p>
                        <p>
                          Total Profit (All Time): ${totalProfit.toFixed(2)}
                        </p>
                        <p>Total Orders (All Time): {totalOrders}</p>
                        <p>Reports (Last 7 Days): {recentReports}</p>
                      </div>
                    </div>

                    <div className={styles.card}>
                      <h2 className={styles["card-title"]}>Orders Overview</h2>
                      <div className={styles["card-content"]}>
                        <p>Total Orders: {orders.length}</p>
                        <p>
                          Pending:{" "}
                          {orders.filter((o) => o.status === "pending").length}
                        </p>
                        <p>
                          Delivered:{" "}
                          {
                            orders.filter((o) => o.status === "delivered")
                              .length
                          }
                        </p>
                      </div>
                    </div>

                    <div className={styles.card}>
                      <h2 className={styles["card-title"]}>Quick Actions</h2>
                      <div className={styles["card-content"]}>
                        <Link
                          to="/admin/products"
                          className={styles["action-button"]}
                        >
                          Manage Products
                        </Link>
                        <Link
                          to="/admin/orders"
                          className={styles["action-button"]}
                        >
                          Manage Orders
                        </Link>
                        <Link
                          to="/admin/reports"
                          className={styles["action-button"]}
                        >
                          View Reports
                        </Link>
                        <Link
                          to="/admin/users"
                          className={styles["action-button"]}
                        >
                          Manage Users
                        </Link>
                      </div>
                    </div>
                  </div>
                }
              />
              <Route
                path="/products"
                element={<ProductManager apiUrl={apiUrl} />}
              />
              <Route
                path="/orders"
                element={<OrderManager apiUrl={apiUrl} />}
              />
              <Route path="/reports" element={<Reports apiUrl={apiUrl} />} />
              <Route path="/users" element={<UserManager apiUrl={apiUrl} />} />
              <Route
                path="/points"
                element={<PointsManager apiUrl={apiUrl} />}
              />
            </Routes>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
