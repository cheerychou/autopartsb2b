import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";

interface InventoryItem {
  product: string;
  product_code: string;
  quantity_available: number;
  updated_at: string;
}

export default function InventoryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [target, setTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ tx_type: "inbound", quantity: "1", note: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => getData<{ results: InventoryItem[] }>("/inventory/"),
  });

  const record = useMutation({
    mutationFn: () =>
      postData(`/inventory/${target!.product}/transactions/`, {
        tx_type: form.tx_type,
        quantity: Number(form.quantity),
        note: form.note,
      }),
    onSuccess: () => {
      setOk(t("common.success"));
      setTarget(null);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => setError(errCode(e) ?? t("errors.generic")),
  });

  return (
    <div>
      <h1>{t("inventory.title")}</h1>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert">{ok}</div>}
      {isLoading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("products.code")}</th>
              <th>{t("inventory.balance")}</th>
              <th>{t("inventory.updated")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.results ?? []).map((it) => (
              <tr key={it.product}>
                <td>{it.product_code}</td>
                <td>
                  <span className={`badge ${it.quantity_available > 0 ? "ok" : "warn"}`}>
                    {it.quantity_available}
                  </span>
                </td>
                <td className="muted">{it.updated_at.slice(0, 16).replace("T", " ")}</td>
                <td>
                  <button
                    className="btn small"
                    onClick={() => {
                      setTarget(it);
                      setForm({ tx_type: "inbound", quantity: "1", note: "" });
                      setOk(null);
                    }}
                  >
                    {t("inventory.record")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {target && (
        <div className="card mt" style={{ maxWidth: 420 }}>
          <h2>
            {t("inventory.record")} · {target.product_code}
          </h2>
          <div className="field">
            <label>{t("inventory.txType")}</label>
            <select className="input" value={form.tx_type} onChange={(e) => setForm((f) => ({ ...f, tx_type: e.target.value }))}>
              <option value="inbound">{t("inventory.inbound")}</option>
              <option value="outbound">{t("inventory.outbound")}</option>
              <option value="adjust">{t("inventory.adjust")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("inventory.quantity")}</label>
            <input className="input" type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t("inventory.note")}</label>
            <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={200} />
          </div>
          <div className="row">
            <button className="btn" disabled={record.isPending} onClick={() => record.mutate()}>
              {t("common.confirm")}
            </button>
            <button className="btn ghost" onClick={() => setTarget(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
