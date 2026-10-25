import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getData, postData } from "@/lib/api";
import type { BuyerMeta, CartLine } from "@/lib/catalog-types";

interface CartResp {
  data: CartLine[];
  meta: BuyerMeta;
}

export default function CartPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => getData<CartResp>("/cart"),
  });

  const remove = useMutation({
    mutationFn: (productId: string) => postData("/cart/remove", { product_id: productId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  if (isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (!data || data.data.length === 0)
    return (
      <div>
        <h1>{t("nav.cart")}</h1>
        <p className="muted">{t("cart.empty")}</p>
      </div>
    );

  return (
    <div>
      <h1>{t("nav.cart")}</h1>
      <table className="tbl">
        <thead>
          <tr>
            <th>{t("product.oe")}</th>
            <th>{t("common.amount")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.data.map((l) => (
            <tr key={l.product_id}>
              <td>{l.title_ru}</td>
              <td>
                {l.quantity} × {l.unit_price} ₽ = <strong>{l.line_amount} ₽</strong>
              </td>
              <td>
                <button className="btn danger small" onClick={() => remove.mutate(l.product_id)}>
                  {t("cart.remove")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row spread mt">
        <span className="price">
          {t("cart.total")}: {(data.meta.total ?? 0)} ₽
        </span>
        <Link to="/checkout" className="btn">
          {t("cart.checkout")}
        </Link>
      </div>
    </div>
  );
}
