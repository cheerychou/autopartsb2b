import { Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";

// S0 骨架：路由占位。页面落地节奏见 31号§四（S2 admin F-10/12/15）
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Admin skeleton (S0)</div>} />
      </Routes>
    </BrowserRouter>
  );
}
