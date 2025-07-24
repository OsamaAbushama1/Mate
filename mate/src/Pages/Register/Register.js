import React, { useContext, useEffect, useState } from "react";
import styles from "./Register.module.css";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function RegisterPage() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate("/login");
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h2>Register</h2>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.rowGroup}>
            <div className={`${styles.formGroup} ${styles.half}`}>
              <label>First Name</label>
              <input
                type="text"
                name="first_name"
                placeholder="First name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className={`${styles.formGroup} ${styles.half}`}>
              <label>Last Name</label>
              <input
                type="text"
                name="last_name"
                placeholder="Last name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone_number"
              placeholder="e.g. +201234567890"
              value={formData.phone_number}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Address</label>
            <input
              type="text"
              name="address"
              placeholder="Enter your full address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit">Create Account</button>
          <p className={styles.loginLink}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
      <div className={styles.imageSection}></div>
    </div>
  );
}

export default RegisterPage;
