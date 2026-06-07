/**
 * Injects platform scripts (gtag.js, Meta Pixel) when real IDs are provided.
 *
 * When env variables are empty, this function is a no-op — the debug plugin
 * still logs all events, and platform plugins self-guard against missing
 * gtag/fbq globals (no errors thrown).
 */
export function injectPlatformScripts(
  ga4Id: string | undefined,
  metaPixelId: string | undefined,
): void {
  if (ga4Id) {
    // Google tag (gtag.js) snippet
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(gtagScript);

    const gtagInit = document.createElement("script");
    gtagInit.textContent = [
      "window.dataLayer = window.dataLayer || [];",
      "function gtag(){dataLayer.push(arguments);}",
      "gtag('js', new Date());",
    ].join("\n");
    document.head.appendChild(gtagInit);
  }

  if (metaPixelId) {
    // Meta Pixel base code snippet
    const fbqInit = document.createElement("script");
    fbqInit.textContent = [
      "!function(f,b,e,v,n,t,s)",
      "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
      "n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
      "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
      "n.queue=[];t=b.createElement(e);t.async=!0;",
      `t.src=v;s=b.getElementsByTagName(e)[0];`,
      "s.parentNode.insertBefore(t,s)}(window, document,'script',",
      "'https://connect.facebook.net/en_US/fbevents.js');",
      `fbq('init', '${metaPixelId}');`,
      "fbq('track', 'PageView');",
    ].join("\n");
    document.head.appendChild(fbqInit);
  }
}
