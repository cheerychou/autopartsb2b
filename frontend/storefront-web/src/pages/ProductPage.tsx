import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";
import type { BuyerMeta, NameChainItem, Offer } from "@/lib/catalog-types";
import { useAuth } from "@/stores/auth";

interface ProductResp {
  data: {
    spu_id: string;
    display_name: string;
    oe_number: string;
    name_chain: NameChainItem[];
    brand: { brand_id: string; display_name: string };
    gtin: string;
    attributes: { code: string; name: string; value: string }[];
    offer: Offer | null;
  };
  meta: BuyerMeta;
}

export default function ProductPage() {
  const { t } = useTranslation();
  const { spuId } = useParams<{ spuId: string }>();
  const navigate = useNavigate();
  const loggedIn = useAuth((s) => s.loggedIn);
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", spuId],
    queryFn: () => getData<ProductResp>(`/store/products/${spuId}`),
    enabled: !!spuId,
  });

  const addCart = useMutation({
    mutationFn: () =>
      postData("/cart/add", { product_id: data!.data.offer!.product_id, quantity: qty }),
    onSuccess: () => setNotice(t("product.added")),
    onError: (e) => {
      const code = errCode(e);
      if (code === "LOGIN_REQUIRED") void navigate("/login");
      else setNotice(t("errors.generic", { code: code ?? "network" }));
    },
  });

  if (isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (isError || !data)
    return (
      <p className="alert error">
        {t("product.notFound")} · <Link to="/">{t("common.back")}</Link>
      </p>
    );
  const { offer, ...card } = data.data;
  const alias = card.name_chain?.find((n) => n.name_type === "alias");

  return (
    <div>
      <h1>{card.display_name}</h1>
      {alias && <p className="muted">{alias.name}</p>}
      <div className="card">
        <div className="row spread">
          <span className="muted">
            {t("product.oe")}: <strong>{card.oe_number}</strong> · {t("product.brand")}:{" "}
            <strong>{card.brand?.display_name}</strong>
            {card.gtin ? ` · ${t("product.gtin")}: ${card.gtin}` : ""}
          </span>
        </div>
        <div className="row spread" style={{ marginTop: 12 }}>
          {offer ? (
            <>
              {offer.price ? (
                <span className="price">{offer.price} ₽</span>
              ) : (
                <span className="price login-gate">{t("auth.priceLoginRequired")}</span>
              )}
              <span className={offer.quantity_available > 0 ? "badge ok" : "badge"}>
                {offer.quantity_available > 0
                  ? t("product.inStock", { n: offer.quantity_available })
                  : t("product.outOfStock")}
              </span>
            </>
          ) : (
            <span className="muted">{t("product.notFound")}</span>
          )}
        </div>
        {offer && offer.quantity_available > 0 && (
          <div className="row mt">
            <input
              className="input"
              style={{ width: 90 }}
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            />
            <button className="btn" disabled={!loggedIn || addCart.isPending} onClick={() => addCart.mutate()}>
              {t("product.addToCart")}
            </button>
            {!loggedIn && <span className="muted">{t("auth.loginRequired")}</span>}
          </div>
        )}
        {notice && <div className="alert">{notice}</div>}
      </div>

      {card.attributes.length > 0 && (
        <>
          <h2>{t("product.attributes")}</h2>
          <table className="tbl">
            <tbody>
              {card.attributes.map((a) => (
                <tr key={a.code}>
                  <th style={{ width: 240 }}>{a.name}</th>
                  <td>{a.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
