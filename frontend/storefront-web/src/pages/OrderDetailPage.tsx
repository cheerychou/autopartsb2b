import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";
import type { OrderDetail } from "@/lib/catalog-types";

const CANCELLABLE = ["pending_payment", "awaiting_confirmation"];

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { orderId } = useParams<{ orderId: string }>();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getData<{ data: OrderDetail }>(`/orders/${orderId}`),
    enabled: !!orderId,
  });

  const act = useMutation({
    mutationFn: (action: "cancel" | "confirm-receipt") => postData(`/orders/${orderId}/${action}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["order", orderId] }),
    onError: (e) => setError(t(`errors.${errCode(e) ?? "generic"}`, { code: "network" })),
  });

  if (isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (isError || !data)
    return <p className="alert error">{t("errors.ORDER_NOT_FOUND")}</p>;

  const o = data.data;
  const cancellable = CANCELLABLE.includes(o.status);

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="row spread">
        <h1>{o.order_no}</h1>
        <span className={`badge ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "" : "warn"}`}>
          {t(`status.${o.status}`)}
        </span>
      </div>
      <div className="card">
        <p className="muted">
          {t("orders.date")}: {o.created_at.slice(0, 16).replace("T", " ")} ·{" "}
          {t("checkout.payment")}: {o.payment_method}
          {o.tracking_no ? ` · ${t("orders.tracking")}: ${o.tracking_no}` : ""}
        </p>
        <p className="muted">{o.shipping_address}</p>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("orders.items")}</th>
              <th>{t("product.quantity")}</th>
              <th>{t("common.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((it, i) => (
              <tr key={i}>
                <td>{it.title_ru}</td>
                <td>{it.quantity}</td>
                <td>{it.line_amount} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row spread mt">
          <span className="price">
            {t("cart.total")}: {o.total_amount} ₽
          </span>
          <span className="row">
            {cancellable && (
              <button
                className="btn danger small"
                onClick={() => {
                  if (window.confirm(t("orders.cancelConfirm"))) act.mutate("cancel");
                }}
              >
                {t("orders.cancel")}
              </button>
            )}
            {o.status === "shipped" && (
              <button className="btn small" onClick={() => act.mutate("confirm-receipt")}>
                {t("orders.confirmReceipt")}
              </button>
            )}
          </span>
        </div>
        {error && <div className="alert error mt">{error}</div>}
      </div>
    </div>
  );
}
