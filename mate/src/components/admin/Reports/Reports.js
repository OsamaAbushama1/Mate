import { useContext, useState, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./Reports.module.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Reports({ apiUrl = "http://localhost:8000/api/" }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);

  const [reportType, setReportType] = useState(
    localStorage.getItem("reportType") || "daily"
  );
  const [date, setDate] = useState(
    localStorage.getItem("reportDate") || new Date().toISOString().split("T")[0]
  );
  const [year, setYear] = useState(
    parseInt(localStorage.getItem("reportYear")) || new Date().getFullYear()
  );
  const [month, setMonth] = useState(
    parseInt(localStorage.getItem("reportMonth")) || new Date().getMonth() + 1
  );
  const [reportData, setReportData] = useState(null);
  const [previousSales, setPreviousSales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [showReport, setShowReport] = useState(false);
  const [liveVisitors, setLiveVisitors] = useState(null);
  const [liveVisitorsLoading, setLiveVisitorsLoading] = useState(false);
  const [liveVisitorsError, setLiveVisitorsError] = useState(null);

  const isAdmin = user && (user.is_staff || user.is_superuser);

  useEffect(() => {
    localStorage.setItem("reportType", reportType);
    localStorage.setItem("reportDate", date);
    localStorage.setItem("reportYear", year);
    localStorage.setItem("reportMonth", month);
  }, [reportType, date, year, month]);

  useEffect(() => {
    const fetchLiveVisitors = async () => {
      setLiveVisitorsLoading(true);
      setLiveVisitorsError(null);
      const config = {
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      };

      try {
        const response = await axios.get(`${apiUrl}live-visitors/`, config);
        setLiveVisitors(response.data.live_visitors);
      } catch (err) {
        setLiveVisitorsError(
          err.response?.data?.message || "Failed to fetch live visitors."
        );
        console.error("Error fetching live visitors:", err);
      } finally {
        setLiveVisitorsLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchLiveVisitors();
    }

    const interval = setInterval(() => {
      if (isAuthenticated && isAdmin) {
        fetchLiveVisitors();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin, apiUrl]);

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

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    const config = {
      withCredentials: true,
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    };

    try {
      let response;
      if (reportType === "daily") {
        response = await axios.get(`${apiUrl}reports/daily/`, {
          params: { date },
          ...config,
        });
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevResponse = await axios.get(`${apiUrl}reports/daily/`, {
          params: { date: prevDate.toISOString().split("T")[0] },
          ...config,
        });
        setPreviousSales(prevResponse.data.total_sales);
      } else {
        response = await axios.get(`${apiUrl}reports/monthly/`, {
          params: { year, month },
          ...config,
        });
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevResponse = await axios.get(`${apiUrl}reports/monthly/`, {
          params: { year: prevYear, month: prevMonth },
          ...config,
        });
        setPreviousSales(prevResponse.data.total_sales);
      }
      setReportData(response.data);
      setShowReport(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch report.");
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLastMonth = () => {
    setMonth((prev) => (prev === 1 ? 12 : prev - 1));
    if (month === 1) {
      setYear((prev) => prev - 1);
    }
    setShowReport(false);
  };

  const handlePrint = () => {
    if (!reportData) {
      setError("No report data available to export.");
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summaryData = [
        ["Report Type", reportType === "daily" ? "Daily" : "Monthly"],
        [
          reportType === "daily" ? "Date" : "Year/Month",
          reportType === "daily"
            ? reportData.date
            : `${reportData.year}/${reportData.month}`,
        ],
        ["Total Orders", reportData.total_orders || 0],
        ["Total Sales", `EGP ${reportData.total_sales?.toFixed(2) || "0.00"}`],
        [
          "Total Sales with Delivery",
          `EGP ${reportData.total_sales_with_delivery?.toFixed(2) || "0.00"}`,
        ],
        [
          "Total Profit",
          `EGP ${reportData.total_profit?.toFixed(2) || "0.00"}`,
        ],
        ["Total Visitors", reportData.total_visitors || 0],
        [
          "Conversion Rate",
          reportData.total_visitors && reportData.total_orders
            ? `${(
                (reportData.total_orders / reportData.total_visitors) *
                100
              ).toFixed(2)}%`
            : "N/A",
        ],
        [
          "Sales Percentage Difference",
          previousSales && previousSales !== 0
            ? `${(
                ((reportData.total_sales - previousSales) / previousSales) *
                100
              ).toFixed(2)}%`
            : "N/A",
        ],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [{ wch: 20 }, { wch: 20 }];
      for (let i = 0; i < 2; i++) {
        summarySheet[XLSX.utils.encode_cell({ r: 0, c: i })].s = {
          font: { bold: true },
        };
      }
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // 2. Orders Sheet
      const ordersHeaders = [
        "Order ID",
        "Original Subtotal (EGP)",
        "Subtotal (EGP)",
        "Delivery Fee (EGP)",
        "Coupon",
        "Discount (EGP)",
        "Total Paid (EGP)",
        "Items",
      ];
      const ordersData = reportData.orders.map((order) => [
        order.order_id,
        order.original_cart_total?.toFixed(2) || "0.00",
        order.cart_total?.toFixed(2) || "0.00",
        order.delivery_fee?.toFixed(2) || "0.00",
        order.coupon_code || "-",
        order.coupon_code ? order.coupon_discount?.toFixed(2) || "0.00" : "-",
        order.total_price?.toFixed(2) || "0.00",
        order.items
          ?.map(
            (item) =>
              `${item.product_name} (Qty: ${item.quantity}, Price: EGP ${
                item.sale_price?.toFixed(2) || "0.00"
              }, Total: EGP ${item.total_sale_price?.toFixed(2) || "0.00"})`
          )
          .join("; ") || "-",
      ]);

      const ordersSheet = XLSX.utils.aoa_to_sheet([
        ordersHeaders,
        ...ordersData,
      ]);
      ordersSheet["!cols"] = [
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 40 },
      ];
      for (let i = 0; i < ordersHeaders.length; i++) {
        ordersSheet[XLSX.utils.encode_cell({ r: 0, c: i })].s = {
          font: { bold: true },
        };
      }
      XLSX.utils.book_append_sheet(workbook, ordersSheet, "Orders");

      // 3. Sold Products Sheet
      const productsHeaders = [
        "Product Name",
        "Quantity Sold",
        "Purchase Price (EGP)",
        "Sale Price (EGP)",
        "Profit (EGP)",
      ];
      const productsData = reportData.products.map((product) => [
        product.product_name || "N/A",
        product.quantity_sold || 0,
        `EGP ${product.total_purchase_price?.toFixed(2) || "0.00"}`,
        `EGP ${product.total_sale_price?.toFixed(2) || "0.00"}`,
        `EGP ${product.total_profit?.toFixed(2) || "0.00"}`,
      ]);

      const productsSheet = XLSX.utils.aoa_to_sheet([
        productsHeaders,
        ...productsData,
      ]);
      productsSheet["!cols"] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
      ];
      for (let i = 0; i < productsHeaders.length; i++) {
        productsSheet[XLSX.utils.encode_cell({ r: 0, c: i })].s = {
          font: { bold: true },
        };
      }
      XLSX.utils.book_append_sheet(workbook, productsSheet, "Sold Products");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const fileName = `Report_${
        reportType === "daily"
          ? reportData.date
          : `${reportData.year}_${reportData.month}`
      }.xlsx`;
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      FileSaver.saveAs(data, fileName);
    } catch (err) {
      setError("Failed to export report to Excel: " + err.message);
      console.error("Error exporting to Excel:", err);
    }
  };

  const salesPercentageDiff =
    previousSales !== null && reportData && previousSales !== 0
      ? (
          ((reportData.total_sales - previousSales) / previousSales) *
          100
        ).toFixed(2)
      : null;

  const conversionRate = reportData?.total_visitors
    ? ((reportData.total_orders / reportData.total_visitors) * 100).toFixed(2)
    : null;

  const chartData = reportData
    ? {
        labels: ["Total Sales", "Total Profit", "Total Visitors"],
        datasets: [
          {
            label: "Report Metrics",
            data: [
              reportData.total_sales,
              reportData.total_profit,
              reportData.total_visitors || 0,
            ],
            backgroundColor: ["#36A2EB", "#FF6384", "#4BC0C0"],
            borderColor: ["#36A2EB", "#FF6384", "#4BC0C0"],
            borderWidth: 2,
            fill: false,
            tension: 0.4,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: { size: 14, family: "'Inter', sans-serif" },
          color: "#1e293b",
        },
      },
      title: {
        display: true,
        text:
          reportType === "daily"
            ? `Daily Report for ${reportData?.date}`
            : `Monthly Report for ${reportData?.year}/${reportData?.month}`,
        font: { size: 18, weight: "600", family: "'Inter', sans-serif" },
        color: "#1e293b",
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { family: "'Inter', sans-serif" },
        bodyFont: { family: "'Inter', sans-serif" },
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            if (label === "Total Visitors") {
              return `${label}: ${context.raw}`;
            }
            return `${label}: EGP ${context.raw.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Value",
          font: { size: 14, family: "'Inter', sans-serif" },
          color: "#334155",
        },
        ticks: {
          font: { size: 12, family: "'Inter', sans-serif" },
          color: "#334155",
          callback: function (value, index, values) {
            if (reportData && index === 2) {
              return value;
            }
            return `EGP ${value}`;
          },
        },
      },
      x: {
        title: {
          display: true,
          text: "Metrics",
          font: { size: 14, family: "'Inter', sans-serif" },
          color: "#334155",
        },
        ticks: {
          font: { size: 12, family: "'Inter', sans-serif" },
          color: "#334155",
        },
      },
    },
  };

  if (isAuthLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.message}>
        You must be logged in to access this page.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.message}>
        You do not have permission to access this page.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Reports Management</h1>
      {error && <div className={styles["error-message"]}>{error}</div>}
      {liveVisitorsError && (
        <div className={styles["error-message"]}>{liveVisitorsError}</div>
      )}

      <div className={styles["live-visitors-container"]}>
        <div className={styles["y-card"]}>
          <p className={styles["summary-label"]}>Live Visitors</p>
          <p className={styles["value"]}>
            {liveVisitorsLoading
              ? "Loading..."
              : liveVisitors !== null
              ? liveVisitors
              : "N/A"}
          </p>
        </div>
      </div>

      <div className={styles["filter-group"]}>
        <div className={styles["input-group"]}>
          <label className={styles.label}>Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setShowReport(false);
            }}
            className={styles.input}
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {reportType === "daily" ? (
          <div className={styles["input-group"]}>
            <label className={styles.label}>Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setShowReport(false);
              }}
              className={styles.input}
            />
          </div>
        ) : (
          <>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Year:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => {
                  setYear(parseInt(e.target.value));
                  setShowReport(false);
                }}
                className={styles.input}
                min="2000"
                max={new Date().getFullYear()}
              />
            </div>
            <div className={styles["input-group"]}>
              <label className={styles.label}>Month:</label>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(parseInt(e.target.value));
                  setShowReport(false);
                }}
                className={styles.input}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en-US", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleLastMonth} className={styles["submit"]}>
              Last Month
            </button>
          </>
        )}
      </div>

      <button
        onClick={fetchReport}
        className={styles["submit-button"]}
        disabled={loading}
      >
        {loading ? "Loading..." : "View Report"}
      </button>

      {showReport && reportData && (
        <div className={styles["report-container"]}>
          <div className={styles["report-header"]}>
            <h2 className={styles["section-title"]}>
              {reportType === "daily"
                ? `Daily Report for ${reportData.date}`
                : `Monthly Report for ${reportData.year}/${reportData.month}`}
            </h2>
            {(reportData.orders.length > 0 ||
              reportData.products.length > 0) && (
              <button onClick={handlePrint} className={styles["submit-button"]}>
                Export to Excel
              </button>
            )}
          </div>

          <div className={styles["filter-group"]}>
            <label className={styles.label}>View Mode:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className={styles.input}
            >
              <option value="table">Table</option>
              <option value="chart">Chart</option>
            </select>
          </div>

          {viewMode === "table" ? (
            <div className={styles["report-summary"]}>
              <div className={styles["summary-card"]}>
                <p className={styles["summary-label"]}>Total Orders</p>
                <p className={styles["summary-value"]}>
                  {reportData.total_orders}
                </p>
              </div>
              <div className={styles["summary-card"]}>
                <p className={styles["summary-label"]}>Total Sales</p>
                <p className={styles["summary-value"]}>
                  EGP {reportData.total_sales.toFixed(2)}
                  {salesPercentageDiff !== null &&
                  !isNaN(salesPercentageDiff) &&
                  isFinite(salesPercentageDiff) ? (
                    <span className={styles["percentage-diff"]}>
                      {` (${
                        salesPercentageDiff > 0 ? "+" : ""
                      }${salesPercentageDiff}%)`}
                    </span>
                  ) : (
                    <span className={styles["percentage-diff"]}>
                      (No previous sales)
                    </span>
                  )}
                </p>
              </div>
              <div className={styles["summary-card"]}>
                <p className={styles["summary-label"]}>
                  Total Sales with Delivery
                </p>
                <p className={styles["summary-value"]}>
                  EGP {reportData.total_sales_with_delivery.toFixed(2)}
                </p>
              </div>
              <div className={styles["summary-card"]}>
                <p className={styles["summary-label"]}>Total Profit</p>
                <p className={styles["summary-value"]}>
                  EGP {reportData.total_profit.toFixed(2)}
                </p>
              </div>
              <div className={styles["summary-card"]}>
                <p className={styles["summary-label"]}>Total Visitors</p>
                <p className={styles["summary-value"]}>
                  {reportData.total_visitors || "N/A"}
                </p>
              </div>
              <div className={styles["summary-card"]}>
                <p className={styles["summary-label"]}>Conversion Rate</p>
                <p className={styles["summary-value"]}>
                  {conversionRate ? `${conversionRate}%` : "N/A"}
                </p>
              </div>
            </div>
          ) : (
            <div className={styles["chart-container"]}>
              <Line
                style={{ width: 225 }}
                data={chartData}
                options={chartOptions}
              />
            </div>
          )}

          <h3 className={styles["section-title"]}>Order Details</h3>
          {reportData.orders.length === 0 ? (
            <div className={styles.message}>No orders for this period.</div>
          ) : (
            <div className={styles["order-grid"]}>
              {reportData.orders.map((order) => (
                <div key={order.order_id} className={styles["order-card"]}>
                  <div className={styles["order-header"]}>
                    <h4>Order ID: {order.order_id}</h4>
                  </div>
                  <div className={styles["order-content"]}>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>
                        Original Subtotal:
                      </span>
                      <span>EGP {order.original_cart_total.toFixed(2)}</span>
                    </div>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>Subtotal:</span>
                      <span>EGP {order.cart_total.toFixed(2)}</span>
                    </div>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>
                        Delivery Fee:
                      </span>
                      <span>EGP {order.delivery_fee.toFixed(2)}</span>
                    </div>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>Coupon:</span>
                      <span>{order.coupon_code || "-"}</span>
                    </div>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>Discount:</span>
                      <span>
                        {order.coupon_code
                          ? `-EGP ${order.coupon_discount.toFixed(2)}`
                          : "-"}
                      </span>
                    </div>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>
                        Total Paid:
                      </span>
                      <span>EGP {order.total_price.toFixed(2)}</span>
                    </div>
                    <div className={styles["order-detail"]}>
                      <span className={styles["detail-label"]}>Items:</span>
                      <ul className={styles["items-list"]}>
                        {order.items.map((item, index) => (
                          <li key={index}>
                            {item.product_name} (Qty: {item.quantity}, Price:
                            EGP {item.sale_price.toFixed(2)}, Total: EGP{" "}
                            {item.total_sale_price.toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className={styles["section-title"]}>Sold Products Summary</h3>
          {reportData.products.length === 0 ? (
            <div className={styles.message}>No sales for this period.</div>
          ) : (
            <div className={styles["product-grid"]}>
              {reportData.products.map((product, index) => (
                <div key={index} className={styles["product-card"]}>
                  <div className={styles["product-header"]}>
                    <h4>{product.product_name}</h4>
                  </div>
                  <div className={styles["product-content"]}>
                    <div className={styles["product-detail"]}>
                      <span className={styles["detail-label"]}>
                        Quantity Sold:
                      </span>
                      <span>{product.quantity_sold}</span>
                    </div>
                    <div className={styles["product-detail"]}>
                      <span className={styles["detail-label"]}>
                        Purchase Price:
                      </span>
                      <span>EGP {product.total_purchase_price.toFixed(2)}</span>
                    </div>
                    <div className={styles["product-detail"]}>
                      <span className={styles["detail-label"]}>
                        Sale Price:
                      </span>
                      <span>EGP {product.total_sale_price.toFixed(2)}</span>
                    </div>
                    <div className={styles["product-detail"]}>
                      <span className={styles["detail-label"]}>Profit:</span>
                      <span>EGP {product.total_profit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
