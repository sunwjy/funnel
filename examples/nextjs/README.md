# examples/nextjs

Next.js 15 App Router에서 `@sunwjy/funnel-client`를 사용하는 예제입니다.

## 시나리오

가상 쇼핑 퍼널을 통해 다음 이벤트를 시연합니다:

| 페이지 | 이벤트 | 트리거 |
|--------|--------|--------|
| 모든 페이지 전환 | `page_view` | `FunnelProvider`의 `usePathname()` |
| `/product/[id]` 진입 | `view_item` | 마운트 시 `useEffect` |
| `/product/[id]` | `add_to_cart` | 버튼 클릭 |
| `/checkout` 진입 | `begin_checkout` | 마운트 시 `useEffect` |
| `/checkout` | `purchase` | 버튼 클릭 |

추가 시나리오:
- **`setUser` / `resetUser`**: 헤더의 로그인/로그아웃 버튼
- **`setConsent`**: 상단 동의 배너 (Google Consent Mode v2)

## 실행 방법

```bash
# 저장소 루트에서
pnpm install

# 개발 서버 시작
pnpm --filter @repo/example-nextjs dev
```

브라우저에서 `http://localhost:3000`을 열어 확인합니다.

## 실제 플랫폼 ID 주입

```bash
# .env.local 파일 생성
cp examples/nextjs/.env.example examples/nextjs/.env.local
```

`.env.local`에 실제 ID를 입력합니다:

```
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=1234567890
```

- ID가 **없으면** 디버그 플러그인만으로 동작합니다 (이벤트 로그 패널에서 확인 가능).
- ID가 **있으면** `FunnelProvider` 마운트 시 gtag.js / fbq 스크립트가 주입되고 실제 플랫폼으로 이벤트가 전송됩니다.

## 디버그 플러그인

`lib/debug-plugin.ts`에 구현된 `FunnelPlugin` 커스텀 구현체입니다.
화면 우측의 **이벤트 로그 패널**에 모든 이벤트, 이벤트 ID, 타입을 실시간으로 표시합니다.

이 패턴은 **Custom Plugins** 실전 사례이며, 다음을 시연합니다:
- `FunnelPlugin` 인터페이스 구현 (`track`, `setUser`, `resetUser`, `setConsent`)
- React 컴포넌트에서 플러그인을 구독하는 방법 (`debugPlugin.subscribe()`)

## 핵심 설계 포인트

### SSR-safe 통합

```
서버 렌더링 → FunnelProvider의 useEffect가 실행되지 않음
             → initialize() / track() 서버에서 미호출
클라이언트 마운트 → initialize() 1회 실행 → 플러그인 준비 완료
```

라이브러리 내부에서도 `typeof window` 가드가 있어 SSR 중 플러그인이 no-op으로 동작합니다.
(`packages/client/src/plugins/ga4/index.ts:71-73` 참조)

### initialize 전 이벤트 큐잉

```
page_view (pathname effect) → initialize() 전 발생 가능
                             → 최대 100개 큐에 저장 (이벤트 ID 보존)
initialize() 완료           → 큐의 이벤트 순서대로 재생
```

`FunnelProvider`에서 `page_view`는 pathname effect로 발생하고, `initialize()`는 별도 effect에서 1회 실행됩니다.
Effect 실행 순서에 따라 `page_view`가 `initialize()` 전에 발생할 수 있지만, 큐 덕분에 이벤트가 유실되지 않습니다.

### StrictMode 이중 실행 가드

```tsx
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return; // StrictMode에서 두 번 실행되어도 1회만 초기화
  initializedRef.current = true;
  funnel.initialize(pluginConfigs);
}, []);
```

React StrictMode는 개발 모드에서 effect를 두 번 실행합니다.
`Funnel.initialize()`는 플러그인 수준에서 멱등하지만, 플랫폼 스크립트 주입이나 외부 부작용을 방지하기 위해 ref 가드를 추가했습니다.

### 라우트 전환 page_view 추적

```tsx
// components/funnel-provider.tsx
const pathname = usePathname();

useEffect(() => {
  funnel.track("page_view", {
    page_title: document.title,
    page_location: window.location.href,
  });
}, [pathname]); // pathname이 바뀔 때마다 실행 (초기 렌더 포함)
```

## Node.js 요구 사항

이 예제를 실행하려면 **Node.js >= 18.18**이 필요합니다 (Next.js 15 요구 사항).

> 참고: `@sunwjy/funnel-client` 라이브러리 자체의 `engines` 필드는 `>=18`이며, 이 예제의 요구와는 별개입니다.
> CI는 `.nvmrc`(Node 22.22.2)로 고정되어 있어 이 요구 사항을 충족합니다.

## 파일 구조

```
examples/nextjs/
├─ app/
│  ├─ layout.tsx            # RootLayout: FunnelProvider + ConsentBanner + EventLog
│  ├─ page.tsx              # 상품 목록 (서버 컴포넌트)
│  ├─ globals.css
│  ├─ product/[id]/
│  │  ├─ page.tsx           # 상품 상세 (서버 컴포넌트)
│  │  └─ product-events.tsx # view_item + add_to_cart (클라이언트 컴포넌트)
│  └─ checkout/
│     └─ page.tsx           # begin_checkout + purchase (클라이언트 컴포넌트)
├─ components/
│  ├─ funnel-provider.tsx   # initialize + page_view 라우트 추적
│  ├─ consent-banner.tsx    # setConsent 데모
│  ├─ event-log.tsx         # 디버그 플러그인 구독 UI
│  ├─ track-button.tsx      # 범용 이벤트 추적 버튼
│  └─ user-panel.tsx        # setUser / resetUser 데모
├─ lib/
│  ├─ funnel.ts             # 모듈 스코프 Funnel 인스턴스
│  ├─ debug-plugin.ts       # 커스텀 FunnelPlugin 구현
│  ├─ platform-scripts.ts   # 실제 ID 있을 때만 gtag/fbq 주입
│  └─ products.ts           # 목 상품 데이터
├─ .env.example
├─ .gitignore
├─ next-types.d.ts          # next-env.d.ts 대체 (커밋용 타입 참조)
├─ next.config.ts
├─ package.json
├─ tsconfig.json
└─ turbo.json
```
