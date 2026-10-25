import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { errCode, getCatalog, getData, patchData, postData } from "@/lib/api";

interface Product {
  product_id: string;
  product_code: string;
  title_ru: string;
  price_amount: string;
  price_expires_at: string;
  is_listed: boolean;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [relist, setRelist] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState("");
  // I2-1 选件器（建品）
  const [pickerOpen, setPickerOpen] = useState(false);
  const [oe, setOe] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ spu_id: string; display_name: string; oe_number: string } | null>(null);
  const [form, setForm] = useState({ title_ru: "", price: "", days: "30" });

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getData<{ results: Product[] }>("/products/"),
  });
  const { data: candidates, refetch: searchCandidates } = useQuery({
    queryKey: ["picker", oe, q],
    queryFn: () =>
      getCatalog<{ data: { spu_id: string; display_name: string; oe_number: string }[] }>(
        "/picker/candidates",
        { oe: oe || undefined, q: q || undefined },
      ),
    enabled: false,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["products"] });
  const wrap = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      invalidate();
    } catch (e) {
      setError(errCode(e) ?? t("errors.generic"));
    }
  };

  const createProduct = useMutation({
    mutationFn: () =>
      postData("/products/", {
        catalog_spu_id: picked!.spu_id,
        title_ru: form.title_ru,
        price_amount: form.price,
        price_days: Number(form.days),
      }),
    onSuccess: () => {
      setPickerOpen(false);
      setPicked(null);
      invalidate();
    },
    onError: (e) => setError(errCode(e) ?? t("errors.generic")),
  });

  const now = new Date().toISOString();

  return (
    <div>
      <div className="row spread">
        <h1>{t("products.title")}</h1>
        <div className="row">
          <button
            className="btn ghost small"
            onClick={() =>
              wrap(() => postData("/pricing/deactivate-expired/"))
            }
          >
            {t("products.deactivateExpired")}
          </button>
          <button className="btn small" onClick={() => setPickerOpen(true)}>
            {t("products.create")}
          </button>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {isLoading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("products.code")}</th>
              <th>{t("products.titleRu")}</th>
              <th>{t("products.price")}</th>
              <th>{t("products.window")}</th>
              <th>{t("products.listed")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.results ?? []).map((p) => {
              const expired = p.price_expires_at < now;
              return (
                <tr key={p.product_id}>
                  <td>{p.product_code}</td>
                  <td>{p.title_ru}</td>
                  <td>{p.price_amount} ₽</td>
                  <td>
                    {p.price_expires_at.slice(0, 10)}{" "}
                    {expired && <span className="badge warn">{t("products.expired")}</span>}
                  </td>
                  <td>
                    <span className={`badge ${p.is_listed ? "ok" : ""}`}>
                      {p.is_listed ? "✓" : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="row">
                      <button
                        className="btn ghost small"
                        onClick={() =>
                          wrap(() => patchData(`/products/${p.product_id}/`, { is_listed: !p.is_listed }))
                        }
                      >
                        {p.is_listed ? t("products.offShelf") : t("products.onShelf")}
                      </button>
                      <button
                        className="btn small"
                        onClick={() => {
                          setRelist(p);
                          setNewPrice(p.price_amount);
                        }}
                      >
                        {t("products.relist")}
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {relist && (
        <div className="card mt" style={{ maxWidth: 420 }}>
          <h2>
            {t("products.relist")} · {relist.product_code}
          </h2>
          <div className="field">
            <label>{t("products.relistPrice")}</label>
            <input className="input" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <div className="row">
            <button
              className="btn"
              onClick={() =>
                wrap(() => postData(`/products/${relist.product_id}/relist/`, { price_amount: newPrice })).then(
                  () => setRelist(null),
                )
              }
            >
              {t("common.save")}
            </button>
            <button className="btn ghost" onClick={() => setRelist(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div className="card mt">
          <h2>{t("products.picker.search")}</h2>
          <div className="row">
            <input className="input" style={{ maxWidth: 200 }} placeholder={t("products.picker.oe")} value={oe} onChange={(e) => setOe(e.target.value)} />
            <input className="input" style={{ maxWidth: 200 }} placeholder={t("products.picker.keyword")} value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn small" onClick={() => void searchCandidates()}>
              {t("products.picker.search")}
            </button>
          </div>
          {(candidates?.data ?? []).length > 0 && (
            <table className="tbl mt">
              <tbody>
                {candidates!.data.map((c) => (
                  <tr key={c.spu_id}>
                    <td>{c.display_name}</td>
                    <td className="muted">OE {c.oe_number}</td>
                    <td>
                      <button
                        className="btn small"
                        onClick={() => {
                          setPicked(c);
                          setForm((f) => ({ ...f, title_ru: c.display_name }));
                        }}
                      >
                        {t("products.picker.select")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {picked && (
            <div className="mt">
              <div className="field">
                <label>{t("products.titleRu")}</label>
                <input className="input" value={form.title_ru} onChange={(e) => setForm((f) => ({ ...f, title_ru: e.target.value }))} />
              </div>
              <div className="row">
                <div className="field">
                  <label>{t("products.price")}</label>
                  <input className="input" style={{ width: 120 }} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="field">
                  <label>{t("products.window")}</label>
                  <input className="input" style={{ width: 90 }} type="number" min={1} max={90} value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} />
                </div>
                <button className="btn" disabled={!form.title_ru || !form.price || createProduct.isPending} onClick={() => createProduct.mutate()}>
                  {t("common.save")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
