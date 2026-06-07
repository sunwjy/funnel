import type { Product } from "./ProductList";

interface CartProps {
  items: Product[];
  onCheckout: () => void;
  onBack: () => void;
}

export function Cart({ items, onCheckout, onBack }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>장바구니</h2>
      {items.length === 0 ? (
        <p style={styles.empty}>장바구니가 비어 있습니다.</p>
      ) : (
        <>
          <ul style={styles.list}>
            {items.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 예제 단순화 목적
              <li key={`${item.id}-${index}`} style={styles.item}>
                <span>{item.name}</span>
                <span style={styles.price}>{item.price.toLocaleString("ko-KR")}원</span>
              </li>
            ))}
          </ul>
          <p style={styles.total}>합계: {total.toLocaleString("ko-KR")}원</p>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} onClick={onBack}>
              쇼핑 계속하기
            </button>
            <button type="button" style={styles.primaryButton} onClick={onCheckout}>
              결제하기
            </button>
          </div>
        </>
      )}
      {items.length === 0 && (
        <button type="button" style={styles.secondaryButton} onClick={onBack}>
          상품 보러 가기
        </button>
      )}
    </section>
  );
}

const styles = {
  section: { padding: "16px", maxWidth: "480px", margin: "0 auto" } as React.CSSProperties,
  heading: { marginBottom: "16px", fontSize: "20px" } as React.CSSProperties,
  empty: { color: "#666" } as React.CSSProperties,
  list: { listStyle: "none", padding: 0, margin: "0 0 16px 0" } as React.CSSProperties,
  item: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #e0e0e0",
  } as React.CSSProperties,
  price: { fontWeight: "bold", color: "#1a73e8" } as React.CSSProperties,
  total: {
    fontWeight: "bold",
    fontSize: "18px",
    textAlign: "right" as const,
    margin: "16px 0",
  } as React.CSSProperties,
  actions: { display: "flex", gap: "12px", justifyContent: "flex-end" } as React.CSSProperties,
  primaryButton: {
    padding: "10px 20px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
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
