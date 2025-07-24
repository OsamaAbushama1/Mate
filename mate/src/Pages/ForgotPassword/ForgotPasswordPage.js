import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ForgotPassword.module.css";
import axios from "axios";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post("/api/password-reset/", { email });
      setMessage(response.data.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.forgotPassContainer}>
      <form className={styles.forgotPassForm} onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        {message && <p className={styles.forgotPassSuccess}>{message}</p>}
        {error && <p className={styles.forgotPassError}>{error}</p>}
        <div className={styles.forgotPassFormGroup}>
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button className={styles.btnSubmit} type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
