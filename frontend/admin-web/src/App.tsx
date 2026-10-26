import { Route, Routes, Navigate } from "react-router-dom";

import PaymentsPage from "@/pages/PaymentsPage";
import { useEffect } from "react";

import Layout from "@/components/Layout";
import BuyersPage from "@/pages/BuyersPage";
import CodesPage from "@/pages/CodesPage";
import InventoryPage from "@/pages/InventoryPage";
import LoginPage from "@/pages/LoginPage";
import OrdersPage from "@/pages/OrdersPage";
import ProductsPage from "@/pages/ProductsPage";
import ReportsPage from "@/pages/ReportsPage";
import { useAdminAuth } from "@/stores/auth";

// 管理端路由（F-10~17 核心工作集；RBAC 在后端，403 由各页错误位呈现）
export default function App() {
  const loggedIn = useAdminAuth((s) => s.loggedIn);
  const bootstrap = useAdminAuth((s) => s.bootstrap);
  useEffect(() => bootstrap(), [bootstrap]);
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={loggedIn ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/buyers" element={<BuyersPage />} />
        <Route path="/codes" element={<CodesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={loggedIn ? "/products" : "/login"} replace />} />
    </Routes>
  );
}
