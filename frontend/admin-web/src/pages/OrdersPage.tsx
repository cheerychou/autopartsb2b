import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";

interface AdminOrder {
  order_id: string;
  order_no: string;
  buyer: string;
  status: string;
  payment_method: string;
  total_amount: string;
  shipping_address: string;
  items: { title_ru: string; quantity: number; line_amount: string }[];
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ order: AdminOrder; kind: "pay" | "ship" } | null>(null);
  const [form, setForm] = useState({ amount: "", note: "", tracking_no: "", carrier: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => getData<{ results: AdminOrder[] }>("/orders/"),
  });

  const run = useMutation({
    mutationFn: () => {
      if (!action) return Promise.resolve();
      return action.kind === "pay"
        ? postData(`/orders/${action.order.order_id}/confirm-payment/`, {
            amount: form.amount,
            note: form.note,
          })
        : postData(`/orders/${action.order.order_id}/ship/`, {
            tracking_no: form.tracking_no,
            carrier: form.carrier,
          });
    },
    onSuccess: () => {
      setAction(null);
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => setError(errCode(e) ?? t("errors.generic")),
  });

  const open = (order: AdminOrder, kind: "pay" | "ship") => {
    setAction({ order, kind });
    setForm({ amount: order.total_amount, note: "", tracking_no: "", carrier: "" });
    setError(null);
  };

  return (
    <div>
      <h1>{t("orders.title")}</h1>
      {error && <div className="alert error">{error}</div>}
      {isLoading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("orders.no")}</th>
              <th>{t("orders.buyer")}</th>
              <th>{t("orders.status")}</th>
              <th>{t("orders.total")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.results ?? []).map((o) => (
              <tr key={o.order_id}>
                <td>
                  <strong>{o.order_no}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {o.items.map((i) => `${i.title_ru}×${i.quantity}`).join(", ")}
                  </div>
                </td>
                <td>{o.buyer}</td>
                <td>
                  <span className={`badge ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "" : "warn"}`}>
                    {t(`status.${o.status}`)}
                  </span>
                </td>
                <td>{o.total_amount} ₽</td>
                <td>
                  <span className="row">
                    {o.status === "awaiting_confirmation" && (
                      <button className="btn small" onClick={() => open(o, "pay")}>
                        {t("orders.confirmPay")}
                      </button>
                    )}
                    {o.status === "paid" && (
                      <button className="btn small" onClick={() => open(o, "ship")}>
                        {t("orders.ship")}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {action && (
        <div className="card mt" style={{ maxWidth: 440 }}>
          <h2>
            {action.kind === "pay" ? t("orders.confirmPay") : t("orders.ship")} · {action.order.order_no}
          </h2>
          {action.kind === "pay" ? (
            <>
              <div className="field">
                <label>{t("orders.amount")}</label>
                <input className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t("orders.note")}</label>
                <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={200} />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>{t("orders.tracking")}</label>
                <input className="input" value={form.tracking_no} onChange={(e) => setForm((f) => ({ ...f, tracking_no: e.target.value }))} maxLength={64} />
              </div>
              <div className="field">
                <label>{t("orders.carrier")}</label>
                <input className="input" value={form.carrier} onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} maxLength={32} />
              </div>
            </>
          )}
          <div className="row">
            <button
              className="btn"
              disabled={run.isPending || (action.kind === "ship" && !form.tracking_no.trim())}
              onClick={() => run.mutate()}
            >
              {t("common.confirm")}
            </button>
            <button className="btn ghost" onClick={() => setAction(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
