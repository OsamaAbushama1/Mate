import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";
import Header from "./components/Header/Header";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Home from "./components/client/Home";
import ProductDetails from "./components/client/ProductDetails/ProductDetails";
import Cart from "./components/client/Cart/Cart";
import Checkout from "./components/client/Checkout/Checkout";
import Dashboard from "./components/admin/Dashboard/Dashboard";
import { AuthProvider } from "./context/AuthContext";
import Orders from "./components/client/Orders/Orders";
import UserPoints from "./components/client/Points/UserPoints";
import ForgotPasswordPage from "./Pages/ForgotPassword/ForgotPasswordPage";
import ResetPasswordPage from "./Pages/ResetPassword/ResetPasswordPage";

function App() {
  const API_URL = "http://localhost:8000/api/";
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        await axios.post(
          `${API_URL}track-visit/`,
          {
            page_url: location.pathname,
          },
          {
            withCredentials: true,
            headers: {
              "X-CSRFToken": document.cookie.match(/csrftoken=([^;]+)/)?.[1],
            },
          }
        );
      } catch (error) {
        console.error("Failed to track visit:", error);
      }
    };
    trackVisit();
  }, [location.pathname]);

  return (
    <AuthProvider>
      <div className="flex">
        <div className="flex-1 ml-64">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/points" element={<UserPoints apiUrl={API_URL} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/reset-password/:token"
              element={<ResetPasswordPage />}
            />
            <Route path="/admin/*" element={<Dashboard apiUrl={API_URL} />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
