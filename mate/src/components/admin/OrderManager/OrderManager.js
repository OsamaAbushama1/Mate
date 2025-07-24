import { useContext, useState, useEffect } from "react";
import axios from "axios";
import styles from "./OrderManager.module.css";
import { AuthContext } from "../../../context/AuthContext";

function OrderManager({ apiUrl = "http://localhost:8000/api/" }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    id: null,
    user_first_name: "",
    items: [
      {
        product_name: "",
        color: "",
        size: "",
        quantity: "1",
        sale_price: "",
        base_sale_price: "",
      },
    ],
    status: "pending",
    originalItems: [],
  });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [variantSuggestions, setVariantSuggestions] = useState({});

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
      const config = {
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      };
      try {
        const response = await axios.get(`${apiUrl}orders/`, config);
        setOrders(response.data);
      } catch (err) {
        setError("Failed to fetch orders.");
      }
    };
    if (isAuthenticated && isAdmin) {
      fetchOrders();
    }
  }, [isAuthenticated, isAdmin, apiUrl]);

  const fetchUserSuggestions = async (query) => {
    if (!query) {
      setUserSuggestions([]);
      return;
    }
    try {
      const response = await axios.get(`${apiUrl}users/search/`, {
        params: { q: query },
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
      setUserSuggestions(response.data);
    } catch (err) {
      alert("Failed to fetch user suggestions");
    }
  };

  const fetchProductSuggestions = async (query) => {
    if (!query) {
      setProductSuggestions([]);
      return;
    }
    try {
      const response = await axios.get(`${apiUrl}products/search/`, {
        params: { q: query },
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
      setProductSuggestions(response.data);
    } catch (err) {
      alert(
        "An error occurred while fetching product suggestions. Please try again."
      );
    }
  };

  const fetchProductVariants = async (productName, itemIndex) => {
    try {
      setVariantLoading(true);
      const response = await axios.get(`${apiUrl}products/search/`, {
        params: { q: productName },
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
      const product = response.data.find(
        (p) => p.name.toLowerCase() === productName.toLowerCase()
      );
      if (product) {
        const variantResponse = await axios.get(
          `${apiUrl}products/variants/search/`,
          {
            params: { product_id: product.id },
            withCredentials: true,
            headers: { "X-CSRFToken": getCookie("csrftoken") },
          }
        );
        setVariantSuggestions((prev) => ({
          ...prev,
          [itemIndex]: variantResponse.data,
        }));
        setProductSuggestions((prev) => {
          if (!prev.some((p) => p.id === product.id)) {
            return [...prev, product];
          }
          return prev;
        });
      }
    } catch (err) {
      alert("Failed to fetch product variants");
    } finally {
      setVariantLoading(false);
    }
  };

  const handleEditOrder = async (order) => {
    setFormMode("edit");
    setVariantLoading(true);
    const items = order.items.map((item) => ({
      product_name: item.product_name || "",
      color: item.color || "",
      size: item.size || "",
      quantity: item.quantity.toString(),
      sale_price: item.sale_price.toString(),
      base_sale_price: (parseFloat(item.sale_price) / item.quantity).toFixed(2),
    }));
    setFormData({
      id: order.id,
      user_first_name: order.user_first_name || "",
      items,
      status: order.status,
      originalItems: items,
    });

    for (let index = 0; index < order.items.length; index++) {
      const item = order.items[index];
      await fetchProductVariants(item.product_name, index);
    }

    setVariantLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    const config = {
      withCredentials: true,
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    };
    try {
      await axios.delete(`${apiUrl}orders/${orderId}/`, config);
      setOrders(orders.filter((o) => o.id !== orderId));
      alert("Order deleted successfully!");
    } catch (err) {
      setError("Failed to delete order.");
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === "product_name") {
      const product = productSuggestions.find((p) => p.name === value);
      if (product) {
        newItems[index].base_sale_price = product.sale_price;
        newItems[index].sale_price = (
          parseFloat(product.sale_price) *
          parseInt(newItems[index].quantity || 1)
        ).toFixed(2);
        newItems[index].color = "";
        newItems[index].size = "";
        fetchProductVariants(value, index);
      } else {
        newItems[index].base_sale_price = "";
        newItems[index].sale_price = "";
        setVariantSuggestions((prev) => ({ ...prev, [index]: [] }));
      }
    } else if (field === "quantity") {
      const baseSalePrice = parseFloat(newItems[index].base_sale_price || 0);
      newItems[index].sale_price = (
        baseSalePrice * parseInt(value || 1)
      ).toFixed(2);
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_name: "",
          color: "",
          size: "",
          quantity: "1",
          sale_price: "",
          base_sale_price: "",
        },
      ],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    setVariantSuggestions((prev) => {
      const newVariants = { ...prev };
      delete newVariants[index];
      return newVariants;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("You do not have permission to manage orders.");
      return;
    }

    setLoading(true);
    setError(null);

    const itemsChanged =
      formMode === "edit" &&
      (formData.items.length !== formData.originalItems.length ||
        formData.items.some((item, index) => {
          const original = formData.originalItems[index] || {};
          return (
            item.product_name !== original.product_name ||
            item.color !== original.color ||
            item.size !== original.size ||
            parseInt(item.quantity) !== parseInt(original.quantity)
          );
        }));

    const data = {
      user_first_name: formData.user_first_name,
      status: formData.status,
    };

    if (itemsChanged || formMode === "add") {
      data.items = formData.items.map((item) => ({
        product_name: item.product_name,
        color: item.color,
        size: item.size,
        quantity: parseInt(item.quantity) || 1,
        sale_price: parseFloat(item.sale_price) || 0,
      }));
    }

    const config = {
      withCredentials: true,
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
    };

    const sendRequest = async () => {
      if (formMode === "edit") {
        return await axios.patch(
          `${apiUrl}orders/${formData.id}/`,
          data,
          config
        );
      } else {
        return await axios.post(`${apiUrl}orders/`, data, config);
      }
    };

    try {
      await sendRequest();
      alert(
        formMode === "edit"
          ? "Order updated successfully!"
          : "Order added successfully!"
      );
      setFormData({
        id: null,
        user_first_name: "",
        items: [
          {
            product_name: "",
            color: "",
            size: "",
            quantity: "1",
            sale_price: "",
            base_sale_price: "",
          },
        ],
        status: "pending",
        originalItems: [],
      });
      setFormMode("add");
      setUserSuggestions([]);
      setProductSuggestions([]);
      setVariantSuggestions({});
      const response = await axios.get(`${apiUrl}orders/`, config);
      setOrders(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        const refreshToken = getCookie("refresh_token");
        if (!refreshToken) {
          setError("No refresh token available. Please log in again.");
          return;
        }
        try {
          const refreshResponse = await axios.post(
            `${apiUrl}token/refresh/`,
            { refresh: refreshToken },
            { withCredentials: true }
          );
          document.cookie = `access_token=${refreshResponse.data.access}; Path=/; SameSite=Lax; Max-Age=3600`;
          await sendRequest();
          alert(
            formMode === "edit"
              ? "Order updated successfully!"
              : "Order added successfully!"
          );
          setFormData({
            id: null,
            user_first_name: "",
            items: [
              {
                product_name: "",
                color: "",
                size: "",
                quantity: "1",
                sale_price: "",
                base_sale_price: "",
              },
            ],
            status: "pending",
            originalItems: [],
          });
          setFormMode("add");
          setUserSuggestions([]);
          setProductSuggestions([]);
          setVariantSuggestions({});
          const response = await axios.get(`${apiUrl}orders/`, config);
          setOrders(response.data);
        } catch (refreshError) {
          setError("Session expired. Please log in again.");
        }
      } else {
        setError(
          err.response?.data?.user_first_name?.[0] ||
            err.response?.data?.items?.[0]?.product_name?.[0] ||
            err.response?.data?.items?.[0]?.color?.[0] ||
            err.response?.data?.items?.[0]?.size?.[0] ||
            err.response?.data?.items?.[0]?.quantity?.[0] ||
            err.response?.data?.message ||
            err.response?.data?.errors ||
            "Failed to save order."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormMode("add");
    setFormData({
      id: null,
      user_first_name: "",
      items: [
        {
          product_name: "",
          color: "",
          size: "",
          quantity: "1",
          sale_price: "",
          base_sale_price: "",
        },
      ],
      status: "pending",
      originalItems: [],
    });
    setUserSuggestions([]);
    setProductSuggestions([]);
    setVariantSuggestions({});
  };

  const getUniqueColors = (index) => {
    const variants = variantSuggestions[index] || [];
    const colors = [...new Set(variants.map((v) => v.color))];
    return colors;
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
      <h1 className={styles.title}>Order Management</h1>
      {error && <div className={styles["error-message"]}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles["form-group"]}>
          <label className={styles.label}>User First Name:</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={formData.user_first_name}
              onChange={(e) => {
                setFormData({ ...formData, user_first_name: e.target.value });
                fetchUserSuggestions(e.target.value);
              }}
              className={styles.input}
              required
              placeholder="Type to search users..."
            />
            {userSuggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {userSuggestions.map((user) => (
                  <li
                    key={user.id}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        user_first_name: user.first_name,
                      });
                      setUserSuggestions([]);
                    }}
                    className={styles["suggestion-item"]}
                  >
                    {user.first_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {formData.items.map((item, index) => (
          <div key={index} className={styles["product-group"]}>
            <div className={styles["form-group"]}>
              <label className={styles.label}>Product Name:</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={item.product_name}
                  onChange={(e) =>
                    handleItemChange(index, "product_name", e.target.value)
                  }
                  onInput={(e) => fetchProductSuggestions(e.target.value)}
                  className={styles.input}
                  required
                  placeholder="Type to search products..."
                />
                {productSuggestions.length > 0 && (
                  <ul className={styles.suggestions}>
                    {productSuggestions.map((product) => (
                      <li
                        key={product.id}
                        onClick={() => {
                          handleItemChange(index, "product_name", product.name);
                          setProductSuggestions([]);
                        }}
                        className={styles["suggestion-item"]}
                      >
                        {product.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className={styles["form-group"]}>
              <label className={styles.label}>Color:</label>
              {variantLoading ? (
                <div>Loading colors...</div>
              ) : (
                <select
                  value={item.color}
                  onChange={(e) =>
                    handleItemChange(index, "color", e.target.value)
                  }
                  className={styles.input}
                  required
                >
                  <option value="">Select Color</option>
                  {getUniqueColors(index).map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className={styles["form-group"]}>
              <label className={styles.label}>Size:</label>
              {variantLoading ? (
                <div>Loading sizes...</div>
              ) : (
                <select
                  value={item.size}
                  onChange={(e) =>
                    handleItemChange(index, "size", e.target.value)
                  }
                  className={styles.input}
                  required
                >
                  <option value="">Select Size</option>
                  {(variantSuggestions[index] || [])
                    .filter((v) => v.color === item.color)
                    .map((variant) => (
                      <option key={variant.id} value={variant.size}>
                        {variant.size}
                      </option>
                    ))}
                </select>
              )}
            </div>
            <div className={styles["form-group"]}>
              <label className={styles.label}>Quantity:</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", e.target.value)
                }
                className={styles.input}
                min="1"
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label className={styles.label}>Total Sale Price:</label>
              <input
                type="number"
                value={item.sale_price}
                readOnly
                className={styles.input}
                step="0.01"
              />
            </div>
            {formData.items.length > 1 && (
              <button
                type="button"
                className={styles["remove-button"]}
                onClick={() => removeItem(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className={styles["add-button"]}
          onClick={addItem}
        >
          Add Product
        </button>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Status:</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className={styles.input}
          >
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className={styles["form-actions"]}>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading || variantLoading}
          >
            {loading
              ? "Saving..."
              : formMode === "edit"
              ? "Update Order"
              : "Add Order"}
          </button>
          {formMode === "edit" && (
            <button
              type="button"
              className={styles["cancel-button"]}
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className={styles["section-title"]}>Existing Orders</h2>
      {orders.length === 0 ? (
        <div className={styles.message}>No orders available.</div>
      ) : (
        <div className={styles["order-grid"]}>
          {orders.map((order) => (
            <div key={order.id} className={styles["order-card"]}>
              <h3 className={styles["card-title"]}>{`Order #${order.id}`}</h3>
              <div className={styles["card-content"]}>
                <p>User: {order.user_first_name || "N/A"}</p>
                <p>Status: {order.status}</p>
                <p>Items:</p>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.product_name} ({item.color}, {item.size}, x
                      {item.quantity}, ${item.sale_price})
                    </li>
                  ))}
                </ul>
                <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className={styles["card-actions"]}>
                <button
                  className={styles["edit-button"]}
                  onClick={() => handleEditOrder(order)}
                  disabled={variantLoading}
                >
                  Edit
                </button>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDeleteOrder(order.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderManager;
