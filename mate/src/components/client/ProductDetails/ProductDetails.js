import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from "./ProductDetails.module.css";

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:8000/api/products/${id}/`,
          { withCredentials: true }
        );
        setProduct(response.data);
        const availableColors = [
          ...new Set(
            response.data.images.map((img) => img.color).filter((c) => c)
          ),
        ];
        const availableSizes = [
          ...new Set(response.data.variants.map((v) => v.size)),
        ];
        setSelectedColor(availableColors[0] || "");
        setSelectedSize(availableSizes[0] || "");
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch product details. Please try again.");
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    if (sliderRef.current) {
      const firstImageIndex = product.images.findIndex(
        (img) => img.color?.toLowerCase() === color.toLowerCase()
      );
      if (firstImageIndex !== -1) {
        sliderRef.current.slickGoTo(firstImageIndex);
      }
    }
  };

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      alert("Please select a color and size.");
      return;
    }

    const variant = product.variants.find(
      (v) =>
        v.color.toLowerCase() === selectedColor.toLowerCase() &&
        v.size === selectedSize
    );
    if (!variant || variant.quantity === 0) {
      alert("This variant is out of stock.");
      return;
    }

    if (quantity > variant.quantity) {
      alert(`Only ${variant.quantity} items available for this variant.`);
      return;
    }

    const cartItem = {
      id: product.id,
      name: product.name,
      sale_price: parseFloat(product.sale_price || 0),
      color: selectedColor,
      size: selectedSize,
      quantity: parseInt(quantity),
    };

    try {
      let existingCart = JSON.parse(localStorage.getItem("cart")) || [];
      if (!Array.isArray(existingCart)) {
        existingCart = [];
      }
      const existingItemIndex = existingCart.findIndex(
        (item) =>
          item.id === cartItem.id &&
          item.color === cartItem.color &&
          item.size === cartItem.size
      );

      if (existingItemIndex >= 0) {
        const newQuantity = existingCart[existingItemIndex].quantity + quantity;
        if (newQuantity > variant.quantity) {
          alert(
            `Only ${variant.quantity} items available in total for this variant.`
          );
          return;
        }
        existingCart[existingItemIndex].quantity = newQuantity;
      } else {
        existingCart.push(cartItem);
      }

      localStorage.setItem("cart", JSON.stringify(existingCart));
      alert(`${product.name} has been added to the cart!`);
    } catch (err) {
      alert("Failed to add item to cart. Please try again.");
    }
  };

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    dotsClass: `slick-dots ${styles.slickDots}`,
    afterChange: (current) => {
      if (product && product.images && product.images[current]) {
        const newColor = product.images[current].color;
        if (newColor && newColor !== selectedColor) {
          setSelectedColor(newColor);
          handleColorSelect(newColor);
        }
      }
    },
  };

  const colorMap = {
    Crimson: "#DC143C",
    Navy: "#000080",
    Red: "#FF0000",
    Green: "#008000",
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-danger">{error}</div>;
  }

  if (!product) {
    return <div className="p-4">Product not available</div>;
  }

  const availableColors = [
    ...new Set(product.images.map((img) => img.color).filter((c) => c)),
  ];
  const availableSizes = [...new Set(product.variants.map((v) => v.size))];

  const selectedVariant = product.variants.find(
    (v) =>
      v.color.toLowerCase() === selectedColor.toLowerCase() &&
      v.size === selectedSize
  );
  const availableQuantity = selectedVariant ? selectedVariant.quantity : 0;

  return (
    <div className={styles.productContainer}>
      <div className={styles.imageContainer}>
        <Slider ref={sliderRef} {...sliderSettings}>
          {product.images.map((img, index) => (
            <div key={index} className={styles.slide}>
              <img
                src={img.image}
                alt={`${product.name} in ${img.color || "N/A"} view ${
                  index + 1
                }`}
                className={styles.productImage}
              />
            </div>
          ))}
        </Slider>
      </div>
      <h1 className={styles.productTitle}>{product.name}</h1>
      <div className={styles.centeredInfo}>
        <p className={styles.productInfo}>
          Price: EGP {parseFloat(product.sale_price || 0).toFixed(2)}{" "}
        </p>
        <p className={styles.productInfo}>
          Available Quantity:{" "}
          {availableQuantity > 0 ? availableQuantity : "Out of Stock"}
        </p>
      </div>
      <div className={styles.optionsContainer}>
        <div className={styles.optionGroup}>
          <label className={styles.formLabel}>Color:</label>
          {availableColors.length > 0 ? (
            <div className={styles.colorCircles}>
              {availableColors.map((color) => (
                <div
                  key={color}
                  className={`${styles.colorCircle} ${
                    selectedColor === color ? styles.colorCircleSelected : ""
                  }`}
                  style={{
                    backgroundColor: colorMap[color] || color.toLowerCase(),
                  }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          ) : (
            <p>No colors available</p>
          )}
        </div>
        <div className={styles.optionGroup}>
          <label className={styles.formLabel}>Sizes:</label>
          {availableSizes.length > 0 ? (
            <div className={styles.sizeBoxContainer}>
              {availableSizes.map((size) => (
                <div
                  key={size}
                  className={`${styles.sizeBox} ${
                    selectedSize === size ? styles.sizeBoxSelected : ""
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </div>
              ))}
            </div>
          ) : (
            <p>No sizes available</p>
          )}
        </div>
      </div>
      <div className={styles.centeredInfo}>
        <div className={styles.productInfo}>
          <label className={styles.formLabel}>Quantity:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            min="1"
            max={availableQuantity}
            className={styles.quantityInput}
            disabled={availableQuantity === 0}
          />
        </div>
      </div>
      <button
        className={styles.addToCartButton}
        onClick={handleAddToCart}
        disabled={availableQuantity === 0}
      >
        Add To Cart
      </button>
    </div>
  );
}

export default ProductDetails;
