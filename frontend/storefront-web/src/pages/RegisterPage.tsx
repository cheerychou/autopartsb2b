import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/stores/auth";

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
    buyerType: "individual" as "individual" | "corporate",
    companyNameRu: "",
    inn: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = await register({ ...form });
    setBusy(false);
    if (code) {
      setError(t(`errors.${code}`, { code }));
      return;
    }
    void navigate("/");
  };

  const corporate = form.buyerType === "corporate";

  return (
    <div style={{ maxWidth: 460, margin: "32px auto" }}>
      <h1>{t("auth.register")}</h1>
      <form className="card" onSubmit={(e) => void submit(e)}>
        <div className="field">
          <label>{t("auth.buyerType")}</label>
          <div className="row">
            {(["individual", "corporate"] as const).map((v) => (
              <label key={v} className="row" style={{ gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="buyerType"
                  checked={form.buyerType === v}
                  onChange={() => set("buyerType", v)}
                />
                {t(`auth.${v}`)}
              </label>
            ))}
          </div>
        </div>
        {corporate && (
          <>
            <div className="field">
              <label>{t("auth.companyName")}</label>
              <input className="input" value={form.companyNameRu} onChange={(e) => set("companyNameRu", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("auth.inn")}</label>
              <input className="input" value={form.inn} onChange={(e) => set("inn", e.target.value)} maxLength={12} />
            </div>
          </>
        )}
        <div className="field">
          <label>{t("auth.username")}</label>
          <input className="input" value={form.username} onChange={(e) => set("username", e.target.value)} minLength={4} />
        </div>
        <div className="field">
          <label>{t("auth.password")}</label>
          <input className="input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} />
        </div>
        <div className="field">
          <label>{t("auth.phone")}</label>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        {corporate && !form.inn && <div className="alert">{t("auth.inn")}</div>}
        {error && <div className="alert error">{error}</div>}
        <button className="btn" disabled={!form.username || form.password.length < 8 || (corporate && !form.inn) || busy}>
          {t("auth.register")}
        </button>
        <p className="muted mt">{corporate ? t("auth.corporatePending") : ""}</p>
      </form>
    </div>
  );
}
