import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";

interface Batch {
  batch_id: string;
  batch_no: string;
  customs_declaration: string;
  status: string;
  code_count?: number;
}

const parseCodes = (raw: string) => raw.split("\n").map((s) => s.trim()).filter(Boolean);

export default function CodesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [newBatch, setNewBatch] = useState({ batch_no: "", customs_declaration: "" });
  const [importForm, setImportForm] = useState({ batch: "", product_id: "", gtin: "", codes: "" });
  const [receiveForm, setReceiveForm] = useState({ batch: "", codes: "" });
  const [outboundForm, setOutboundForm] = useState({ product_id: "", order_id: "", codes: "" });
  const [returnForm, setReturnForm] = useState({ codes: "" });

  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => getData<{ data: Batch[] }>("/batches/list/"),
  });
  const { data: aging } = useQuery({
    queryKey: ["codes-aging"],
    queryFn: () => getData<{ data: { batch_no: string; in_stock: number; age_days: number; aging_bucket: string }[] }>("/codes/aging/"),
  });

  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setError(null);
    setOk(null);
    try {
      await fn();
      setOk(okMsg ?? t("common.success"));
      void qc.invalidateQueries();
    } catch (e) {
      setError(errCode(e) ?? t("errors.generic"));
    }
  };

  return (
    <div>
      <h1>{t("codes.title")}</h1>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert">{ok}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h2>{t("codes.batches")}</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("codes.batchNo")}</th>
                <th>{t("codes.customs")}</th>
                <th>{t("codes.codes")}</th>
                <th>{t("codes.state")}</th>
              </tr>
            </thead>
            <tbody>
              {(batches?.data ?? []).map((b) => (
                <tr key={b.batch_id}>
                  <td>{b.batch_no}</td>
                  <td>{b.customs_declaration || "—"}</td>
                  <td>{b.code_count ?? 0}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row mt">
            <input className="input" style={{ maxWidth: 150 }} placeholder={t("codes.batchNo")} value={newBatch.batch_no} onChange={(e) => setNewBatch((f) => ({ ...f, batch_no: e.target.value }))} />
            <input className="input" style={{ maxWidth: 150 }} placeholder={t("codes.customs")} value={newBatch.customs_declaration} onChange={(e) => setNewBatch((f) => ({ ...f, customs_declaration: e.target.value }))} />
            <button
              className="btn small"
              disabled={!newBatch.batch_no}
              onClick={() =>
                run(async () => {
                  await postData("/batches/", newBatch);
                  setNewBatch({ batch_no: "", customs_declaration: "" });
                })
              }
            >
              {t("codes.createBatch")}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>{t("codes.import")}</h2>
          <div className="field">
            <input className="input" placeholder={t("codes.batchNo")} value={importForm.batch} onChange={(e) => setImportForm((f) => ({ ...f, batch: e.target.value }))} />
          </div>
          <div className="field">
            <input className="input" placeholder={t("codes.productId")} value={importForm.product_id} onChange={(e) => setImportForm((f) => ({ ...f, product_id: e.target.value }))} />
          </div>
          <div className="field">
            <input className="input" placeholder={t("codes.gtin")} value={importForm.gtin} onChange={(e) => setImportForm((f) => ({ ...f, gtin: e.target.value }))} />
          </div>
          <div className="field">
            <textarea className="input" rows={3} placeholder={t("codes.codeValues")} value={importForm.codes} onChange={(e) => setImportForm((f) => ({ ...f, codes: e.target.value }))} />
          </div>
          <button
            className="btn small"
            disabled={!importForm.batch || !importForm.product_id || parseCodes(importForm.codes).length === 0}
            onClick={() =>
              run(
                () =>
                  postData(`/batches/${importForm.batch}/codes/`, {
                    product_id: importForm.product_id,
                    gtin: importForm.gtin,
                    code_values: parseCodes(importForm.codes),
                  }),
                `✓ ${t("codes.import")}`,
              )
            }
          >
            {t("codes.import")}
          </button>
        </div>

        <div className="card">
          <h2>{t("codes.receive")}</h2>
          <div className="field">
            <input className="input" placeholder={t("codes.batchNo")} value={receiveForm.batch} onChange={(e) => setReceiveForm((f) => ({ ...f, batch: e.target.value }))} />
          </div>
          <div className="field">
            <textarea className="input" rows={3} placeholder={`${t("codes.codeValues")}（${t("common.empty")}=${t("common.confirm")}）`} value={receiveForm.codes} onChange={(e) => setReceiveForm((f) => ({ ...f, codes: e.target.value }))} />
          </div>
          <button
            className="btn small"
            disabled={!receiveForm.batch}
            onClick={() =>
              run(() =>
                postData(`/batches/${receiveForm.batch}/receive/`, {
                  code_values: parseCodes(receiveForm.codes).length ? parseCodes(receiveForm.codes) : undefined,
                }),
              )
            }
          >
            {t("codes.receive")}
          </button>
        </div>

        <div className="card">
          <h2>
            {t("codes.outbound")} / {t("codes.return")}
          </h2>
          <div className="field">
            <input className="input" placeholder={t("codes.productId")} value={outboundForm.product_id} onChange={(e) => setOutboundForm((f) => ({ ...f, product_id: e.target.value }))} />
          </div>
          <div className="field">
            <input className="input" placeholder="Order UUID" value={outboundForm.order_id} onChange={(e) => setOutboundForm((f) => ({ ...f, order_id: e.target.value }))} />
          </div>
          <div className="field">
            <textarea className="input" rows={2} placeholder={t("codes.codeValues")} value={outboundForm.codes} onChange={(e) => setOutboundForm((f) => ({ ...f, codes: e.target.value }))} />
          </div>
          <button
            className="btn small"
            disabled={!outboundForm.product_id || !parseCodes(outboundForm.codes).length}
            onClick={() =>
              run(() =>
                postData("/codes/outbound/", {
                  product_id: outboundForm.product_id,
                  order_id: outboundForm.order_id || undefined,
                  code_values: parseCodes(outboundForm.codes),
                }),
              )
            }
          >
            {t("codes.outbound")}
          </button>
          <div className="field mt">
            <textarea className="input" rows={2} placeholder={t("codes.codeValues")} value={returnForm.codes} onChange={(e) => setReturnForm((f) => ({ ...f, codes: e.target.value }))} />
          </div>
          <button
            className="btn small"
            disabled={!parseCodes(returnForm.codes).length}
            onClick={() => run(() => postData("/codes/return/", { code_values: parseCodes(returnForm.codes) }))}
          >
            {t("codes.return")}
          </button>
        </div>

        <div className="card">
          <h2>{t("codes.aging")}</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("codes.batchNo")}</th>
                <th>{t("inventory.balance")}</th>
                <th>{t("codes.aging")}</th>
              </tr>
            </thead>
            <tbody>
              {(aging?.data ?? []).map((a) => (
                <tr key={a.batch_no}>
                  <td>{a.batch_no}</td>
                  <td>{a.in_stock}</td>
                  <td>
                    {a.age_days}d · {a.aging_bucket}
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
