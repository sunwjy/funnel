import type { EventMap, EventName } from "./types";

export interface FunnelPlugin {
  name: string;
  initialize(config: Record<string, unknown>): void;
  track<E extends EventName>(eventName: E, params: EventMap[E]): void;
}
