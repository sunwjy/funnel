"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrackButton } from "@/components/track-button";
import { funnel } from "@/lib/funnel";
import { PRODUCTS, toItem } from "@/lib/products";

// 체크아웃 데모: 상품 목록에서 첫 번째 상품을 구매하는 시나리오
// PRODUCTS는 컴파일-타임 상수이며 항상 원소가 존재합니다.
// 단언 대신 명시적 타입 가드로 TS를 만족시킵니다.
function getDemoProduct() {
  const p = PRODUCTS[0];
  if (!p) throw new Error("[checkout] PRODUCTS 배열이 비어 있습니다.");
  return p;
}
const DEMO_PRODUCT = getDemoProduct();
const DEMO_ITEM = toItem(DEMO_PRODUCT, 1);
const DEMO_TRANSACTION_ID = `TXN-${Date.now()}`;

/**
 * 체크아웃 페이지 (클라이언트 컴포넌트).
 *
 * @remarks
 * - 마운트 시 begin_checkout 이벤트를 자동으로 track합니다.
 * - "구매 완료" 버튼 클릭 시 purchase 이벤트를 track합니다.
 * - SSR 환경에서도 useEffect를 통해 클라이언트 사이드에서만 이벤트가 발생합니다.
 */
export default function CheckoutPage() {
  const [purchased, setPurchased] = useState(false);

  // 마운트 시 begin_checkout 추적
  useEffect(() => {
    funnel.track("begin_checkout", {
      currency: DEMO_PRODUCT.currency,
      value: DEMO_PRODUCT.price,
      items: [DEMO_ITEM],
    });
  }, []);

  function handlePurchase() {
    funnel.track("purchase", {
      transaction_id: DEMO_TRANSACTION_ID,
      currency: DEMO_PRODUCT.currency,
      value: DEMO_PRODUCT.price,
      items: [DEMO_ITEM],
    });
    setPurchased(true);
  }

  if (purchased) {
    return (
      <div className="purchase-complete">
        <h2>구매 완료!</h2>
        <p>이벤트 로그에서 purchase 이벤트를 확인하세요.</p>
        <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#6b7280" }}>
          transaction_id: {DEMO_TRANSACTION_ID}
        </p>
        <Link href="/" style={{ display: "inline-block", marginTop: "20px", color: "#1d4ed8" }}>
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Link href="/" className="back-link">
        ← 계속 쇼핑하기
      </Link>

      <h1>체크아웃</h1>

      <div className="order-summary">
        <h2>주문 요약</h2>
        <div className="order-item">
          <span>{DEMO_PRODUCT.name}</span>
          <span>{DEMO_PRODUCT.price.toLocaleString("ko-KR")}원</span>
        </div>
        <div className="order-total">
          <span>합계</span>
          <span>{DEMO_PRODUCT.price.toLocaleString("ko-KR")}원</span>
        </div>
      </div>

      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "16px" }}>
        "구매 완료" 버튼을 클릭하면 purchase 이벤트가 발생합니다.
      </p>

      <button type="button" onClick={handlePurchase} className="btn-success">
        구매 완료 (purchase 이벤트 발생)
      </button>

      {/* TrackButton 데모 — add_to_cart 재추적 */}
      <div style={{ marginTop: "16px" }}>
        <TrackButton
          event="add_to_cart"
          params={{
            currency: DEMO_PRODUCT.currency,
            value: DEMO_PRODUCT.price,
            items: [DEMO_ITEM],
          }}
          label="장바구니에 다시 담기 (add_to_cart)"
          className="btn-secondary"
        />
      </div>
    </div>
  );
}
