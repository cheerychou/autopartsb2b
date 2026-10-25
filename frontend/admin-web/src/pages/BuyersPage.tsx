import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";

interface Buyer {
  id: number;
  username: string;
  buyer_type: string;
  company_name_ru: string;
  inn: string;
  verification_status: string;
  can_order: boolean;
}

export default function BuyersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Buyer | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["buyers"],
    queryFn: () => getData<{ results: Buyer[] }>("/buyer-accounts/"),
  });

  const act = useMutation({
    mutationFn: ({ id, kind, note }: { id: number; kind: "approve" | "reject"; note: string }) =>
      postData(`/buyer-accounts/${id}/${kind}/`, { note }),
    onSuccess: () => {
      setRejecting(null);
      void qc.invalidateQueries({ queryKey: ["buyers"] });
    },
    onError: (e) => setError(errCode(e) ?? t("errors.generic")),
  });

  const badge = (s: string) => (s === "approved" ? "ok" : s === "pending" ? "warn" : "");

  return (
    <div>
      <h1>{t("buyers.title")}</h1>
      {error && <div className="alert error">{error}</div>}
      {isLoading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("buyers.username")}</th>
              <th>{t("buyers.type")}</th>
              <th>{t("buyers.company")}</th>
              <th>{t("buyers.inn")}</th>
              <th>{t("buyers.state")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.results ?? []).map((b) => (
              <tr key={b.id}>
                <td>{b.username}</td>
                <td>{b.buyer_type}</td>
                <td>{b.company_name_ru || "—"}</td>
                <td>{b.inn || "—"}</td>
                <td>
                  <span className={`badge ${badge(b.verification_status)}`}>
                    {t(`verify.${b.verification_status}`)}
                  </span>
                </td>
                <td>
                  {b.buyer_type === "corporate" && b.verification_status !== "approved" && (
                    <span className="row">
                      <button
                        className="btn small"
                        onClick={() => act.mutate({ id: b.id, kind: "approve", note: "" })}
                      >
                        {t("buyers.approve")}
                      </button>
                      <button
                        className="btn danger small"
                        onClick={() => {
                          setRejecting(b);
                          setNote("");
                        }}
                      >
                        {t("buyers.reject")}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rejecting && (
        <div className="card mt" style={{ maxWidth: 420 }}>
          <h2>
            {t("buyers.reject")} · {rejecting.username}
          </h2>
          <div className="field">
            <label>{t("buyers.note")}</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>
          {!note.trim() && <div className="alert">{t("buyers.rejectNoteRequired")}</div>}
          <div className="row">
            <button
              className="btn danger"
              disabled={!note.trim()}
              onClick={() => act.mutate({ id: rejecting.id, kind: "reject", note })}
            >
              {t("common.confirm")}
            </button>
            <button className="btn ghost" onClick={() => setRejecting(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
