import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  UserProperties,
} from "@sunwjy/funnel-client";
import type { ConsentState } from "@sunwjy/funnel-core";

/** A single log entry produced by the debug plugin. */
export interface LogEntry {
  timestamp: string;
  eventName: string;
  params: Record<string, unknown>;
  eventId: string;
}

/** Callback invoked each time a new log entry is appended. */
export type OnLog = (entry: LogEntry) => void;

/**
 * Debug plugin — logs all funnel events to the provided callback and console.
 *
 * Useful as a development-time "what is being tracked?" tool, and serves as a
 * real-world Custom Plugin example.
 */
export function createDebugPlugin(onLog: OnLog): FunnelPlugin {
  return {
    name: "debug",

    initialize(_config: Record<string, unknown>): void {
      console.log("[debug] initialized");
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext): void {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        eventName,
        params: params as Record<string, unknown>,
        eventId: context.eventId,
      };
      console.log("[debug] track", entry);
      onLog(entry);
    },

    setUser(properties: UserProperties): void {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        eventName: "setUser",
        params: properties as Record<string, unknown>,
        eventId: "-",
      };
      console.log("[debug] setUser", properties);
      onLog(entry);
    },

    resetUser(): void {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        eventName: "resetUser",
        params: {},
        eventId: "-",
      };
      console.log("[debug] resetUser");
      onLog(entry);
    },

    setConsent(state: ConsentState): void {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        eventName: "setConsent",
        params: state as Record<string, unknown>,
        eventId: "-",
      };
      console.log("[debug] setConsent", state);
      onLog(entry);
    },
  };
}
