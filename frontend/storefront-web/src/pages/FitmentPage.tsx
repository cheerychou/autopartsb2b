import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import SpuCardItem from "@/components/SpuCardItem";
import { getCatalog } from "@/lib/api";
import type { BrandBrief, CategoryNode, ModelBrief, SeriesBrief, SpuCard } from "@/lib/catalog-types";

interface FitmentResp {
  data: (SpuCard & { fitment: { year_from: number | null; year_to: number | null } })[];
  meta: { total: number };
}

export default function FitmentPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const brand = params.get("brand") ?? "";
  const series = params.get("series") ?? "";
  const model = params.get("model") ?? "";
  const category = params.get("category") ?? "";

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    // 上游条件变更时清空下游选择
    const order = ["brand", "series", "model", "category"];
    for (const k2 of order.slice(order.indexOf(k) + 1)) next.delete(k2);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => getCatalog<{ data: BrandBrief[] }>("/brands"),
  });
  const { data: seriesList } = useQuery({
    queryKey: ["series", brand],
    queryFn: () => getCatalog<{ data: SeriesBrief[] }>(`/brands/${brand}/series`),
    enabled: !!brand,
  });
  const { data: models } = useQuery({
    queryKey: ["models", series],
    queryFn: () => getCatalog<{ data: ModelBrief[] }>(`/series/${series}/models`),
    enabled: !!series,
  });
  const { data: tree } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCatalog<{ data: CategoryNode[] }>("/categories/tree"),
  });
  const { data: fitments, isLoading } = useQuery({
    queryKey: ["fitments", model, category],
    queryFn: () => getCatalog<FitmentResp>("/fitments", { model_id: model, category_id: category || undefined }),
    enabled: !!model,
  });

  const leafCategories = (tree?.data ?? []).filter((c) => c.node_type === "leaf");

  return (
    <div>
      <h1>{t("nav.fitment")}</h1>
      <div className="card">
        <div className="row">
          <select className="input" style={{ maxWidth: 200 }} value={brand} onChange={(e) => set("brand", e.target.value)}>
            <option value="">{t("fitment.stepBrand")}</option>
            {(brands?.data ?? []).map((b) => (
              <option key={b.brand_id} value={b.brand_id}>
                {b.display_name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 220 }} value={series} onChange={(e) => set("series", e.target.value)} disabled={!brand}>
            <option value="">{t("fitment.stepSeries")}</option>
            {(seriesList?.data ?? []).map((s) => (
              <option key={s.series_id} value={s.series_id}>
                {s.display_name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 260 }} value={model} onChange={(e) => set("model", e.target.value)} disabled={!series}>
            <option value="">{t("fitment.selectModel")}</option>
            {(models?.data ?? []).map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.display_name}
                {m.spec_summary ? ` · ${m.spec_summary}` : ""}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 220 }} value={category} onChange={(e) => set("category", e.target.value)} disabled={!model}>
            <option value="">{t("fitment.allCategories")}</option>
            {leafCategories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt">
        {!model ? (
          <p className="muted">{t("fitment.selectModel")}</p>
        ) : isLoading ? (
          <p className="muted">{t("common.loading")}</p>
        ) : (fitments?.data.length ?? 0) === 0 ? (
          <p className="muted">{t("fitment.empty")}</p>
        ) : (
          <div className="grid cols-3">
            {fitments!.data.map((f) => (
              <SpuCardItem key={f.fitment?.fitment_id ?? f.spu_id} spu={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
