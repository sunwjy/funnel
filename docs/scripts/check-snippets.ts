/**
 * Snippet drift gate: verifies every `@sunwjy/funnel-client` import path used in the
 * docs code fences is a real subpath export of the published package.
 *
 * `astro check` does NOT type-check code fences inside `.md`/`.mdx`, so this script is
 * the actual gate for AC9. It reads the valid import specifiers straight from
 * `packages/client/package.json` `exports`, so it cannot drift from the real API surface.
 *
 * Run via Node native type stripping (Node >= 22.18): `node scripts/check-snippets.ts`
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const clientPkg = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../packages/client/package.json", import.meta.url)),
    "utf8",
  ),
) as { name: string; exports: Record<string, unknown> };

const valid = new Set<string>();
for (const key of Object.keys(clientPkg.exports)) {
  valid.add(key === "." ? clientPkg.name : `${clientPkg.name}/${key.replace(/^\.\//, "")}`);
}

const docsRoot = fileURLToPath(new URL("../src/content/docs", import.meta.url));
function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && /\.mdx?$/.test(entry.name)) out.push(join(entry.parentPath, entry.name));
  }
  return out;
}

const importRe = /from\s+["'](@sunwjy\/funnel-client(?:\/[^"']+)?)["']/g;
let bad = 0;
let checked = 0;
for (const file of collect(docsRoot)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(importRe)) {
    checked++;
    if (!valid.has(m[1])) {
      console.error(`✗ ${file}: unknown import "${m[1]}"`);
      bad++;
    }
  }
}

if (bad > 0) {
  console.error(`\n✗ ${bad} invalid @sunwjy/funnel-client import path(s)`);
  process.exit(1);
}
console.log(`✓ snippet imports OK — ${checked} funnel-client import(s), all valid subpaths`);
