import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import axios from "axios";
import styles from "./UserManager.module.css";

function UserManager({ apiUrl }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
    password: "",
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);

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

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}users/`, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      setUsers(response.data || []);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin, apiUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.email ||
      !formData.phone_number ||
      !formData.address ||
      (!formData.password && !editingUserId)
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const config = {
      withCredentials: true,
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
    };

    try {
      if (editingUserId) {
        const response = await axios.put(
          `${apiUrl}users/${editingUserId}/`,
          { ...formData, password: formData.password || undefined },
          config
        );
        setUsers(
          users.map((u) => (u.id === editingUserId ? response.data : u))
        );
        setEditingUserId(null);
      } else {
        const response = await axios.post(`${apiUrl}users/`, formData, config);
        setUsers([...users, response.data]);
      }
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        address: "",
        password: "",
      });
    } catch (err) {
      if (
        editingUserId &&
        err.response?.data?.email &&
        err.response.data.email.includes("Email Already Used")
      ) {
        setFormError(null);
      } else {
        setFormError(
          err.response?.data?.detail ||
            Object.values(err.response?.data || {})[0] ||
            "Failed to save user. Please try again."
        );
      }
    }
  };

  const handleEdit = (user) => {
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      address: user.address || "",
      password: "",
    });
    setEditingUserId(user.id);
    setFormError(null);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`${apiUrl}users/${userId}/`, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      setError("Failed to delete user. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      address: "",
      password: "",
    });
    setEditingUserId(null);
    setFormError(null);
  };

  if (isAuthLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manage Users</h1>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.userForm}>
          <h2 className={styles.formTitle}>
            {editingUserId ? "Edit User" : "Add New User"}
          </h2>
          {formError && <div className={styles.formError}>{formError}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="first_name" className={styles.label}>
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="last_name" className={styles.label}>
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone_number" className={styles.label}>
              Phone Number
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="address" className={styles.label}>
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password {editingUserId && "(Leave blank to keep unchanged)"}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={styles.input}
              required={!editingUserId}
            />
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              {editingUserId ? "Update User" : "Add User"}
            </button>
            {editingUserId && (
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className={styles.usersTable}>
          <h2 className={styles.tableTitle}>Users List</h2>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : users.length === 0 ? (
            <div className={styles.noUsers}>No users found.</div>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.first_name}</td>
                      <td>{user.last_name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone_number}</td>
                      <td>{user.address}</td>
                      <td>
                        <button
                          className={styles.editButton}
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.mobileUsers}>
                {users.map((user) => (
                  <div key={user.id} className={styles.userCard}>
                    <div>
                      <strong>First Name:</strong> {user.first_name}
                    </div>
                    <div>
                      <strong>Last Name:</strong> {user.last_name}
                    </div>
                    <div>
                      <strong>Email:</strong> {user.email}
                    </div>
                    <div>
                      <strong>Phone:</strong> {user.phone_number}
                    </div>
                    <div>
                      <strong>Address:</strong> {user.address}
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManager;
