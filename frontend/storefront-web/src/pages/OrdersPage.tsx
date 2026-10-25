import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getData } from "@/lib/api";
import type { OrderBrief } from "@/lib/catalog-types";

export default function OrdersPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getData<{ data: OrderBrief[] }>("/orders"),
  });

  if (isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (isError)
    return (
      <div>
        <h1>{t("orders.title")}</h1>
        <div className="alert">{t("auth.loginRequired")}</div>
        <Link className="btn ghost small" to="/login">
          {t("nav.login")}
        </Link>
      </div>
    );

  return (
    <div>
      <h1>{t("orders.title")}</h1>
      {(data?.data.length ?? 0) === 0 ? (
        <p className="muted">{t("orders.empty")}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("checkout.orderNo")}</th>
              <th>{t("orders.status")}</th>
              <th>{t("orders.total")}</th>
              <th>{t("orders.date")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data?.data ?? []).map((o) => (
              <tr key={o.order_no}>
                <td>
                  <Link to={`/orders/${o.order_id}`}>
                    <strong>{o.order_no}</strong>
                  </Link>
                </td>
                <td>
                  <span className="badge">{t(`status.${o.status}`)}</span>
                </td>
                <td>{o.total_amount} ₽</td>
                <td className="muted">{o.created_at.slice(0, 10)}</td>
                <td>
                  <Link className="btn ghost small" to={`/orders/${o.order_id}`}>
                    {t("common.details")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
