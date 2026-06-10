import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5990,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ga4: resolve(__dirname, "pages/ga4.html"),
        gtm: resolve(__dirname, "pages/gtm.html"),
        "meta-pixel": resolve(__dirname, "pages/meta-pixel.html"),
        "meta-capi": resolve(__dirname, "pages/meta-capi.html"),
        dedup: resolve(__dirname, "pages/dedup.html"),
        consent: resolve(__dirname, "pages/consent.html"),
      },
    },
  },
});
