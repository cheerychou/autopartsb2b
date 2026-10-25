import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { errCode, getData, postData } from "@/lib/api";
import type { BuyerMeta, CartLine } from "@/lib/catalog-types";

interface CheckoutResp {
  data: { order_no: string; status: string; total_amount: string; payment_hint: string };
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<CheckoutResp["data"] | null>(null);

  const { data: cart } = useQuery({ queryKey: ["cart"], queryFn: () => getData<{ data: CartLine[]; meta: BuyerMeta }>("/cart") });

  const place = useMutation({
    mutationFn: () => postData<CheckoutResp>("/checkout", { shipping_address: address, payment_method: "bank_transfer" }),
    onSuccess: (resp) => {
      setPlaced(resp.data);
      void qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e) => {
      const code = errCode(e);
      if (code === "LOGIN_REQUIRED") void navigate("/login");
      else setError(t(`errors.${code ?? "generic"}`, { code: code ?? "network" }));
    },
  });

  if (placed)
    return (
      <div className="card center" style={{ maxWidth: 520, margin: "40px auto" }}>
        <h1>{t("checkout.success")}</h1>
        <p>
          {t("checkout.orderNo")}: <strong>{placed.order_no}</strong>
        </p>
        <p className="price">
          {t("cart.total")}: {placed.total_amount} ₽
        </p>
        {placed.payment_hint && <p className="muted">{placed.payment_hint}</p>}
        <Link className="btn" to="/orders">
          {t("checkout.goOrders")}
        </Link>
      </div>
    );

  const blocked = cart && !cart.meta.can_order;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1>{t("checkout.title")}</h1>
      {blocked && (
        <div className="alert">
          {cart!.meta.buyer_kind === "corporate"
            ? t("auth.corporatePending")
            : t("auth.loginRequired")}
        </div>
      )}
      {(cart?.data.length ?? 0) === 0 && <p className="muted">{t("cart.empty")}</p>}
      <div className="card">
        <div className="field">
          <label>{t("checkout.address")}</label>
          <textarea
            className="input"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("checkout.payment")}</label>
          <select className="input" defaultValue="bank_transfer">
            <option value="bank_transfer">{t("checkout.bankTransfer")}</option>
          </select>
          <p className="muted" style={{ marginTop: 6 }}>
            {t("checkout.paymentHint")}
          </p>
        </div>
        {error && <div className="alert error">{error}</div>}
        <button
          className="btn"
          disabled={!address.trim() || blocked || (cart?.data.length ?? 0) === 0 || place.isPending}
          onClick={() => place.mutate()}
        >
          {t("checkout.place")}
        </button>
      </div>
    </div>
  );
}
