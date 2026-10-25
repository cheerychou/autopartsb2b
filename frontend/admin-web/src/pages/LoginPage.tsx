import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAdminAuth } from "@/stores/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAdminAuth((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate("/products");
    } catch (err) {
      setError(err instanceof Error && err.message === "notAdmin" ? t("auth.notAdmin") : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: "80px auto" }}>
      <h1>{t("app.title")}</h1>
      <form className="card" onSubmit={(e) => void submit(e)}>
        <div className="field">
          <label>{t("auth.username")}</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label>{t("auth.password")}</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="btn" disabled={!username || !password || busy}>
          {t("auth.login")}
        </button>
      </form>
    </div>
  );
}
