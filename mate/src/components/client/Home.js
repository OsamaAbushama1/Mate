import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import alt from "../../assets/alt.png";

function Home() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "http://localhost:8000/api/products/",
          {
            withCredentials: true,
          }
        );
        setProducts(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch products. Please try again.");
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    "All",
    ...new Set(
      products
        .map((p) => p.category)
        .filter((cat) => cat && typeof cat === "string")
    ),
  ];

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((product) => product.category === selectedCategory);

  if (loading) {
    return <div className="container py-4">Loading...</div>;
  }

  if (error) {
    return <div className="container py-4 text-danger">{error}</div>;
  }

  return (
    <div className="container py-4">
      <h1 className="display-4 mb-4 mt-4">Shop All</h1>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="dropdown">
          <button
            className="btn btn-dark dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {selectedCategory || "Category"}
          </button>
          <ul className="dropdown-menu">
            {categories.map((category, index) => (
              <li key={index}>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={`row g-3 ${
          filteredProducts.length === 2 ? "justify-content-center" : ""
        }`}
      >
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const totalQuantity = product.variants.reduce(
              (sum, variant) => sum + variant.quantity,
              0
            );
            return (
              <div
                className={
                  filteredProducts.length === 2
                    ? "col-12 col-md-6 col-lg-6"
                    : "col-12 col-sm-6 col-md-4 col-lg-3"
                }
                key={product.id}
              >
                <div className="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
                  <img
                    src={
                      product.images && product.images.length > 0
                        ? product.images[0].image
                        : alt
                    }
                    alt={product.name}
                    className="card-img-top"
                    style={{
                      objectFit: "cover",
                      height: "100%",
                      width: "100%",
                    }}
                  />
                  <div className="card-body d-flex flex-column p-3">
                    <h5 className="card-title mb-2">{product.name}</h5>
                    <p className="text-muted mb-1">
                      Price: EGP{" "}
                      {parseFloat(product.sale_price || 0).toFixed(2)}{" "}
                    </p>
                    <p className="text-muted mb-1">
                      Quantity:{" "}
                      {totalQuantity > 0 ? totalQuantity : "Out of Stock"}
                    </p>
                    {totalQuantity > 0 ? (
                      <Link
                        to={`/product/${product.id}`}
                        className="btn btn-dark mt-auto"
                      >
                        Details
                      </Link>
                    ) : (
                      <p className="text-danger mt-auto">Out of Stock</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-12 text-center">
            <p className="text-muted">
              There are no products in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
