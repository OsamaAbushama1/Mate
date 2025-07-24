import React, { useContext, useState, useEffect } from "react";
import styles from "./Login.module.css";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h2>Login</h2>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.forgotPassword}>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          <button type="submit">Login</button>
          <p className={styles.signupLink}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
      <div className={styles.imageSection}></div>
    </div>
  );
}

export default LoginPage;
