"use client";

import { useEffect, useState } from "react";
import type { LogEntry } from "@/lib/debug-plugin";
import { debugPlugin } from "@/lib/funnel";

/**
 * 이벤트 로그 패널 — 디버그 플러그인을 구독하여 이벤트를 실시간으로 표시합니다.
 *
 * @remarks
 * `debugPlugin.subscribe()`로 콜백을 등록하고, 컴포넌트 언마운트 시 구독을 해제합니다.
 * 이 패턴은 React 컴포넌트에서 FunnelPlugin을 UI와 연결하는 방법을 시연합니다.
 */
export function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubscribe = debugPlugin.subscribe((entry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 50));
    });
    return unsubscribe;
  }, []);

  function getTypeLabel(type: LogEntry["type"]) {
    switch (type) {
      case "event":
        return "EVENT";
      case "user":
        return "USER";
      case "consent":
        return "CONSENT";
      case "reset":
        return "RESET";
    }
  }

  function getBadgeClass(type: LogEntry["type"]) {
    switch (type) {
      case "event":
        return "badge badge-event";
      case "user":
        return "badge badge-user";
      case "consent":
        return "badge badge-consent";
      case "reset":
        return "badge badge-reset";
    }
  }

  return (
    <div className="event-log">
      <div className="event-log-header">
        <h3>이벤트 로그</h3>
        <span className="log-count">{logs.length}개</span>
        {logs.length > 0 && (
          <button type="button" onClick={() => setLogs([])} className="btn-clear">
            지우기
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="log-empty">이벤트가 없습니다. 상품을 탐색하거나 버튼을 클릭해 보세요.</p>
      ) : (
        <ul className="log-list">
          {logs.map((entry) => (
            <li key={entry.id} className="log-entry">
              <span className={getBadgeClass(entry.type)}>{getTypeLabel(entry.type)}</span>
              <span className="log-name">{entry.eventName ?? entry.type}</span>
              {entry.eventId && (
                <span className="log-event-id" title={entry.eventId}>
                  {entry.eventId.slice(0, 8)}…
                </span>
              )}
              <span className="log-time">
                {new Date(entry.timestamp).toLocaleTimeString("ko-KR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
