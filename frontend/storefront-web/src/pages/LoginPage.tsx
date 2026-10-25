import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { errCode } from "@/lib/api";
import { useAuth } from "@/stores/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
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
      void navigate(-1);
    } catch (err) {
      const code = errCode(err);
      setError(code === "INVALID_CREDENTIALS" ? t("errors.INVALID_CREDENTIALS") : t("errors.generic", { code: code ?? "network" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "32px auto" }}>
      <h1>{t("auth.login")}</h1>
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
        <p className="muted mt">
          {t("auth.register")}: <Link to="/register">{t("nav.register")}</Link>
        </p>
      </form>
    </div>
  );
}
