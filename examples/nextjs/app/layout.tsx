import type { Metadata } from "next";
import { ConsentBanner } from "@/components/consent-banner";
import { EventLog } from "@/components/event-log";
import { FunnelProvider } from "@/components/funnel-provider";
import { UserPanel } from "@/components/user-panel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Funnel Next.js 예제",
  description: "Next.js 15 App Router에서 @sunwjy/funnel-client를 사용하는 예제",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/*
          FunnelProvider는 클라이언트 컴포넌트로, useEffect에서 initialize()를 호출합니다.
          SSR 단계에서는 useEffect가 실행되지 않으므로 track()이 서버에서 호출되지 않습니다.
        */}
        <FunnelProvider>
          <header className="site-header">
            <nav className="nav">
              <a href="/" className="nav-logo">
                Funnel 예제 샵
              </a>
              <UserPanel />
            </nav>
            <ConsentBanner />
          </header>

          <main className="main-content">{children}</main>

          <aside className="sidebar">
            <EventLog />
          </aside>
        </FunnelProvider>
      </body>
    </html>
  );
}
