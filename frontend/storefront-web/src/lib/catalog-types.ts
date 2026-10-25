/**
 * I1/storefront 响应形状（过渡手写）。
 *
 * 依据：29号契约 + 后端实现；schema.yml 对裸 @api_view 的响应缺位
 * （31号§八待办：契约面补全），补全后切换为 generated/api-types。
 */
export interface NameChainItem {
  market: string;
  locale: string;
  name_type: string;
  name: string;
  source: string;
}

export interface SpuCard {
  spu_id: string;
  spu_code: string;
  display_name: string;
  name_chain: NameChainItem[];
  oe_number: string;
  brand: { brand_id: string; display_name: string };
  gtin: string;
  harmonized_code: string;
  spu_image: string | null;
  fitment?: {
    fitment_id: string;
    qualifiers: Record<string, unknown>;
    fitment_type: string;
    year_from: number | null;
    year_to: number | null;
    verified_status: string;
  };
}

export interface Offer {
  product_id: string;
  title_ru: string;
  quantity_available: number;
  price: string | null;
  price_expires_at?: string;
}

export interface BrandBrief {
  brand_id: string;
  brand_code: string;
  display_name: string;
  brand_letter: string;
}

export interface SeriesBrief {
  series_id: string;
  series_code: string;
  display_name: string;
  vehicle_class: string;
  year_from: number | null;
  year_to: number | null;
}

export interface ModelBrief {
  model_id: string;
  model_code: string;
  display_name: string;
  spec_summary: string;
  status: string;
}

export interface CategoryNode {
  category_id: string;
  category_code: string;
  display_name: string;
  category_level: string;
  node_type: string;
}

export interface CartLine {
  product_id: string;
  title_ru: string;
  quantity: number;
  unit_price: string;
  line_amount: string;
}

export interface OrderBrief {
  order_id: string;
  order_no: string;
  status: string;
  total_amount: string;
  created_at: string;
}

export interface OrderDetail extends OrderBrief {
  payment_method: string;
  tracking_no: string;
  carrier: string;
  shipping_address: string;
  items: { title_ru: string; quantity: number; unit_price: string; line_amount: string }[];
}

export interface BuyerMeta {
  buyer_kind: "guest" | "individual" | "corporate";
  can_see_price: boolean;
  can_order: boolean;
  catalog_version: string;
  locale: string;
  total?: number | null;
}

export function metaOf<T extends { meta: BuyerMeta }>(resp: T): BuyerMeta {
  return resp.meta;
}
