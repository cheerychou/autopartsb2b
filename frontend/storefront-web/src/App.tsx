import { Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";

// S0 骨架：路由占位。页面落地节奏见 31号§四（S3 storefront F-01~08）
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Storefront skeleton (S0)</div>} />
      </Routes>
    </BrowserRouter>
  );
}
