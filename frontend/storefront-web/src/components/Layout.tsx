import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { switchLang } from "@/i18n";
import { useAuth } from "@/stores/auth";

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { loggedIn, kind, logout } = useAuth();
  const navigate = useNavigate();

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

  return (
    <div>
      <header className="site-header">
        <div className="inner container">
          <Link to="/" className="logo">
            {t("app.title")}
          </Link>
          <nav className="nav">
            <NavLink to="/" end className={cls}>
              {t("nav.home")}
            </NavLink>
            <NavLink to="/fitment" className={cls}>
              {t("nav.fitment")}
            </NavLink>
            <NavLink to="/orders" className={cls}>
              {t("nav.orders")}
            </NavLink>
            <NavLink to="/cart" className={cls}>
              {t("nav.cart")}
            </NavLink>
          </nav>
          <span className="lang-switch">
            {(["ru", "zh"] as const).map((lng) => (
              <button
                key={lng}
                className={i18n.language.startsWith(lng) ? "on" : ""}
                onClick={() => switchLang(lng)}
              >
                {lng === "ru" ? "RU" : "中文"}
              </button>
            ))}
          </span>
          {loggedIn ? (
            <button
              className="btn ghost small"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              {t("nav.logout")}
              {kind !== "guest" ? ` · ${kind}` : ""}
            </button>
          ) : (
            <Link to="/login" className="btn ghost small">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </div>
  );
}
