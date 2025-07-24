// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const API_BASE_URL = "http://localhost:8000/api/";

  const formatDate = (date) => {
    if (!date || date === "null" || date === "") {
      return "Not available";
    }
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate)
      ? parsedDate.toLocaleString("en-US", {
          timeZone: "Africa/Cairo",
          hour12: true,
        })
      : "Invalid date";
  };

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

  const register = useCallback(async (userData) => {
    try {
      setIsAuthLoading(true);
      const response = await axios.post(`${API_BASE_URL}register/`, userData, {
        withCredentials: true,
      });
      setIsAuthLoading(false);
      return response.data;
    } catch (error) {
      setIsAuthLoading(false);
      throw (
        error.response?.data?.message ||
        "Registration failed. Please try again."
      );
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const refreshToken = getCookie("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }
    try {
      const response = await axios.post(
        `${API_BASE_URL}token/refresh/`,
        { refresh: refreshToken },
        { withCredentials: true }
      );
      document.cookie = `access_token=${
        response.data.access
      }; Path=/; Max-Age=${4 * 24 * 60 * 60}; SameSite=None`;
      return response.data.access;
    } catch (error) {
      throw error;
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsAuthLoading(true);
      const response = await axios.get(`${API_BASE_URL}auth/check/`, {
        withCredentials: true,
      });

      if (response.data.user) {
        const userWithEgyptTime = {
          ...response.data.user,
          last_activity: formatDate(response.data.user.last_activity),
        };
        setIsAuthenticated(true);
        setUser(userWithEgyptTime);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await refreshToken();
          const response = await axios.get(`${API_BASE_URL}auth/check/`, {
            withCredentials: true,
          });
          if (response.data.user) {
            const userWithEgyptTime = {
              ...response.data.user,
              last_activity: formatDate(response.data.user.last_activity),
            };
            setIsAuthenticated(true);
            setUser(userWithEgyptTime);
          }
        } catch (refreshError) {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, [refreshToken]);

  const login = useCallback(async (email, password) => {
    try {
      setIsAuthLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}login/`,
        { email, password },
        { withCredentials: true }
      );
      const userWithEgyptTime = {
        ...response.data.user,
        last_activity: formatDate(response.data.user.last_activity),
      };
      setIsAuthenticated(true);
      setUser(userWithEgyptTime);
      return response.data;
    } catch (error) {
      throw error.response?.data?.detail || "Login failed. Please try again.";
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}logout/`, {}, { withCredentials: true });
      setIsAuthenticated(false);
      setUser(null);
      document.cookie =
        "access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None";
      document.cookie =
        "refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None";
    } catch (error) {
      alert("Logout Error");
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        register,
        login,
        logout,
        checkAuthStatus,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
