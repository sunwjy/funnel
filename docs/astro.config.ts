import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://funnel-docs.netlify.app",
  integrations: [
    starlight({
      title: "Funnel",
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/sunwjy/funnel",
        },
      ],
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        ko: { label: "한국어", lang: "ko" },
      },
      sidebar: [
        {
          label: "Start Here",
          translations: { ko: "시작하기" },
          items: [{ autogenerate: { directory: "start-here" } }],
        },
        {
          label: "Guides",
          translations: { ko: "가이드" },
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "Plugins",
          translations: { ko: "플러그인" },
          items: [{ autogenerate: { directory: "plugins" } }],
        },
        {
          label: "Reference",
          translations: { ko: "레퍼런스" },
          items: [{ autogenerate: { directory: "reference" } }],
        },
      ],
    }),
  ],
});
