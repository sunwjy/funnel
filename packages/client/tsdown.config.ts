import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "plugins/ga4": "src/plugins/ga4/index.ts",
    "plugins/gtm": "src/plugins/gtm/index.ts",
    "plugins/sgtm": "src/plugins/sgtm/index.ts",
    "plugins/meta-conversion-api": "src/plugins/meta-conversion-api/index.ts",
    "plugins/meta-pixel": "src/plugins/meta-pixel/index.ts",
    "plugins/google-ads": "src/plugins/google-ads/index.ts",
    "plugins/tiktok-pixel": "src/plugins/tiktok-pixel/index.ts",
    "plugins/kakao-pixel": "src/plugins/kakao-pixel/index.ts",
    "plugins/naver-ad": "src/plugins/naver-ad/index.ts",
    "plugins/x-pixel": "src/plugins/x-pixel/index.ts",
    "plugins/linkedin-insight": "src/plugins/linkedin-insight/index.ts",
    "plugins/mixpanel": "src/plugins/mixpanel/index.ts",
    "plugins/amplitude": "src/plugins/amplitude/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
});
