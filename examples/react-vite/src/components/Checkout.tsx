import type { Item } from "@sunwjy/funnel-client";
import { useEffect } from "react";
import { funnel } from "../funnel";
import type { Product } from "./ProductList";

interface CheckoutProps {
  items: Product[];
  onPurchaseComplete: (transactionId: string) => void;
  onBack: () => void;
}

function toItem(product: Product): Item {
  return {
    item_id: product.id,
    item_name: product.name,
    price: product.price,
    item_category: product.category,
    quantity: 1,
  };
}

export function Checkout({ items, onPurchaseComplete, onBack }: CheckoutProps) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const currency = items[0]?.currency ?? "KRW";

  // Track begin_checkout when this component mounts
  useEffect(() => {
    funnel.track("begin_checkout", {
      currency,
      value: total,
      items: items.map(toItem),
    });
  }, [currency, items, total]);

  function handlePurchase() {
    const transactionId = `TXN-${Date.now()}`;

    funnel.track("purchase", {
      transaction_id: transactionId,
      currency,
      value: total,
      items: items.map(toItem),
    });

    onPurchaseComplete(transactionId);
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>결제 정보 확인</h2>
      <div style={styles.summary}>
        <h3 style={styles.subheading}>주문 내역</h3>
        <ul style={styles.list}>
          {items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 예제 단순화 목적
            <li key={`${item.id}-${index}`} style={styles.item}>
              <span>{item.name}</span>
              <span style={styles.price}>{item.price.toLocaleString("ko-KR")}원</span>
            </li>
          ))}
        </ul>
        <p style={styles.total}>총 결제 금액: {total.toLocaleString("ko-KR")}원</p>
      </div>
      <div style={styles.actions}>
        <button type="button" style={styles.secondaryButton} onClick={onBack}>
          뒤로
        </button>
        <button type="button" style={styles.primaryButton} onClick={handlePurchase}>
          결제 완료
        </button>
      </div>
    </section>
  );
}

const styles = {
  section: { padding: "16px", maxWidth: "480px", margin: "0 auto" } as React.CSSProperties,
  heading: { marginBottom: "16px", fontSize: "20px" } as React.CSSProperties,
  subheading: { fontSize: "16px", marginBottom: "12px" } as React.CSSProperties,
  summary: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
  } as React.CSSProperties,
  list: { listStyle: "none", padding: 0, margin: "0 0 12px 0" } as React.CSSProperties,
  item: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f0f0f0",
  } as React.CSSProperties,
  price: { fontWeight: "bold", color: "#1a73e8" } as React.CSSProperties,
  total: {
    fontWeight: "bold",
    fontSize: "18px",
    textAlign: "right" as const,
    margin: "12px 0 0 0",
  } as React.CSSProperties,
  actions: { display: "flex", gap: "12px", justifyContent: "flex-end" } as React.CSSProperties,
  primaryButton: {
    padding: "10px 24px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  } as React.CSSProperties,
  secondaryButton: {
    padding: "10px 20px",
    background: "#fff",
    color: "#1a73e8",
    border: "1px solid #1a73e8",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  } as React.CSSProperties,
};
