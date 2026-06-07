import type { Item } from "@sunwjy/funnel-client";
import { useEffect } from "react";
import { funnel } from "../funnel";

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "PROD-001",
    name: "프리미엄 이어폰",
    price: 129000,
    currency: "KRW",
    category: "Electronics",
  },
  { id: "PROD-002", name: "무선 키보드", price: 89000, currency: "KRW", category: "Electronics" },
  { id: "PROD-003", name: "스마트 워치", price: 249000, currency: "KRW", category: "Wearables" },
];

function toItem(product: Product): Item {
  return {
    item_id: product.id,
    item_name: product.name,
    price: product.price,
    item_category: product.category,
    quantity: 1,
  };
}

interface ProductListProps {
  onAddToCart: (product: Product) => void;
}

export function ProductList({ onAddToCart }: ProductListProps) {
  // Track view_item for the first product on mount as a representative item view
  useEffect(() => {
    const product = PRODUCTS[0];
    funnel.track("view_item", {
      currency: product.currency,
      value: product.price,
      items: [toItem(product)],
    });
  }, []);

  function handleAddToCart(product: Product) {
    funnel.track("add_to_cart", {
      currency: product.currency,
      value: product.price,
      items: [toItem(product)],
    });
    onAddToCart(product);
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>상품 목록</h2>
      <div style={styles.grid}>
        {PRODUCTS.map((product) => (
          <article key={product.id} style={styles.card}>
            <h3 style={styles.productName}>{product.name}</h3>
            <p style={styles.price}>{product.price.toLocaleString("ko-KR")}원</p>
            <p style={styles.category}>{product.category}</p>
            <button type="button" style={styles.button} onClick={() => handleAddToCart(product)}>
              장바구니 담기
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles = {
  section: { padding: "16px" } as React.CSSProperties,
  heading: { marginBottom: "16px", fontSize: "20px" } as React.CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
  } as React.CSSProperties,
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  } as React.CSSProperties,
  productName: { margin: 0, fontSize: "16px" } as React.CSSProperties,
  price: { margin: 0, fontWeight: "bold", color: "#1a73e8" } as React.CSSProperties,
  category: { margin: 0, fontSize: "12px", color: "#666" } as React.CSSProperties,
  button: {
    marginTop: "auto",
    padding: "8px 16px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  } as React.CSSProperties,
};
