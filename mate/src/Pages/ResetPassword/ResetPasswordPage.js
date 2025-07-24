import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ResetPassword.module.css";
import axios from "axios";

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Sending password reset request with token:", token);
      console.log("Payload:", { password });
      const response = await axios.post(
        `/api/password-reset-confirm/${token}/`,
        { password }
      );
      setMessage(response.data.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.error || "Invalid or expired token.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.resetPassContainer}>
      <form className={styles.resetPassForm} onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        {message && <p className={styles.resetPassSuccess}>{message}</p>}
        {error && <p className={styles.resetPassError}>{error}</p>}
        <div className={styles.resetPassFormGroup}>
          <label>New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className={styles.resetPassFormGroup}>
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button className={styles.btnSubmit} type="submit" disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
