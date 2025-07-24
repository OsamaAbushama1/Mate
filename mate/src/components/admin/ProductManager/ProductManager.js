import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import axios from "axios";
import styles from "./ProductManager.module.css";

function ProductManager({ apiUrl = "http://localhost:8000/api/" }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    purchase_price: "",
    sale_price: "",
    category: "",
    sizes: "",
    images: [],
    imageColors: [],
    variants: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState("add");

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
    const fetchProducts = async () => {
      const config = {
        withCredentials: true,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      };
      try {
        const response = await axios.get(`${apiUrl}products/`, config);
        setProducts(response.data);
      } catch (err) {
        setError("Failed to fetch products.");
      }
    };
    if (isAuthenticated && isAdmin) {
      fetchProducts();
    }
  }, [isAuthenticated, isAdmin, apiUrl]);

  useEffect(() => {
    const sizeArray = formData.sizes
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    const colorArray = formData.imageColors.filter((c) => c);
    if (sizeArray.length > 0 && colorArray.length > 0) {
      const newVariants = colorArray.flatMap((color) =>
        sizeArray.map((size) => ({
          color,
          size,
          quantity:
            formData.variants.find((v) => v.color === color && v.size === size)
              ?.quantity || "",
        }))
      );
      setFormData((prev) => ({ ...prev, variants: newVariants }));
    } else {
      setFormData((prev) => ({ ...prev, variants: [] }));
    }
  }, [formData.sizes, formData.imageColors]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024;
    const validFiles = files.filter((file) => file.size <= maxSize);

    if (validFiles.length < files.length) {
      setError("Some images are too large (max 5MB per image).");
    } else {
      setError(null);
    }

    setFormData({
      ...formData,
      images: validFiles,
      imageColors: validFiles.map(() => ""),
    });
    setImagePreviews(validFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleImageColorChange = (index, color) => {
    const newImageColors = [...formData.imageColors];
    newImageColors[index] = color;
    setFormData({ ...formData, imageColors: newImageColors });
  };

  const handleVariantQuantityChange = (index, value) => {
    const newVariants = [...formData.variants];
    newVariants[index].quantity = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const handleEditProduct = (product) => {
    setFormMode("edit");
    setFormData({
      id: product.id,
      name: product.name,
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      category: product.category || "",
      sizes: product.variants
        .map((v) => v.size)
        .filter((s, i, arr) => arr.indexOf(s) === i)
        .join(", "),
      images: [],
      imageColors: product.images.map((img) => img.color || ""),
      variants: product.variants.map((v) => ({
        color: v.color,
        size: v.size,
        quantity: v.quantity.toString(),
      })),
    });
    setImagePreviews(product.images.map((img) => img.image));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    const config = {
      withCredentials: true,
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    };
    try {
      await axios.delete(`${apiUrl}products/${productId}/`, config);
      setProducts(products.filter((p) => p.id !== productId));
      alert("Product deleted successfully!");
    } catch (err) {
      setError("Failed to delete product.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("You do not have permission to manage products.");
      return;
    }

    setLoading(true);
    setError(null);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("purchase_price", parseFloat(formData.purchase_price));
    data.append("sale_price", parseFloat(formData.sale_price));
    data.append("category", formData.category);
    formData.images.forEach((image, index) => {
      data.append("images", image);
      if (formData.imageColors[index]) {
        data.append("image_colors", formData.imageColors[index]);
      }
    });
    formData.variants.forEach((variant) => {
      data.append(
        "variants[]",
        JSON.stringify({
          color: variant.color,
          size: variant.size,
          quantity: parseInt(variant.quantity) || 0,
        })
      );
    });

    const config = {
      withCredentials: true,
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "multipart/form-data",
      },
    };

    const sendRequest = async () => {
      if (formMode === "edit") {
        return await axios.put(
          `${apiUrl}products/${formData.id}/`,
          data,
          config
        );
      } else {
        return await axios.post(`${apiUrl}products/create/`, data, config);
      }
    };

    try {
      await sendRequest();
      alert(
        formMode === "edit"
          ? "Product updated successfully!"
          : "Product added successfully!"
      );
      setFormData({
        id: null,
        name: "",
        purchase_price: "",
        sale_price: "",
        category: "",
        sizes: "",
        images: [],
        imageColors: [],
        variants: [],
      });
      setImagePreviews([]);
      setFormMode("add");
      const productsResponse = await axios.get(`${apiUrl}products/`, config);
      setProducts(productsResponse.data);
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
              ? "Product updated successfully!"
              : "Product added successfully!"
          );
          setFormData({
            id: null,
            name: "",
            purchase_price: "",
            sale_price: "",
            category: "",
            sizes: "",
            images: [],
            imageColors: [],
            variants: [],
          });
          setImagePreviews([]);
          setFormMode("add");
          const productsResponse = await axios.get(
            `${apiUrl}products/`,
            config
          );
          setProducts(productsResponse.data);
        } catch (refreshError) {
          setError("Session expired. Please log in again.");
        }
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.errors ||
            "Failed to save product."
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
      name: "",
      purchase_price: "",
      sale_price: "",
      category: "",
      sizes: "",
      images: [],
      imageColors: [],
      variants: [],
    });
    setImagePreviews([]);
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
      <h1 className={styles.title}>Product Management</h1>
      {error && <div className={styles["error-message"]}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Product Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
            required
          />
        </div>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Purchase Price:</label>
          <input
            type="number"
            value={formData.purchase_price}
            onChange={(e) =>
              setFormData({ ...formData, purchase_price: e.target.value })
            }
            className={styles.input}
            required
            step="0.01"
          />
        </div>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Sale Price:</label>
          <input
            type="number"
            value={formData.sale_price}
            onChange={(e) =>
              setFormData({ ...formData, sale_price: e.target.value })
            }
            className={styles.input}
            required
            step="0.01"
          />
        </div>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Category:</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className={styles.input}
            placeholder="e.g., Electronics, Clothing"
          />
        </div>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Sizes (comma-separated):</label>
          <input
            type="text"
            value={formData.sizes}
            onChange={(e) =>
              setFormData({ ...formData, sizes: e.target.value })
            }
            className={styles.input}
            placeholder="S, M, L"
          />
        </div>
        <div className={styles["form-group"]}>
          <label className={styles.label}>Product Images:</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className={styles.input}
          />
          {imagePreviews.length > 0 && (
            <div className={styles["image-previews"]}>
              {imagePreviews.map((preview, index) => (
                <div key={index} className={styles["image-preview"]}>
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className={styles["preview-image"]}
                  />
                  <div>
                    <label className={styles.label}>Image Color:</label>
                    <input
                      type="text"
                      value={formData.imageColors[index] || ""}
                      onChange={(e) =>
                        handleImageColorChange(index, e.target.value)
                      }
                      className={styles.input}
                      placeholder="e.g., Red"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {formData.variants.length > 0 && (
          <div className={styles["form-group"]}>
            <label className={styles.label}>Quantities for Variants:</label>
            {formData.variants.map((variant, index) => (
              <div key={index} className={styles["variant-item"]}>
                <span>
                  {variant.color} - {variant.size}
                </span>
                <input
                  type="number"
                  value={variant.quantity}
                  onChange={(e) =>
                    handleVariantQuantityChange(index, e.target.value)
                  }
                  className={styles.input}
                  placeholder="Quantity"
                  min="0"
                />
              </div>
            ))}
          </div>
        )}
        <div className={styles["form-actions"]}>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : formMode === "edit"
              ? "Update Product"
              : "Add Product"}
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

      <h2 className={styles["section-title"]}>Existing Products</h2>
      {products.length === 0 ? (
        <div className={styles.message}>No products available.</div>
      ) : (
        <div className={styles["product-grid"]}>
          {products.map((product) => (
            <div key={product.id} className={styles["product-card"]}>
              <h3 className={styles["card-title"]}>{product.name}</h3>
              <div className={styles["card-content"]}>
                <p>Purchase Price: ${product.purchase_price}</p>
                <p>Sale Price: ${product.sale_price}</p>
                <p>Category: {product.category || "N/A"}</p>
                <p>Variants: {product.variants.length}</p>
                <p>Images: {product.images.length}</p>
              </div>
              <div className={styles["card-actions"]}>
                <button
                  className={styles["edit-button"]}
                  onClick={() => handleEditProduct(product)}
                >
                  Edit
                </button>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDeleteProduct(product.id)}
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

export default ProductManager;
