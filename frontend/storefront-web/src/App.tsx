import { Route, Routes } from "react-router-dom";
import { useEffect } from "react";

import Layout from "@/components/Layout";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import FitmentPage from "@/pages/FitmentPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import OrdersPage from "@/pages/OrdersPage";
import ProductPage from "@/pages/ProductPage";
import RegisterPage from "@/pages/RegisterPage";
import SearchOePage from "@/pages/SearchOePage";
import { useAuth } from "@/stores/auth";

// 买家商城路由（F-01~07；S6 落地，31号 S3 出口）
export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => bootstrap(), [bootstrap]);
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchOePage />} />
        <Route path="/fitment" element={<FitmentPage />} />
        <Route path="/product/:spuId" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<p className="muted">404</p>} />
      </Route>
    </Routes>
  );
}
