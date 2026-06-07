# examples/react-vite

React 19 + Vite 기반의 멀티스텝 쇼핑 퍼널 예제입니다.

`@sunwjy/funnel-client`를 React 프로젝트에 통합하는 방법을 보여 줍니다.

## 주요 시연 포인트

- **멀티스텝 퍼널**: 상품 목록 → 장바구니 → 결제 → 구매 완료 (React 컴포넌트 상태 기반 단계 전환)
- **이벤트 추적**: `view_item` → `add_to_cart` → `begin_checkout` → `purchase`
- **디버그 플러그인 → React 연결**: `subscribe/unsubscribe` 패턴으로 플러그인 이벤트 스트림을 React 상태로 연결 (`EventLog` 컴포넌트)
- **모듈 스코프 Funnel 인스턴스**: `src/funnel.ts`에서 React 외부에 단 한 번 생성 — 리렌더 무관
- **사용자 식별**: `setUser` / `resetUser` (`UserPanel` 컴포넌트)
- **동의 관리**: Consent Mode v2 신호 전달 (`ConsentBanner` 컴포넌트)

## 실행 방법

```bash
# 저장소 루트에서 의존성 설치 (처음 한 번)
pnpm install

# 개발 서버 시작
pnpm --filter @examples/react-vite dev
```

브라우저에서 <http://localhost:5173> 접속 후 화면 오른쪽 이벤트 로그 패널에서 추적 결과를 확인합니다.

## 실제 플랫폼 ID 주입

`.env.example`을 복사해 `.env.local`을 생성한 뒤 실제 ID를 입력합니다.

```bash
cp .env.example .env.local
```

`.env.local`:

```env
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=1234567890
```

ID가 없으면 GA4·Meta Pixel 플러그인은 **no-op**으로 동작합니다 (`gtag`/`fbq` 전역 함수 부재 시 플러그인이 자체 가드로 처리). 디버그 플러그인은 항상 동작하므로 계정 없이도 동작을 확인할 수 있습니다.

## 디버그 플러그인

`src/debug-plugin.ts`는 `FunnelPlugin` 인터페이스를 직접 구현합니다.

```ts
// 모든 이벤트를 로그 패널에 출력하고 React 상태로 연결
const debugPlugin = createDebugPlugin();

// React 컴포넌트에서 구독
useEffect(() => {
  const unsubscribe = debugPlugin.subscribe(setEntries);
  return unsubscribe;
}, []);
```

`subscribe`가 반환하는 함수를 `useEffect` cleanup으로 그대로 넘기면 컴포넌트 언마운트 시 자동 해제됩니다.

## 빌드 / 타입 체크

```bash
# Vite 프로덕션 빌드
pnpm --filter @examples/react-vite build

# TypeScript 타입 체크 (빌드된 lib dist 타입 기준)
pnpm --filter @examples/react-vite typecheck
```

## 파일 구조

```
src/
├── main.tsx              # React 진입점
├── App.tsx               # 멀티스텝 퍼널 상태 관리
├── funnel.ts             # 모듈 스코프 Funnel 인스턴스
├── debug-plugin.ts       # 커스텀 디버그 플러그인 (FunnelPlugin 구현)
├── platform-scripts.ts   # gtag / fbq 스니펫 조건부 주입
└── components/
    ├── ProductList.tsx   # view_item, add_to_cart 추적
    ├── Cart.tsx          # 장바구니 화면
    ├── Checkout.tsx      # begin_checkout, purchase 추적
    ├── ConsentBanner.tsx # setConsent (Consent Mode v2)
    ├── EventLog.tsx      # 디버그 플러그인 구독 → React 상태 렌더
    └── UserPanel.tsx     # setUser / resetUser
```

## Node.js 요구 사항

이 예제는 Node.js >= 18.18 이 필요합니다.
(라이브러리 자체의 `engines: >=18` 과는 별개로, Vite 7.x 의 요구 사항입니다.)
