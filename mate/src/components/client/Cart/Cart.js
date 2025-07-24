import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Cart.module.css";

function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const validatedCart = storedCart.filter(
      (item) => typeof item.sale_price === "number" && !isNaN(item.sale_price)
    );
    setCart(validatedCart);
    if (validatedCart.length !== storedCart.length) {
      localStorage.setItem("cart", JSON.stringify(validatedCart));
    }
  }, []);

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.sale_price || 0) * item.quantity,
    0
  );

  const handleRemoveItem = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  return (
    <div className={styles.cartContainer}>
      <h1 className={styles.cartTitle}>Shopping Cart</h1>
      {cart.length === 0 ? (
        <p className={styles.emptyCart}>Your cart is empty</p>
      ) : (
        <div>
          {cart.map((item, index) => (
            <div key={index} className={styles.cartItem}>
              <div className={styles.cartItemDetails}>
                <h2 className={styles.cartItemName}>{item.name}</h2>
                <p className={styles.cartItemInfo}>Color: {item.color}</p>
                <p className={styles.cartItemInfo}>Size: {item.size}</p>
                <p className={styles.cartItemInfo}>Quantity: {item.quantity}</p>
                <p className={styles.cartItemPrice}>
                  EGP {((item.sale_price || 0) * item.quantity).toFixed(2)}{" "}
                </p>
              </div>
              <button
                className={styles.removeItemButton}
                onClick={() => handleRemoveItem(index)}
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
          ))}
          <p className={styles.cartSummary}>
            Total: EGP {totalPrice.toFixed(2)}
          </p>{" "}
          <Link to="/checkout" className={styles.checkoutButton}>
            Proceed to Checkout
          </Link>
        </div>
      )}
    </div>
  );
}

export default Cart;
