import type {
  EventContext,
  EventMap,
  EventName,
  FunnelPlugin,
  UserProperties,
} from "@sunwjy/funnel-client";
import type { ConsentState } from "@sunwjy/funnel-core";

export interface LogEntry {
  timestamp: string;
  kind: "track" | "setUser" | "resetUser" | "setConsent";
  eventName?: EventName;
  params?: unknown;
  context?: EventContext;
  user?: UserProperties;
  consent?: ConsentState;
}

type Subscriber = (entries: LogEntry[]) => void;

/**
 * Debug plugin that logs all funnel events to an in-memory list
 * and notifies React subscribers via a subscribe/unsubscribe pattern.
 *
 * Usage in React:
 *   const [log, setLog] = useState<LogEntry[]>([]);
 *   useEffect(() => {
 *     const unsub = debugPlugin.subscribe(setLog);
 *     return unsub;
 *   }, []);
 */
export interface DebugPlugin extends FunnelPlugin {
  subscribe(fn: Subscriber): () => void;
  getEntries(): LogEntry[];
}

export function createDebugPlugin(): DebugPlugin {
  const entries: LogEntry[] = [];
  const subscribers = new Set<Subscriber>();

  function notify() {
    const snapshot = [...entries];
    for (const fn of subscribers) {
      fn(snapshot);
    }
  }

  function push(entry: LogEntry) {
    entries.push(entry);
    console.debug("[funnel:debug]", entry.kind, entry.eventName ?? "", entry.params ?? "");
    notify();
  }

  return {
    name: "debug",

    initialize(_config) {
      // no-op — debug plugin needs no initialization
    },

    track<E extends EventName>(eventName: E, params: EventMap[E], context: EventContext) {
      push({ timestamp: new Date().toISOString(), kind: "track", eventName, params, context });
    },

    setUser(properties: UserProperties) {
      push({ timestamp: new Date().toISOString(), kind: "setUser", user: properties });
    },

    resetUser() {
      push({ timestamp: new Date().toISOString(), kind: "resetUser" });
    },

    setConsent(state: ConsentState) {
      push({ timestamp: new Date().toISOString(), kind: "setConsent", consent: state });
    },

    subscribe(fn: Subscriber) {
      subscribers.add(fn);
      // immediately notify with current snapshot
      fn([...entries]);
      return () => {
        subscribers.delete(fn);
      };
    },

    getEntries() {
      return [...entries];
    },
  };
}
