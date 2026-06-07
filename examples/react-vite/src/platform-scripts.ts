/**
 * Injects GA4 / Meta Pixel scripts only when real IDs are provided via env.
 * Called once at module initialization — no-op when IDs are empty placeholders.
 */
export function injectPlatformScripts(): void {
  const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
  const metaId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

  if (ga4Id) {
    injectGtag(ga4Id);
  }

  if (metaId) {
    injectMetaPixel(metaId);
  }
}

function injectGtag(measurementId: string): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer?.push(args);
  };
  w.gtag("js", new Date());
  w.gtag("config", measurementId);
}

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare let fbq: FbqFn | undefined;

function injectMetaPixel(pixelId: string): void {
  // Minimal Meta Pixel base code snippet
  const w = window as unknown as { fbq?: FbqFn; _fbq?: FbqFn };

  if (w.fbq != null) return;

  const queue: unknown[] = [];
  const fn = ((...args: unknown[]): void => {
    if (fn.callMethod) {
      fn.callMethod(...args);
    } else {
      fn.queue.push(args);
    }
  }) as FbqFn;
  fn.queue = queue;
  fn.push = fn;
  fn.loaded = true;
  fn.version = "2.0";

  w.fbq = fn;
  w._fbq = fn;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  w.fbq("init", pixelId);
  w.fbq("track", "PageView");
}
