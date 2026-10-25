import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import SpuCardItem from "@/components/SpuCardItem";
import { getData } from "@/lib/api";
import type { SpuCard } from "@/lib/catalog-types";

interface SearchResp {
  data: { direct: SpuCard[]; cross_reference: SpuCard[] };
  meta: { total: number };
}

export default function SearchOePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["oe", q],
    queryFn: () => getData<SearchResp>("/store/search/oe", { q }),
    enabled: q.length >= 4,
  });

  if (q.length < 4) return <p className="alert">{t("search.tooShort")}</p>;
  if (isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (isError || !data) return <p className="alert error">{t("errors.generic", { code: "network" })}</p>;

  return (
    <div>
      <h1>{t("search.results")}</h1>
      {(data.data.direct.length === 0 && data.data.cross_reference.length === 0) && (
        <p className="muted">{t("search.empty")}</p>
      )}
      {data.data.direct.length > 0 && (
        <>
          <h2>{t("search.direct")}</h2>
          <div className="grid cols-3">
            {data.data.direct.map((s) => (
              <SpuCardItem key={s.spu_id} spu={s} />
            ))}
          </div>
        </>
      )}
      {data.data.cross_reference.length > 0 && (
        <>
          <h2>{t("search.cross")}</h2>
          <div className="grid cols-3">
            {data.data.cross_reference.map((s) => (
              <SpuCardItem key={s.spu_id} spu={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
