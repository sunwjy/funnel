import { useState } from "react";
import { funnel } from "../funnel";

/**
 * UserPanel demonstrates setUser / resetUser integration.
 */
export function UserPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const userId = "user-demo-001";

  function handleLogin() {
    funnel.setUser({ userId, email: "demo@example.com" });
    setLoggedIn(true);
  }

  function handleLogout() {
    funnel.resetUser();
    setLoggedIn(false);
  }

  return (
    <div style={styles.container}>
      {loggedIn ? (
        <div style={styles.row}>
          <span style={styles.badge}>{userId}</span>
          <button type="button" style={styles.button} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      ) : (
        <button type="button" style={styles.button} onClick={handleLogin}>
          데모 로그인
        </button>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", alignItems: "center" } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", gap: "8px" } as React.CSSProperties,
  badge: {
    fontSize: "12px",
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "2px 8px",
    borderRadius: "4px",
    border: "1px solid #a5d6a7",
  } as React.CSSProperties,
  button: {
    padding: "6px 14px",
    background: "#fff",
    color: "#1a73e8",
    border: "1px solid #1a73e8",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
  } as React.CSSProperties,
};
