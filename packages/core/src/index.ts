/**
 * `@sunwjy/funnel-core` — Core package for the marketing funnel event tracking library.
 *
 * @remarks
 * Provides a plugin-based architecture to send events to multiple analytics
 * platforms (GA4, Meta Pixel, etc.) through a unified interface.
 *
 * @packageDocumentation
 */

export type { FunnelConfig, FunnelErrorContext } from "./funnel";
export { Funnel } from "./funnel";
export { hashPii, normalizePii } from "./hash";
export type { FunnelPlugin } from "./plugin";
export type {
  AddPaymentInfoParams,
  AddShippingInfoParams,
  AddToCartParams,
  AddToWishlistParams,
  BaseEventParams,
  BeginCheckoutParams,
  EventContext,
  EventMap,
  EventName,
  GenerateLeadParams,
  Item,
  LoginParams,
  PageViewParams,
  PurchaseParams,
  RefundParams,
  RemoveFromCartParams,
  SearchParams,
  SelectItemParams,
  SelectPromotionParams,
  ShareParams,
  SignUpParams,
  UserProperties,
  ViewCartParams,
  ViewItemListParams,
  ViewItemParams,
  ViewPromotionParams,
  ViewSearchResultsParams,
} from "./types";
