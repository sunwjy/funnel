"use client";

import { useState } from "react";
import { funnel } from "@/lib/funnel";

/**
 * 사용자 식별(setUser/resetUser) 시나리오를 시연하는 패널.
 */
export function UserPanel() {
  const [loggedIn, setLoggedIn] = useState(false);

  function handleLogin() {
    funnel.setUser({
      user_id: "user-12345",
      email: "demo@example.com",
    });
    setLoggedIn(true);
  }

  function handleLogout() {
    funnel.resetUser();
    setLoggedIn(false);
  }

  return (
    <div className="user-panel">
      {loggedIn ? (
        <>
          <span className="user-status">사용자: demo@example.com</span>
          <button type="button" onClick={handleLogout} className="btn-logout">
            로그아웃
          </button>
        </>
      ) : (
        <button type="button" onClick={handleLogin} className="btn-login">
          로그인 (setUser 데모)
        </button>
      )}
    </div>
  );
}
