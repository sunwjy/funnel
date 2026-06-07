"use client";

import type { Item } from "@sunwjy/funnel-client";
import Link from "next/link";
import { useEffect } from "react";
import { TrackButton } from "@/components/track-button";
import { funnel } from "@/lib/funnel";
import type { Product } from "@/lib/products";

interface ProductEventsProps {
  product: Product;
  item: Item;
}

/**
 * 상품 상세 페이지의 클라이언트 이벤트 추적 컴포넌트.
 *
 * @remarks
 * - 마운트 시 view_item 이벤트를 1회 track합니다.
 * - add_to_cart 버튼 클릭 시 이벤트를 track합니다.
 */
export function ProductEvents({ product, item }: ProductEventsProps) {
  // 마운트 시 view_item 추적 (product.id 변경 = 다른 상품 페이지로 전환 시 재실행)
  useEffect(() => {
    funnel.track("view_item", {
      currency: product.currency,
      value: product.price,
      items: [item],
    });
  }, [product.currency, product.price, item]);

  return (
    <div className="product-actions" style={{ marginTop: "20px" }}>
      <TrackButton
        event="add_to_cart"
        params={{
          currency: product.currency,
          value: product.price,
          items: [item],
        }}
        label="장바구니 담기"
        className="btn-primary"
      />
      <Link
        href="/checkout"
        className="btn-secondary"
        style={{
          padding: "8px 16px",
          borderRadius: "6px",
          textDecoration: "none",
          fontSize: "0.9rem",
          fontWeight: 500,
        }}
      >
        바로 구매
      </Link>
    </div>
  );
}
