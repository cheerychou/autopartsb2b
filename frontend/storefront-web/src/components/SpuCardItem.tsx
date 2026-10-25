import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { Offer, SpuCard } from "@/lib/catalog-types";

/** SPU 卡片（找件/OE/交叉号共用）；价格门控按 offer.price 是否为 null。 */
export default function SpuCardItem({ spu, offer }: { spu: SpuCard; offer?: Offer | null }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <Link to={`/product/${spu.spu_id}`}>
        <div className="row spread">
          <strong>{spu.display_name}</strong>
          <span className="badge muted">{spu.brand?.display_name}</span>
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          OE {spu.oe_number}
          {spu.name_chain?.some((n) => n.name_type === "alias") && (
            <span>
              {" · "}
              {spu.name_chain.find((n) => n.name_type === "alias")?.name}
            </span>
          )}
        </div>
      </Link>
      <div className="row spread" style={{ marginTop: 10 }}>
        {offer ? (
          offer.price ? (
            <span className="price">{offer.price} ₽</span>
          ) : (
            <span className="price login-gate">{t("auth.priceLoginRequired")}</span>
          )
        ) : (
          <span className="muted">—</span>
        )}
        {offer && (
          <span className={offer.quantity_available > 0 ? "badge ok" : "badge"}>
            {offer.quantity_available > 0
              ? t("product.inStock", { n: offer.quantity_available })
              : t("product.outOfStock")}
          </span>
        )}
      </div>
    </div>
  );
}
