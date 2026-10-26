import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { getData } from "@/lib/api";

interface PaymentFlowRow {
  order_no: string;
  buyer: string;
  company_name_ru: string;
  payment_method: string;
  amount: string;
  confirmed_at: string;
  confirmed_by: string;
  note: string;
  order_status: string;
}

interface PaymentFlows {
  rows: PaymentFlowRow[];
  count: number;
  total_amount: string;
}

// F-14 收单流水（ENG-003 缺口①）：finance 日常——已核销到账的派生视图。
export default function PaymentsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState({ from: "", to: "" });

  const params = new URLSearchParams();
  if (range.from) params.set("date_from", range.from);
  if (range.to) params.set("date_to", range.to);
  const qs = params.toString();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", range.from, range.to],
    queryFn: () => getData<PaymentFlows>(`/payments/${qs ? `?${qs}` : ""}`),
  });

  const fmtTime = (iso: string) => iso.replace("T", " ").slice(0, 16);

  return (
    <div>
      <h1>{t("payments.title")}</h1>
      <div className="row" style={{ alignItems: "center", gap: 8 }}>
        <label>
          {t("payments.dateFrom")}{" "}
          <input
            className="input"
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </label>
        <label>
          {t("payments.dateTo")}{" "}
          <input
            className="input"
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </label>
        <span className="muted">
          {t("payments.count")}: {data?.count ?? "—"} · {t("payments.total")}: {data?.total_amount ?? "—"} ₽
        </span>
      </div>
      {isLoading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (data?.rows.length ?? 0) === 0 ? (
        <p className="muted">{t("payments.empty")}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("payments.time")}</th>
              <th>{t("payments.order")}</th>
              <th>{t("payments.buyer")}</th>
              <th>{t("payments.method")}</th>
              <th>{t("payments.amount")}</th>
              <th>{t("payments.by")}</th>
              <th>{t("payments.note")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((r) => (
              <tr key={`${r.order_no}-${r.confirmed_at}`}>
                <td>{fmtTime(r.confirmed_at)}</td>
                <td>
                  <strong>{r.order_no}</strong>
                </td>
                <td>
                  {r.buyer}
                  {r.company_name_ru && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.company_name_ru}
                    </div>
                  )}
                </td>
                <td>{t(`payments.method_${r.payment_method}`, { defaultValue: r.payment_method })}</td>
                <td>
                  {r.amount} ₽
                </td>
                <td>{r.confirmed_by}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
