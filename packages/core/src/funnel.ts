import type { FunnelPlugin } from "./plugin";
import type { EventContext, EventMap, EventName, UserProperties } from "./types";

/**
 * Generates a unique event ID for deduplication across client and server.
 *
 * @returns A UUID string.
 *
 * @internal
 */
function generateEventId(): string {
  const g = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
 * import { Funnel } from "@sunwjy/funnel-core";
 * import { createGA4Plugin } from "@sunwjy/funnel-client/ga4";
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
  private userProperties: UserProperties | null = null;

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

    // Replay stored user properties to newly initialized plugins
    if (this.userProperties) {
      for (const plugin of this.plugins) {
        if (!plugin.setUser) continue;
        try {
          plugin.setUser(this.userProperties);
        } catch (error) {
          console.error(
            `[funnel] Plugin "${plugin.name}" failed to setUser during initialize`,
            error,
          );
        }
      }
    }
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

    const context: EventContext = { eventId: generateEventId() };

    for (const plugin of this.plugins) {
      try {
        plugin.track(eventName, params, context);
        if (this.debug) {
          console.log(`[funnel] "${plugin.name}" tracked "${eventName}"`, params);
        }
      } catch (error) {
        console.error(`[funnel] Plugin "${plugin.name}" failed to track "${eventName}"`, error);
      }
    }
  }

  /**
   * Sets user identity and properties across all plugins.
   *
   * @remarks
   * If called before {@link initialize}, the properties are stored and
   * replayed to each plugin during initialization.
   * Follows the GA4 user properties model as the canonical format.
   *
   * @param properties - User properties following the GA4 model.
   */
  setUser(properties: UserProperties): void {
    this.userProperties = properties;

    if (!this.initialized) {
      if (this.debug) {
        console.log("[funnel] setUser stored (will apply after initialize)");
      }
      return;
    }

    for (const plugin of this.plugins) {
      if (!plugin.setUser) continue;
      try {
        plugin.setUser(properties);
        if (this.debug) {
          console.log(`[funnel] "${plugin.name}" setUser`, properties);
        }
      } catch (error) {
        console.error(`[funnel] Plugin "${plugin.name}" failed to setUser`, error);
      }
    }
  }

  /**
   * Clears user identity across all plugins (logout scenario).
   *
   * @remarks
   * Clears stored user properties and calls `resetUser()` on each plugin
   * that implements it.
   */
  resetUser(): void {
    this.userProperties = null;

    if (!this.initialized) {
      return;
    }

    for (const plugin of this.plugins) {
      if (!plugin.resetUser) continue;
      try {
        plugin.resetUser();
        if (this.debug) {
          console.log(`[funnel] "${plugin.name}" resetUser`);
        }
      } catch (error) {
        console.error(`[funnel] Plugin "${plugin.name}" failed to resetUser`, error);
      }
    }
  }
}
