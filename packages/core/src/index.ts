/**
 * `@sunwjy/funnel-core` — Core package for the marketing funnel event tracking library.
 *
 * @remarks
 * Provides a plugin-based architecture to send events to multiple analytics
 * platforms (GA4, Meta Pixel, etc.) through a unified interface.
 *
 * @packageDocumentation
 */

export type { FunnelConfig } from "./funnel";
export { Funnel } from "./funnel";
export type { FunnelPlugin } from "./plugin";
export type {
  AddPaymentInfoParams,
  AddShippingInfoParams,
  AddToCartParams,
  BaseEventParams,
  BeginCheckoutParams,
  EventContext,
  EventMap,
  EventName,
  GenerateLeadParams,
  Item,
  PageViewParams,
  PurchaseParams,
  RefundParams,
  RemoveFromCartParams,
  SearchParams,
  SelectItemParams,
  SelectPromotionParams,
  SignUpParams,
  UserProperties,
  ViewItemListParams,
  ViewItemParams,
  ViewPromotionParams,
} from "./types";
