import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { AuthContext } from "../../context/AuthContext";

function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, user, logout, isAuthLoading } =
    useContext(AuthContext);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    try {
      await logout();
      navigate("/");
    } catch (error) {
      alert("Logout failed");
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div
          className={`container d-flex align-items-center justify-content-between flex-wrap ${styles.headerContainer}`}
        >
          <div
            className={`${styles.headerLogo} d-flex align-items-center gap-3`}
          >
            <button
              className={`${styles.headerMenuButton} btn p-0`}
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                fill="black"
                viewBox="0 0 256 256"
              >
                <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"></path>
              </svg>
            </button>
            <Link to={"/"} className={`${styles.headerTitle}`}>
              Mate
            </Link>
          </div>

          <nav
            className={`${styles.headerSidebar} ${
              isSidebarOpen ? styles.open : ""
            }`}
          >
            <div className={`${styles.sidebarHeader}`}>
              <button
                className={`${styles.headerMenuButton} btn p-0`}
                onClick={toggleSidebar}
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="black"
                  viewBox="0 0 256 256"
                >
                  <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
                </svg>
              </button>
            </div>

            <div className={`${styles.headerNav} d-flex flex-column gap-3`}>
              <Link
                to="/orders"
                className={`${styles.headerLink} text-decoration-none`}
                onClick={toggleSidebar}
              >
                My Orders
              </Link>
              <Link
                to="/points"
                className={`${styles.headerLink} text-decoration-none`}
                onClick={toggleSidebar}
              >
                My Points
              </Link>
            </div>
          </nav>

          {isSidebarOpen && (
            <div
              className={`${styles.sidebarOverlay} ${
                isSidebarOpen ? styles.open : ""
              }`}
              onClick={toggleSidebar}
            ></div>
          )}

          <div
            className={`${styles.headerActions} d-flex align-items-center gap-2`}
          >
            {isAuthLoading ? (
              <span>Loading...</span>
            ) : isAuthenticated ? (
              <>
                <span className={`${styles.welcomeMessage}`}>
                  Welcome,{" "}
                  {user?.is_staff || user?.is_superuser
                    ? user.first_name
                    : user?.first_name || "User"}
                </span>
                <button
                  className={`${styles.headerButton} btn  text-decoration-none `}
                  onClick={handleLogout}
                >
                  <span className="d-none d-md-inline">Logout</span>
                  <span className="d-md-none">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`${styles.headerButton} btn d-flex align-items-center text-decoration-none px-2`}
              >
                <span className="d-none d-md-inline">Login</span>
                <span className="d-md-none">Login</span>
              </Link>
            )}
            <Link
              to="/cart"
              className={`${styles.headerButton} btn d-flex align-items-center`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="black"
                viewBox="0 0 256 256"
              >
                <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <div className={styles.headerSpacer}></div>
    </>
  );
}

export default Header;
