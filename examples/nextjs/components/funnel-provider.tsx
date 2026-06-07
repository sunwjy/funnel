"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { funnel, pluginConfigs } from "@/lib/funnel";
import { injectPlatformScripts } from "@/lib/platform-scripts";

interface FunnelProviderProps {
  children: React.ReactNode;
}

/**
 * Funnel 초기화 및 라우트 전환 시 page_view 추적을 담당하는 클라이언트 컴포넌트.
 *
 * @remarks
 * - `useEffect`로 마운트 시 1회 `initialize()`를 호출합니다 (StrictMode 이중 실행 가드 포함).
 * - `usePathname()` 변화를 감지하여 매 라우트 전환마다 `page_view`를 track합니다.
 *   초기 렌더 시에도 1회 실행됩니다.
 * - 서버 렌더링 중에는 이 컴포넌트의 useEffect가 실행되지 않으므로
 *   SSR 단계에서 track이 호출되지 않습니다 (SSR-safe).
 */
export function FunnelProvider({ children }: FunnelProviderProps) {
  const pathname = usePathname();
  const initializedRef = useRef(false);

  // 마운트 시 1회 초기화 (StrictMode 이중 실행 가드)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // env에 실제 ID가 있을 때만 플랫폼 스크립트 주입
    injectPlatformScripts();

    funnel.initialize(pluginConfigs);
  }, []);

  // 라우트 전환 시 page_view 추적 (pathname 변경마다 실행, 초기 렌더 포함)
  useEffect(() => {
    funnel.track("page_view", {
      page_title: typeof document !== "undefined" ? document.title : undefined,
      page_location:
        typeof window !== "undefined" ? `${window.location.origin}${pathname}` : pathname,
    });
  }, [pathname]);

  return <>{children}</>;
}
