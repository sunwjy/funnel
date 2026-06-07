import { useState } from "react";
import { Cart } from "./components/Cart";
import { Checkout } from "./components/Checkout";
import { ConsentBanner } from "./components/ConsentBanner";
import { EventLog } from "./components/EventLog";
import { type Product, ProductList } from "./components/ProductList";
import { UserPanel } from "./components/UserPanel";

type Step = "products" | "cart" | "checkout" | "complete";

/**
 * Multi-step shopping funnel:
 *   상품 목록 (view_item) → 카트 (add_to_cart) → 결제 (begin_checkout) → 완료 (purchase)
 */
export function App() {
  const [step, setStep] = useState<Step>("products");
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [transactionId, setTransactionId] = useState<string>("");

  function handleAddToCart(product: Product) {
    setCartItems((prev) => [...prev, product]);
  }

  function handleGoToCart() {
    setStep("cart");
  }

  function handleGoToCheckout() {
    setStep("checkout");
  }

  function handlePurchaseComplete(txId: string) {
    setTransactionId(txId);
    setStep("complete");
  }

  function handleReset() {
    setCartItems([]);
    setTransactionId("");
    setStep("products");
  }

  return (
    <>
      <header style={styles.header}>
        <h1 style={styles.title}>Funnel Demo Shop</h1>
        <div style={styles.headerRight}>
          <UserPanel />
          {step !== "products" && (
            <button type="button" style={styles.navButton} onClick={() => setStep("products")}>
              상품 목록
            </button>
          )}
          <button type="button" style={styles.cartButton} onClick={handleGoToCart}>
            장바구니 ({cartItems.length})
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {step === "products" && (
          <ProductList
            onAddToCart={(product) => {
              handleAddToCart(product);
            }}
          />
        )}

        {step === "cart" && (
          <Cart
            items={cartItems}
            onCheckout={handleGoToCheckout}
            onBack={() => setStep("products")}
          />
        )}

        {step === "checkout" && (
          <Checkout
            items={cartItems}
            onPurchaseComplete={handlePurchaseComplete}
            onBack={() => setStep("cart")}
          />
        )}

        {step === "complete" && (
          <div style={styles.complete}>
            <h2 style={styles.completeTitle}>구매 완료</h2>
            <p style={styles.completeText}>주문이 성공적으로 접수되었습니다.</p>
            <p style={styles.transactionId}>
              주문번호: <code>{transactionId}</code>
            </p>
            <button type="button" style={styles.primaryButton} onClick={handleReset}>
              계속 쇼핑하기
            </button>
          </div>
        )}
      </main>

      <ConsentBanner />
      <EventLog />
    </>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  } as React.CSSProperties,
  title: { margin: 0, fontSize: "20px", color: "#1a73e8" } as React.CSSProperties,
  headerRight: { display: "flex", alignItems: "center", gap: "12px" } as React.CSSProperties,
  navButton: {
    padding: "6px 14px",
    background: "#fff",
    color: "#555",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  } as React.CSSProperties,
  cartButton: {
    padding: "6px 14px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px",
  } as React.CSSProperties,
  main: {
    minHeight: "calc(100vh - 57px)",
    paddingRight: "316px",
    paddingBottom: "80px",
  } as React.CSSProperties,
  complete: {
    maxWidth: "480px",
    margin: "48px auto",
    padding: "32px",
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e0e0e0",
    textAlign: "center" as const,
  } as React.CSSProperties,
  completeTitle: { color: "#34a853", fontSize: "28px", margin: "0 0 12px" } as React.CSSProperties,
  completeText: { color: "#444", margin: "0 0 8px" } as React.CSSProperties,
  transactionId: { color: "#666", fontSize: "14px", margin: "0 0 24px" } as React.CSSProperties,
  primaryButton: {
    padding: "12px 32px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  } as React.CSSProperties,
};
