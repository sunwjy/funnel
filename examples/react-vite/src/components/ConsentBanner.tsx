import type { ConsentState } from "@sunwjy/funnel-client";
import { useState } from "react";
import { funnel } from "../funnel";

/**
 * Consent banner demonstrating Funnel.setConsent() integration.
 * Sends Google Consent Mode v2 signals to all plugins.
 */
export function ConsentBanner() {
  const [consented, setConsented] = useState<boolean | null>(null);

  function handleAccept() {
    const state: ConsentState = {
      ad_storage: "granted",
      analytics_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    };
    funnel.setConsent(state);
    setConsented(true);
  }

  function handleDecline() {
    const state: ConsentState = {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    };
    funnel.setConsent(state);
    setConsented(false);
  }

  if (consented !== null) {
    return (
      <div style={styles.status}>
        동의 상태: <strong>{consented ? "허용됨" : "거부됨"}</strong>{" "}
        <button type="button" style={styles.resetButton} onClick={() => setConsented(null)}>
          초기화
        </button>
      </div>
    );
  }

  return (
    <div style={styles.banner}>
      <p style={styles.text}>
        이 사이트는 맞춤형 광고 및 분석을 위해 쿠키를 사용합니다. 동의하시겠습니까?
      </p>
      <div style={styles.actions}>
        <button type="button" style={styles.declineButton} onClick={handleDecline}>
          거부
        </button>
        <button type="button" style={styles.acceptButton} onClick={handleAccept}>
          허용
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "#fff",
    borderTop: "1px solid #e0e0e0",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    zIndex: 1000,
    boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
  } as React.CSSProperties,
  text: { margin: 0, flex: 1, fontSize: "14px", color: "#333" } as React.CSSProperties,
  actions: { display: "flex", gap: "8px", flexShrink: 0 } as React.CSSProperties,
  acceptButton: {
    padding: "8px 20px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  } as React.CSSProperties,
  declineButton: {
    padding: "8px 20px",
    background: "#fff",
    color: "#444",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  } as React.CSSProperties,
  status: {
    background: "#f0f7ff",
    border: "1px solid #1a73e8",
    borderRadius: "4px",
    padding: "8px 12px",
    fontSize: "13px",
    margin: "0 16px 8px",
  } as React.CSSProperties,
  resetButton: {
    marginLeft: "8px",
    padding: "2px 8px",
    background: "none",
    border: "1px solid #1a73e8",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#1a73e8",
    fontSize: "12px",
  } as React.CSSProperties,
};
