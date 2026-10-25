import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getData } from "@/lib/api";

/** F-17 四张报表（数据形状依 services_reporting 实现；入契约面后切 generated 类型）。 */
function useReport<T>(key: string, url: string, enabled: boolean): T[] {
  const q = useQuery({ queryKey: [key], queryFn: () => getData<{ data: T[] }>(url), enabled });
  return q.data?.data ?? [];
}

export default function ReportsPage() {
  const { t } = useTranslation();
  type SalesRow = { status: string; order_count: number; total: string };
  type SlowRow = { product_code: string; title_ru: string; quantity_available: number };
  type CovRow = { metric: string; value: number | string };
  type AgingRow = { batch_no: string; in_stock: number; age_days: number; aging_bucket: string };
  const sales = useReport<SalesRow>("rpt-sales", "/reports/sales/", true);
  const slow = useReport<SlowRow>("rpt-slow", "/reports/slow-movers/", true);
  const coverage = useReport<CovRow>("rpt-cov", "/reports/catalog-coverage/", true);
  const aging = useReport<AgingRow>("rpt-aging", "/reports/codes-aging/", true);

  return (
    <div>
      <h1>{t("reports.title")}</h1>
      <div className="grid cols-2">
        <div className="card">
          <h2>{t("reports.sales")}</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("orders.status")}</th>
                <th>N</th>
                <th>{t("orders.total")}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((r) => (
                <tr key={r.status}>
                  <td>{t(`status.${r.status}`)}</td>
                  <td>{r.order_count}</td>
                  <td>{r.total} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>{t("reports.slowMovers")}</h2>
          <table className="tbl">
            <tbody>
              {slow.map((r, i) => (
                <tr key={i}>
                  <td>{r.product_code}</td>
                  <td>{r.title_ru}</td>
                  <td>{r.quantity_available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>{t("reports.coverage")}</h2>
          <table className="tbl">
            <tbody>
              {coverage.map((r, i) => (
                <tr key={i}>
                  <td>{r.metric}</td>
                  <td>{String(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>{t("reports.aging")}</h2>
          <table className="tbl">
            <tbody>
              {aging.map((r) => (
                <tr key={r.batch_no}>
                  <td>{r.batch_no}</td>
                  <td>{r.in_stock}</td>
                  <td>
                    {r.age_days}d · {r.aging_bucket}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
