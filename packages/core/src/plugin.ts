import type { EventContext, EventMap, EventName, UserProperties } from "./types";

/**
 * Interface that all Funnel plugins must implement.
 *
 * @remarks
 * Each analytics platform (GA4, Meta Pixel, etc.) implements this interface
 * and registers with a {@link Funnel} instance.
 *
 * @example
 * ```ts
 * const myPlugin: FunnelPlugin = {
 *   name: "my-plugin",
 *   initialize(config) { ... },
 *   track(eventName, params, context) { ... },
 * };
 * ```
 */
export interface FunnelPlugin {
  /** Unique plugin name. Also used as the key for plugin-specific configuration. */
  name: string;

  /**
   * Initializes the plugin.
   *
   * @param config - Plugin-specific configuration object.
   */
  initialize(config: Record<string, unknown>): void;

  /**
   * Tracks an event.
   *
   * @typeParam E - The event name type.
   * @param eventName - Name of the event to track.
   * @param params - Parameters corresponding to the event.
   * @param context - Event context containing metadata such as `eventId`.
   */
  track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void;

  /**
   * Sets user identity and properties for this plugin.
   *
   * @remarks
   * Optional. Plugins that don't support user identification
   * (e.g., Kakao Pixel, Naver Ad) should omit this method.
   *
   * @param properties - User properties following the GA4 model.
   */
  setUser?(properties: UserProperties): void;

  /**
   * Clears user identity for this plugin (logout scenario).
   *
   * @remarks
   * Optional. Plugins should reset any stored user state.
   */
  resetUser?(): void;
}
