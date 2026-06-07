"use client";

import { useState } from "react";
import { funnel } from "@/lib/funnel";

/**
 * 동의(Consent) 배너 — Google Consent Mode v2 신호를 시연합니다.
 *
 * @remarks
 * 실제 서비스에서는 쿠키 설정을 영속적으로 저장해야 합니다.
 * 이 예제는 `funnel.setConsent()`의 동작을 시연하기 위한 최소 구현입니다.
 */
export function ConsentBanner() {
  const [consented, setConsented] = useState<boolean | null>(null);

  function handleAccept() {
    funnel.setConsent({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    setConsented(true);
  }

  function handleDecline() {
    funnel.setConsent({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    setConsented(false);
  }

  function handleReset() {
    setConsented(null);
  }

  if (consented !== null) {
    return (
      <div className="consent-status">
        <span>
          동의 상태: <strong>{consented ? "허용" : "거부"}</strong>
        </span>
        <button type="button" onClick={handleReset}>
          동의 초기화
        </button>
      </div>
    );
  }

  return (
    <div className="consent-banner">
      <p>이 사이트는 분석 및 마케팅 목적으로 쿠키를 사용합니다.</p>
      <div className="consent-actions">
        <button type="button" onClick={handleAccept} className="btn-accept">
          모두 허용
        </button>
        <button type="button" onClick={handleDecline} className="btn-decline">
          거부
        </button>
      </div>
    </div>
  );
}
