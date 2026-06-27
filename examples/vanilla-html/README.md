# @repo/example-vanilla-html

Funnel 라이브러리를 Vanilla TypeScript(Vite) 환경에서 사용하는 예제입니다.

가상 쇼핑 퍼널(`view_item` → `add_to_cart` → `begin_checkout` → `purchase`)을 시연하며,
커스텀 디버그 플러그인이 모든 이벤트를 화면 로그 패널과 콘솔에 출력합니다.

## 실행 방법

```bash
# 저장소 루트에서
pnpm install
pnpm --filter @repo/example-vanilla-html dev
```

브라우저에서 `http://localhost:5173` 을 열면 버튼을 클릭해 퍼널 이벤트를 발생시킬 수 있습니다.

## 환경 변수로 실제 플랫폼 ID 주입

기본 상태(env 미설정)에서는 placeholder ID가 사용되며 플랫폼 스크립트가 주입되지 않습니다.
디버그 플러그인이 모든 이벤트를 로그 패널에 출력하므로 추적 동작을 즉시 확인할 수 있습니다.

실제 플랫폼으로 데이터를 전송하려면:

```bash
cp .env.example .env
# .env 파일에서 실제 ID를 입력하세요
```

| 변수 | 설명 |
|------|------|
| `VITE_GA4_MEASUREMENT_ID` | GA4 측정 ID (예: `G-XXXXXXXXXX`) |
| `VITE_META_PIXEL_ID` | Meta Pixel ID (숫자, 예: `1234567890`) |

ID가 설정되면 `gtag.js` / Meta Pixel 스니펫이 동적으로 주입되어 실제 플랫폼으로 이벤트를 전송합니다.

## 디버그 플러그인

`src/debug-plugin.ts`는 `FunnelPlugin` 인터페이스를 직접 구현한 커스텀 플러그인 예시입니다.
모든 `track` / `setUser` / `resetUser` / `setConsent` 호출을 가로채어 로그 패널과 `console.log`에 기록합니다.

```
gtag 또는 fbq가 window에 없으면 GA4/Meta Pixel 플러그인은 자동으로 no-op 처리됩니다.
오류가 발생하지 않으며, 디버그 플러그인 로그로 동작을 확인할 수 있습니다.
```

## Node.js 요구 사항

이 예제는 Node.js >= 18.18 이 필요합니다.
(라이브러리 자체의 `engines: >=18` 과는 별개로, Vite 7.x 의 요구 사항입니다.)
