import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import axios from "axios";
import styles from "./PointsManager.module.css";

function PointsManager({ apiUrl = "http://localhost:8000/api/" }) {
  const { isAuthenticated, user, isAuthLoading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editedPoints, setEditedPoints] = useState({});

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
    const config = {
      withCredentials: true,
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    };
    try {
      const response = await axios.get(`${apiUrl}users/`, config);
      setUsers(response.data || []);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (!query) {
      fetchUsers();
      return;
    }
    setLoading(true);
    setError(null);
    const config = {
      withCredentials: true,
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    };
    try {
      const response = await axios.get(
        `${apiUrl}users/search/?q=${encodeURIComponent(query)}`,
        config
      );
      setUsers(response.data || []);
    } catch (err) {
      setError("Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePoints = async (userId) => {
    if (!isAdmin) {
      setError("Only admins can update points.");
      return;
    }

    const points = parseInt(editedPoints[userId], 10);
    if (isNaN(points) || points < 0) {
      setError("Points must be a non-negative number.");
      return;
    }

    setLoading(true);
    setError(null);
    const config = {
      withCredentials: true,
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios.patch(
        `${apiUrl}users/${userId}/`,
        { points },
        config
      );
      setUsers(users.map((u) => (u.id === userId ? response.data : u)));
      setEditingUserId(null);
      setEditedPoints((prev) => {
        const newPoints = { ...prev };
        delete newPoints[userId];
        return newPoints;
      });
      alert("Points updated successfully!");
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to update points. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e, userId) => {
    if (e.key === "Enter") {
      handleUpdatePoints(userId);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, user, isAdmin, apiUrl]);

  if (isAuthLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          You must be an admin to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manage User Points</h1>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            searchUsers(e.target.value);
          }}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : users.length === 0 ? (
        <div className={styles.noUsers}>No users found.</div>
      ) : (
        <>
          <table className={`table table-bordered ${styles.table}`}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    {user.fullName || `${user.first_name} ${user.last_name}`}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {editingUserId === user.id ? (
                      <input
                        type="number"
                        min="0"
                        value={editedPoints[user.id] ?? user.points}
                        onChange={(e) =>
                          setEditedPoints({
                            ...editedPoints,
                            [user.id]: e.target.value,
                          })
                        }
                        onKeyPress={(e) => handleKeyPress(e, user.id)}
                        className={styles.pointsInput}
                        autoFocus
                      />
                    ) : (
                      user.points
                    )}
                  </td>
                  <td>
                    {editingUserId === user.id ? (
                      <>
                        <button
                          onClick={() => handleUpdatePoints(user.id)}
                          disabled={loading}
                          className={styles.saveButton}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingUserId(null);
                            setEditedPoints((prev) => {
                              const newPoints = { ...prev };
                              delete newPoints[user.id];
                              return newPoints;
                            });
                          }}
                          disabled={loading}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditedPoints({
                            ...editedPoints,
                            [user.id]: user.points,
                          });
                        }}
                        disabled={loading}
                        className={styles.editButton}
                        style={{ backgroundColor: "#007bff", color: "#fff" }}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.mobileUsers}>
            {users.map((user) => (
              <div key={user.id} className={styles.userCard}>
                <div>
                  <strong>ID:</strong> {user.id}
                </div>
                <div>
                  <strong>Name:</strong>{" "}
                  {user.fullName || `${user.first_name} ${user.last_name}`}
                </div>
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
                <div>
                  <strong>Points:</strong>{" "}
                  {editingUserId === user.id ? (
                    <input
                      type="number"
                      min="0"
                      value={editedPoints[user.id] ?? user.points}
                      onChange={(e) =>
                        setEditedPoints({
                          ...editedPoints,
                          [user.id]: e.target.value,
                        })
                      }
                      onKeyPress={(e) => handleKeyPress(e, user.id)}
                      className={styles.pointsInput}
                      autoFocus
                    />
                  ) : (
                    user.points
                  )}
                </div>
                <div className={styles.cardActions}>
                  {editingUserId === user.id ? (
                    <>
                      <button
                        onClick={() => handleUpdatePoints(user.id)}
                        disabled={loading}
                        className={styles.saveButton}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingUserId(null);
                          setEditedPoints((prev) => {
                            const newPoints = { ...prev };
                            delete newPoints[user.id];
                            return newPoints;
                          });
                        }}
                        disabled={loading}
                        className={styles.cancelButton}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingUserId(user.id);
                        setEditedPoints({
                          ...editedPoints,
                          [user.id]: user.points,
                        });
                      }}
                      disabled={loading}
                      className={styles.editButton}
                      style={{ backgroundColor: "#007bff", color: "#fff" }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PointsManager;
