import type { FunnelPlugin } from "./plugin";
import type { EventMap, EventName } from "./types";

/**
 * Configuration object passed to the {@link Funnel} constructor.
 */
export interface FunnelConfig {
  /** List of plugins to register. */
  plugins: FunnelPlugin[];
  /** When `true`, debug logs are printed to the console. @defaultValue `false` */
  debug?: boolean;
}

/**
 * Core class that dispatches marketing funnel events to multiple analytics platforms.
 *
 * @remarks
 * Delegates events to all registered plugins and isolates individual plugin errors
 * so that one failing plugin does not block the others.
 *
 * @example
 * ```ts
 * import { Funnel } from "@funnel/core";
 * import { createGA4Plugin } from "@funnel/plugin-ga4";
 *
 * const funnel = new Funnel({
 *   plugins: [createGA4Plugin()],
 *   debug: true,
 * });
 *
 * funnel.initialize({ ga4: { measurementId: "G-XXXXXXX" } });
 * funnel.track("purchase", { currency: "KRW", value: 29000 });
 * ```
 */
export class Funnel {
  private plugins: FunnelPlugin[] = [];
  private debug: boolean;
  private initialized = false;

  /**
   * Creates a new Funnel instance.
   *
   * @param config - Configuration containing the plugin list and debug flag.
   */
  constructor(config: FunnelConfig) {
    this.plugins = config.plugins;
    this.debug = config.debug ?? false;
  }

  /**
   * Initializes all registered plugins.
   *
   * @remarks
   * Passes the configuration from `pluginConfigs[plugin.name]` to each plugin's
   * {@link FunnelPlugin.initialize} method.
   * {@link track} will not work until this method has been called.
   *
   * @param pluginConfigs - A map of plugin names to their configuration objects.
   */
  initialize(pluginConfigs?: Record<string, Record<string, unknown>>): void {
    for (const plugin of this.plugins) {
      const config = pluginConfigs?.[plugin.name] ?? {};
      plugin.initialize(config);
      if (this.debug) {
        console.log(`[funnel] Plugin "${plugin.name}" initialized`);
      }
    }
    this.initialized = true;
  }

  /**
   * Sends an event to all registered plugins.
   *
   * @remarks
   * Errors thrown by individual plugins are logged via `console.error`
   * and do not affect other plugins.
   *
   * @typeParam E - The event name type.
   * @param eventName - Name of the event to track.
   * @param params - Parameters corresponding to the event.
   */
  track<E extends EventName>(eventName: E, params: EventMap[E]): void {
    if (!this.initialized) {
      console.warn("[funnel] Not initialized. Call initialize() first.");
      return;
    }
    for (const plugin of this.plugins) {
      try {
        plugin.track(eventName, params);
        if (this.debug) {
          console.log(`[funnel] "${plugin.name}" tracked "${eventName}"`, params);
        }
      } catch (error) {
        console.error(`[funnel] Plugin "${plugin.name}" failed to track "${eventName}"`, error);
      }
    }
  }
}
