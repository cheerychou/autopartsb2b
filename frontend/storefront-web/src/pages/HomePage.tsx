import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { getCatalog } from "@/lib/api";
import type { BrandBrief } from "@/lib/catalog-types";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [oe, setOe] = useState("");
  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => getCatalog<{ data: BrandBrief[] }>("/brands"),
  });

  return (
    <div>
      <h1>{t("app.tagline")}</h1>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          if (oe.trim().length >= 4) void navigate(`/search?q=${encodeURIComponent(oe.trim())}`);
        }}
      >
        <div className="row">
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder={t("home.oePlaceholder")}
            value={oe}
            onChange={(e) => setOe(e.target.value)}
          />
          <button className="btn" type="submit">
            {t("home.oeSearch")}
          </button>
        </div>
      </form>

      <h2>{t("home.howTitle")}</h2>
      <div className="grid cols-3">
        <div className="card">
          <strong>{t("nav.search")}</strong>
          <p className="muted">{t("home.howOe")}</p>
        </div>
        <div className="card">
          <Link to="/fitment">
            <strong>{t("nav.fitment")}</strong>
          </Link>
          <p className="muted">{t("home.howFitment")}</p>
        </div>
      </div>

      <h2>{t("home.brands")}</h2>
      {isLoading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (
        <div className="grid cols-4">
          {(brands?.data ?? []).map((b) => (
            <Link key={b.brand_id} to={`/fitment?brand=${b.brand_id}`}>
              <div className="card">{b.display_name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
