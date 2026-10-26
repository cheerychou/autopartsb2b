import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { switchLang } from "@/i18n";
import { useAdminAuth } from "@/stores/auth";

const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { loggedIn, logout } = useAdminAuth();
  const navigate = useNavigate();

  if (!loggedIn) return <Outlet />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="sidebar">
        <div className="logo">{t("app.title")}</div>
        <nav>
          {(
            [
              ["/products", t("nav.products")],
              ["/inventory", t("nav.inventory")],
              ["/orders", t("nav.orders")],
              ["/payments", t("nav.payments")],
              ["/buyers", t("nav.buyers")],
              ["/codes", t("nav.codes")],
              ["/reports", t("nav.reports")],
            ] as const
          ).map(([to, label]) => (
            <NavLink key={to} to={to} className={cls}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="row" style={{ padding: 12 }}>
          <span className="lang-switch">
            {(["zh", "ru"] as const).map((lng) => (
              <button
                key={lng}
                className={i18n.language.startsWith(lng) ? "on" : ""}
                onClick={() => switchLang(lng)}
              >
                {lng === "zh" ? "中文" : "RU"}
              </button>
            ))}
          </span>
          <button
            className="btn ghost small"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            {t("nav.logout")}
          </button>
        </div>
      </aside>
      <main className="page" style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
