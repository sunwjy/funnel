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
 * Context object passed to {@link FunnelConfig.onError | onError} when a
 * plugin throws.
 */
export interface FunnelErrorContext {
  /** Plugin name where the error originated. */
  plugin: string;
  /** Lifecycle method that threw. */
  phase: "initialize" | "track" | "setUser" | "resetUser";
  /** Event name when `phase === "track"`. */
  eventName?: EventName;
}

/**
 * Configuration object passed to the {@link Funnel} constructor.
 */
export interface FunnelConfig {
  /** List of plugins to register. */
  plugins: FunnelPlugin[];
  /** When `true`, debug logs are printed to the console. @defaultValue `false` */
  debug?: boolean;
  /**
   * Called when any plugin throws during a lifecycle method.
   *
   * @remarks
   * When provided, replaces the default `console.error` log so applications
   * can forward errors to Sentry/Bugsnag/etc. Errors are still isolated:
   * one plugin throwing never blocks the others.
   */
  onError?: (error: unknown, context: FunnelErrorContext) => void;
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
 * funnel.track("purchase", { currency: "KRW", value: 29000, transaction_id: "T-1" });
 * ```
 */
export class Funnel {
  private plugins: FunnelPlugin[] = [];
  private debug: boolean;
  private initialized = false;
  private initializedPlugins = new Set<string>();
  private userProperties: UserProperties | null = null;
  private onError?: (error: unknown, context: FunnelErrorContext) => void;

  /**
   * Creates a new Funnel instance.
   *
   * @param config - Configuration containing the plugin list and debug flag.
   */
  constructor(config: FunnelConfig) {
    this.plugins = config.plugins;
    this.debug = config.debug ?? false;
    this.onError = config.onError;
  }

  /**
   * Initializes registered plugins.
   *
   * @remarks
   * Idempotent at the per-plugin level: a plugin that has already been
   * initialized is skipped on subsequent calls (useful for HMR/dev reloads).
   *
   * @param pluginConfigs - A map of plugin names to their configuration objects.
   */
  initialize(pluginConfigs?: Record<string, Record<string, unknown>>): void {
    for (const plugin of this.plugins) {
      if (this.initializedPlugins.has(plugin.name)) continue;
      const config = pluginConfigs?.[plugin.name] ?? {};
      try {
        plugin.initialize(config);
        this.initializedPlugins.add(plugin.name);
        if (this.debug) {
          console.log(`[funnel] Plugin "${plugin.name}" initialized`);
        }
      } catch (error) {
        this.handleError(error, { plugin: plugin.name, phase: "initialize" });
      }
    }
    this.initialized = true;

    if (this.userProperties) {
      for (const plugin of this.plugins) {
        if (!plugin.setUser) continue;
        try {
          plugin.setUser(this.userProperties);
        } catch (error) {
          this.handleError(error, { plugin: plugin.name, phase: "setUser" });
        }
      }
    }
  }

  /**
   * Sends an event to all registered plugins.
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
        this.handleError(error, { plugin: plugin.name, phase: "track", eventName });
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
        this.handleError(error, { plugin: plugin.name, phase: "setUser" });
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
        this.handleError(error, { plugin: plugin.name, phase: "resetUser" });
      }
    }
  }

  private handleError(error: unknown, context: FunnelErrorContext): void {
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch {
        // onError must never escape the dispatcher
      }
      return;
    }
    const eventSuffix = context.eventName ? ` "${context.eventName}"` : "";
    console.error(
      `[funnel] Plugin "${context.plugin}" failed during ${context.phase}${eventSuffix}`,
      error,
    );
  }
}
