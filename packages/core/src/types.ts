/**
 * Represents a product/item based on the GA4 Item schema.
 *
 * @remarks
 * Follows the Google Analytics 4 item structure and is used
 * to pass product data in ecommerce events.
 *
 * @see {@link https://developers.google.com/analytics/devguides/collection/ga4/reference/events | GA4 Event Reference}
 */
export interface Item {
  /** Unique identifier for the item (e.g., SKU). */
  item_id: string;
  /** Name of the item. */
  item_name: string;
  /** Product affiliation or store name. */
  affiliation?: string;
  /** Coupon code applied to the item. */
  coupon?: string;
  /** Discount amount associated with the item. */
  discount?: number;
  /** Index/position of the item in a list (0-based). */
  index?: number;
  /** Brand of the item. */
  item_brand?: string;
  /** Primary category of the item. */
  item_category?: string;
  /** Secondary category of the item. */
  item_category2?: string;
  /** Tertiary category of the item. */
  item_category3?: string;
  /** Quaternary category of the item. */
  item_category4?: string;
  /** Quinary category of the item. */
  item_category5?: string;
  /** ID of the list the item belongs to. */
  item_list_id?: string;
  /** Name of the list the item belongs to. */
  item_list_name?: string;
  /** Variant of the item (e.g., color, size). */
  item_variant?: string;
  /** Physical location ID associated with the item. */
  location_id?: string;
  /** Unit price of the item. */
  price?: number;
  /** Quantity of the item. */
  quantity?: number;
  /** Promotion ID associated with the item. */
  promotion_id?: string;
  /** Promotion name associated with the item. */
  promotion_name?: string;
  /** Name of the promotional creative. */
  creative_name?: string;
  /** Slot of the promotional creative. */
  creative_slot?: string;
}

/**
 * Base interface for all event parameters.
 *
 * @remarks
 * Includes an index signature to allow custom properties.
 */
export interface BaseEventParams {
  [key: string]: unknown;
}

/**
 * Parameters for the `page_view` event.
 *
 * @remarks
 * Sent when a page is viewed. Contains page title, URL, and referrer information.
 */
export interface PageViewParams extends BaseEventParams {
  /** Title of the page. */
  page_title?: string;
  /** Full URL of the page. */
  page_location?: string;
  /** URL of the previous page (referrer). */
  page_referrer?: string;
}

/**
 * Parameters for the `view_promotion` event.
 *
 * @remarks
 * Sent when a promotion is displayed to the user.
 */
export interface ViewPromotionParams extends BaseEventParams {
  /** Items included in the promotion. */
  items?: Item[];
  /** Promotion ID. */
  promotion_id?: string;
  /** Promotion name. */
  promotion_name?: string;
  /** Name of the promotional creative. */
  creative_name?: string;
  /** Slot of the promotional creative. */
  creative_slot?: string;
  /** Location ID associated with the promotion. */
  location_id?: string;
}

/**
 * Parameters for the `select_promotion` event.
 *
 * @remarks
 * Sent when a user clicks or selects a promotion.
 */
export interface SelectPromotionParams extends BaseEventParams {
  /** Items included in the promotion. */
  items?: Item[];
  /** Promotion ID. */
  promotion_id?: string;
  /** Promotion name. */
  promotion_name?: string;
  /** Name of the promotional creative. */
  creative_name?: string;
  /** Slot of the promotional creative. */
  creative_slot?: string;
  /** Location ID associated with the promotion. */
  location_id?: string;
}

/**
 * Parameters for the `sign_up` event.
 *
 * @remarks
 * Sent when a user completes the sign-up process.
 */
export interface SignUpParams extends BaseEventParams {
  /** Sign-up method (e.g., "google", "email"). */
  method?: string;
}

/**
 * Parameters for the `generate_lead` event.
 *
 * @remarks
 * Sent when a lead is generated.
 */
export interface GenerateLeadParams extends BaseEventParams {
  /** Currency code (e.g., "USD", "KRW"). */
  currency?: string;
  /** Monetary value of the lead. */
  value?: number;
}

/**
 * Parameters for the `search` event.
 *
 * @remarks
 * Sent when a user performs a search.
 */
export interface SearchParams extends BaseEventParams {
  /** The search query string. */
  search_term: string;
}

/**
 * Parameters for the `view_item_list` event.
 *
 * @remarks
 * Sent when a product list (e.g., category page) is viewed.
 */
export interface ViewItemListParams extends BaseEventParams {
  /** Items displayed in the list. */
  items?: Item[];
  /** ID of the item list. */
  item_list_id?: string;
  /** Name of the item list. */
  item_list_name?: string;
}

/**
 * Parameters for the `select_item` event.
 *
 * @remarks
 * Sent when an item is selected from a list.
 */
export interface SelectItemParams extends BaseEventParams {
  /** The selected item(s). */
  items?: Item[];
  /** ID of the list the item was selected from. */
  item_list_id?: string;
  /** Name of the list the item was selected from. */
  item_list_name?: string;
}

/**
 * Parameters for the `view_item` event.
 *
 * @remarks
 * Sent when a product detail page is viewed.
 */
export interface ViewItemParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Monetary value of the item. */
  value?: number;
  /** The viewed item(s). */
  items?: Item[];
}

/**
 * Parameters for the `add_to_cart` event.
 *
 * @remarks
 * Sent when an item is added to the cart.
 */
export interface AddToCartParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Total value of items added to the cart. */
  value?: number;
  /** Items added to the cart. */
  items?: Item[];
}

/**
 * Parameters for the `remove_from_cart` event.
 *
 * @remarks
 * Sent when an item is removed from the cart.
 */
export interface RemoveFromCartParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Total value of items removed from the cart. */
  value?: number;
  /** Items removed from the cart. */
  items?: Item[];
}

/**
 * Parameters for the `begin_checkout` event.
 *
 * @remarks
 * Sent when the checkout process is initiated.
 */
export interface BeginCheckoutParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Total checkout value. */
  value?: number;
  /** Applied coupon code. */
  coupon?: string;
  /** Items in the checkout. */
  items?: Item[];
}

/**
 * Parameters for the `add_shipping_info` event.
 *
 * @remarks
 * Sent when shipping information is submitted.
 */
export interface AddShippingInfoParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Total checkout value. */
  value?: number;
  /** Applied coupon code. */
  coupon?: string;
  /** Shipping tier (e.g., "express", "standard"). */
  shipping_tier?: string;
  /** Items being shipped. */
  items?: Item[];
}

/**
 * Parameters for the `add_payment_info` event.
 *
 * @remarks
 * Sent when payment information is submitted.
 */
export interface AddPaymentInfoParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Total checkout value. */
  value?: number;
  /** Applied coupon code. */
  coupon?: string;
  /** Payment method (e.g., "credit_card", "paypal"). */
  payment_type?: string;
  /** Items being purchased. */
  items?: Item[];
}

/**
 * Parameters for the `purchase` event.
 *
 * @remarks
 * Sent when a purchase is completed.
 */
export interface PurchaseParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Total purchase value (including shipping and tax). */
  value?: number;
  /** Unique transaction identifier. */
  transaction_id?: string;
  /** Applied coupon code. */
  coupon?: string;
  /** Shipping cost. */
  shipping?: number;
  /** Tax amount. */
  tax?: number;
  /** Purchased items. */
  items?: Item[];
}

/**
 * Parameters for the `refund` event.
 *
 * @remarks
 * Sent when a refund is processed.
 */
export interface RefundParams extends BaseEventParams {
  /** Currency code. */
  currency?: string;
  /** Refund amount. */
  value?: number;
  /** Original transaction identifier. */
  transaction_id?: string;
  /** Applied coupon code. */
  coupon?: string;
  /** Refunded shipping cost. */
  shipping?: number;
  /** Refunded tax amount. */
  tax?: number;
  /** Refunded items. */
  items?: Item[];
}

/**
 * Mapping of event names to their corresponding parameter types.
 *
 * @remarks
 * Defines the complete event schema for the marketing funnel.
 * Used by {@link Funnel.track} to provide type-safe event tracking.
 */
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

/**
 * Union type of all supported event names.
 *
 * @remarks
 * Automatically inferred from the keys of {@link EventMap}.
 */
export type EventName = keyof EventMap;

/**
 * Context object passed alongside event parameters to each plugin.
 *
 * @remarks
 * Generated by the {@link Funnel} dispatcher on every `track()` call.
 * Contains metadata that is not part of the GA4 event schema but is
 * needed for cross-platform features like server-side event deduplication.
 */
export interface EventContext {
  /** Unique identifier for the event, used for deduplication (e.g., Meta CAPI). */
  eventId: string;
}

/**
 * User properties following the GA4 user data model.
 *
 * @remarks
 * The `user_id` field is GA4's top-level user identifier.
 * Well-known PII fields (`email`, `phone_number`, `first_name`, `last_name`)
 * are typed explicitly because many platforms consume them for advanced
 * matching and enhanced conversions.
 * Additional custom user properties are supported via the index signature.
 */
export interface UserProperties {
  /** Stable, cross-device user identifier (GA4 user_id). */
  user_id?: string;
  /** Email address. Used for advanced matching on Meta, TikTok, X, Google Ads. */
  email?: string;
  /** Phone number in E.164 format. Used for advanced matching. */
  phone_number?: string;
  /** First name. Used for Meta Advanced Matching and Google Enhanced Conversions. */
  first_name?: string;
  /** Last name. Used for Meta Advanced Matching and Google Enhanced Conversions. */
  last_name?: string;
  /** Arbitrary custom user properties. */
  [key: string]: unknown;
}
