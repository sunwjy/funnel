/**
 * 실제 플랫폼 ID가 있을 때만 외부 스크립트를 주입합니다.
 *
 * @remarks
 * - NEXT_PUBLIC_GA4_MEASUREMENT_ID가 설정되면 gtag.js 스니펫을 삽입합니다.
 * - NEXT_PUBLIC_META_PIXEL_ID가 설정되면 fbq 스니펫을 삽입합니다.
 * - ID가 없으면 no-op (디버그 플러그인만으로 동작합니다).
 *
 * 이 함수는 브라우저 환경(클라이언트 사이드)에서만 호출해야 합니다.
 */
export function injectPlatformScripts() {
  if (typeof window === "undefined") return;

  const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (ga4Id) {
    injectGA4Script(ga4Id);
  }

  if (metaPixelId) {
    injectMetaPixelScript(metaPixelId);
  }
}

function injectGA4Script(measurementId: string) {
  if (document.querySelector(`script[data-gtag="${measurementId}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.gtag = measurementId;
  document.head.appendChild(script);

  const inline = document.createElement("script");
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(inline);
}

function injectMetaPixelScript(pixelId: string) {
  if (document.querySelector(`script[data-pixel="${pixelId}"]`)) return;

  const inline = document.createElement("script");
  inline.dataset.pixel = pixelId;
  inline.textContent = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
  `;
  document.head.appendChild(inline);
}
