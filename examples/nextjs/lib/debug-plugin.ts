import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  UserProperties,
} from "@sunwjy/funnel-client";
import type { ConsentState } from "@sunwjy/funnel-core";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "event" | "user" | "consent" | "reset";
  eventName?: string;
  eventId?: string;
  data: Record<string, unknown>;
}

type LogListener = (entry: LogEntry) => void;

/**
 * 디버그 플러그인 — 모든 이벤트/사용자/동의 신호를 로그 패널과 콘솔에 기록합니다.
 *
 * @remarks
 * 이 플러그인은 FunnelPlugin 인터페이스의 실전 구현 예시이며,
 * 플랫폼 계정 없이도 이벤트 흐름을 시각적으로 확인할 수 있게 합니다.
 */
export function createDebugPlugin() {
  const listeners: LogListener[] = [];

  function emit(entry: LogEntry) {
    for (const listener of listeners) {
      listener(entry);
    }
  }

  const plugin: FunnelPlugin & {
    subscribe: (listener: LogListener) => () => void;
    getLogs: () => LogEntry[];
  } = {
    name: "debug",

    // 플러그인 로그 구독 (EventLog 컴포넌트에서 사용)
    subscribe(listener: LogListener) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },

    getLogs() {
      return [];
    },

    initialize(_config: Record<string, unknown>) {
      console.log("[debug-plugin] initialized");
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext) {
      const entry: LogEntry = {
        id: context.eventId,
        timestamp: new Date().toISOString(),
        type: "event",
        eventName,
        eventId: context.eventId,
        data: params as Record<string, unknown>,
      };
      console.log(`[debug-plugin] track: ${eventName}`, { params, context });
      emit(entry);
    },

    setUser(properties: UserProperties) {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "user",
        data: properties as Record<string, unknown>,
      };
      console.log("[debug-plugin] setUser", properties);
      emit(entry);
    },

    resetUser() {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "reset",
        data: {},
      };
      console.log("[debug-plugin] resetUser");
      emit(entry);
    },

    setConsent(state: ConsentState) {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "consent",
        data: state as Record<string, unknown>,
      };
      console.log("[debug-plugin] setConsent", state);
      emit(entry);
    },
  };

  return plugin;
}
