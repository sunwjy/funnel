/**
 * i18n parity gate for the bilingual docs (en `root` locale + ko).
 *
 * Asymmetric tree: English pages live at the top level of `src/content/docs/`,
 * Korean pages under `src/content/docs/ko/`. This compares the top-level slug set
 * (excluding `ko/`) against the `ko/` slug set and reports the symmetric difference.
 *
 * Run via Node native type stripping (Node >= 22.18): `node scripts/check-i18n-parity.ts`
 * Pass `--strict` to exit non-zero on any mismatch (used on push to `main`).
 */
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const strict = process.argv.includes("--strict");
const root = fileURLToPath(new URL("../src/content/docs", import.meta.url));

function collectSlugs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
    const full = join(entry.parentPath, entry.name);
    out.push(
      relative(root, full)
        .replace(/\\/g, "/")
        .replace(/\.mdx?$/, ""),
    );
  }
  return out;
}

const en = new Set<string>();
const ko = new Set<string>();
for (const slug of collectSlugs(root)) {
  if (slug.startsWith("ko/")) ko.add(slug.slice(3));
  else if (slug !== "ko") en.add(slug);
}

const missingKo = [...en].filter((s) => !ko.has(s)).sort();
const missingEn = [...ko].filter((s) => !en.has(s)).sort();

if (missingKo.length === 0 && missingEn.length === 0) {
  console.log(`✓ i18n parity OK — ${en.size} page(s) present in both en and ko`);
  process.exit(0);
}

if (missingKo.length) {
  console.error(`\n✗ Missing Korean translation (${missingKo.length}):`);
  for (const s of missingKo) console.error(`  - ko/${s}`);
}
if (missingEn.length) {
  console.error(`\n✗ Missing English source (${missingEn.length}):`);
  for (const s of missingEn) console.error(`  - ${s}`);
}
console.error(`\nen=${en.size} ko=${ko.size} (mode: ${strict ? "strict" : "warn"})`);
process.exit(strict ? 1 : 0);
