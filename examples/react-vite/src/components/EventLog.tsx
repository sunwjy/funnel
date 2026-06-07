import { useEffect, useState } from "react";
import type { LogEntry } from "../debug-plugin";
import { debugPlugin } from "../funnel";

/**
 * EventLog subscribes to the debug plugin's event stream and renders entries in real-time.
 * This demonstrates how to bridge a Funnel plugin to React state via a subscribe/unsubscribe pattern.
 */
export function EventLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Subscribe returns an unsubscribe function — use it as the cleanup return value
    const unsubscribe = debugPlugin.subscribe(setEntries);
    return unsubscribe;
  }, []);

  return (
    <aside style={styles.container}>
      <h3 style={styles.heading}>
        이벤트 로그 <span style={styles.badge}>{entries.length}</span>
      </h3>
      {entries.length === 0 ? (
        <p style={styles.empty}>아직 이벤트 없음</p>
      ) : (
        <ol style={styles.list} reversed>
          {[...entries].reverse().map((entry) => (
            <li key={`${entry.timestamp}-${entry.eventName ?? entry.kind}`} style={styles.entry}>
              <span style={styles.time}>{entry.timestamp.slice(11, 19)}</span>
              <span style={kindStyle(entry.kind)}>{entry.kind}</span>
              {entry.eventName && <span style={styles.event}>{entry.eventName}</span>}
              {entry.context?.eventId && (
                <span style={styles.meta} title="eventId">
                  #{entry.context.eventId.slice(0, 8)}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function kindStyle(kind: LogEntry["kind"]): React.CSSProperties {
  const colors: Record<LogEntry["kind"], string> = {
    track: "#1a73e8",
    setUser: "#34a853",
    resetUser: "#fbbc04",
    setConsent: "#ea4335",
  };
  return {
    ...styles.kind,
    color: colors[kind],
    borderColor: colors[kind],
  };
}

const styles = {
  container: {
    position: "fixed" as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: "300px",
    background: "#1e1e1e",
    color: "#f0f0f0",
    overflowY: "auto" as const,
    padding: "12px",
    boxShadow: "-2px 0 8px rgba(0,0,0,0.2)",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: 999,
  } as React.CSSProperties,
  heading: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,
  badge: {
    background: "#1a73e8",
    color: "#fff",
    borderRadius: "10px",
    padding: "1px 6px",
    fontSize: "11px",
  } as React.CSSProperties,
  empty: { color: "#555", fontStyle: "italic" as const } as React.CSSProperties,
  list: { listStyle: "none", padding: 0, margin: 0 } as React.CSSProperties,
  entry: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
    alignItems: "center",
    padding: "4px 0",
    borderBottom: "1px solid #333",
  } as React.CSSProperties,
  time: { color: "#666", minWidth: "60px" } as React.CSSProperties,
  kind: {
    border: "1px solid",
    borderRadius: "3px",
    padding: "0 4px",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  event: { color: "#f0f0f0" } as React.CSSProperties,
  meta: { color: "#555", fontSize: "10px" } as React.CSSProperties,
};
