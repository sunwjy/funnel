// GA4-based Item interface
export interface Item {
  item_id: string;
  item_name: string;
  affiliation?: string;
  coupon?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  quantity?: number;
  promotion_id?: string;
  promotion_name?: string;
  creative_name?: string;
  creative_slot?: string;
}

// Base params shared across events
export interface BaseEventParams {
  [key: string]: unknown;
}

// Marketing funnel event parameter types (GA4-based)
export interface PageViewParams extends BaseEventParams {
  page_title?: string;
  page_location?: string;
  page_referrer?: string;
}

export interface ViewPromotionParams extends BaseEventParams {
  items?: Item[];
  promotion_id?: string;
  promotion_name?: string;
  creative_name?: string;
  creative_slot?: string;
  location_id?: string;
}

export interface SelectPromotionParams extends BaseEventParams {
  items?: Item[];
  promotion_id?: string;
  promotion_name?: string;
  creative_name?: string;
  creative_slot?: string;
  location_id?: string;
}

export interface SignUpParams extends BaseEventParams {
  method?: string;
}

export interface GenerateLeadParams extends BaseEventParams {
  currency?: string;
  value?: number;
}

export interface SearchParams extends BaseEventParams {
  search_term: string;
}

export interface ViewItemListParams extends BaseEventParams {
  items?: Item[];
  item_list_id?: string;
  item_list_name?: string;
}

export interface SelectItemParams extends BaseEventParams {
  items?: Item[];
  item_list_id?: string;
  item_list_name?: string;
}

export interface ViewItemParams extends BaseEventParams {
  currency?: string;
  value?: number;
  items?: Item[];
}

export interface AddToCartParams extends BaseEventParams {
  currency?: string;
  value?: number;
  items?: Item[];
}

export interface RemoveFromCartParams extends BaseEventParams {
  currency?: string;
  value?: number;
  items?: Item[];
}

export interface BeginCheckoutParams extends BaseEventParams {
  currency?: string;
  value?: number;
  coupon?: string;
  items?: Item[];
}

export interface AddShippingInfoParams extends BaseEventParams {
  currency?: string;
  value?: number;
  coupon?: string;
  shipping_tier?: string;
  items?: Item[];
}

export interface AddPaymentInfoParams extends BaseEventParams {
  currency?: string;
  value?: number;
  coupon?: string;
  payment_type?: string;
  items?: Item[];
}

export interface PurchaseParams extends BaseEventParams {
  currency?: string;
  value?: number;
  transaction_id?: string;
  coupon?: string;
  shipping?: number;
  tax?: number;
  items?: Item[];
}

export interface RefundParams extends BaseEventParams {
  currency?: string;
  value?: number;
  transaction_id?: string;
  coupon?: string;
  shipping?: number;
  tax?: number;
  items?: Item[];
}

// Event name to params mapping
export interface EventMap {
  page_view: PageViewParams;
  view_promotion: ViewPromotionParams;
  select_promotion: SelectPromotionParams;
  sign_up: SignUpParams;
  generate_lead: GenerateLeadParams;
  search: SearchParams;
  view_item_list: ViewItemListParams;
  select_item: SelectItemParams;
  view_item: ViewItemParams;
  add_to_cart: AddToCartParams;
  remove_from_cart: RemoveFromCartParams;
  begin_checkout: BeginCheckoutParams;
  add_shipping_info: AddShippingInfoParams;
  add_payment_info: AddPaymentInfoParams;
  purchase: PurchaseParams;
  refund: RefundParams;
}

export type EventName = keyof EventMap;
