import type { FunnelPlugin } from "./plugin";
import type { EventMap, EventName } from "./types";

export interface FunnelConfig {
  plugins: FunnelPlugin[];
  debug?: boolean;
}

export class Funnel {
  private plugins: FunnelPlugin[] = [];
  private debug: boolean;
  private initialized = false;

  constructor(config: FunnelConfig) {
    this.plugins = config.plugins;
    this.debug = config.debug ?? false;
  }

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
