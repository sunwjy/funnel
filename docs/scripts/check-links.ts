/**
 * Dependency-free internal-link checker for the built docs (AC12).
 *
 * `starlight-links-validator` does not yet support Astro 7's markdown processor, so this
 * walks the built `dist/` HTML, extracts site-absolute page links (`/...`), and verifies each
 * resolves to an emitted HTML file. Asset links (with a file extension), external URLs,
 * anchors, and mailto/tel are skipped. Exits non-zero on any broken internal page link.
 *
 * Run after `astro build`: `node scripts/check-links.ts`
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

if (!existsSync(dist)) {
  console.error("✗ dist/ not found — run `astro build` first");
  process.exit(1);
}

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html"))
      out.push(join(entry.parentPath, entry.name));
  }
  return out;
}

/** Resolve a site-absolute page link to the HTML file Astro would emit for it. */
function resolveTarget(href: string): string | null {
  const path = href.split("#")[0].split("?")[0];
  if (path === "" || path === "/") return join(dist, "index.html");
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const lastSegment = clean.split("/").pop() ?? "";
  // Skip asset links (anything with a file extension in the last segment).
  if (lastSegment.includes(".")) return null;
  return join(dist, clean, "index.html");
}

const hrefRe = /href="([^"]+)"/g;
const broken: string[] = [];
let checked = 0;

for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(hrefRe)) {
    const href = m[1];
    if (!href.startsWith("/")) continue; // external / relative / anchor / mailto
    const target = resolveTarget(href);
    if (target === null) continue; // asset link
    checked++;
    if (!existsSync(target)) {
      broken.push(`${file.replace(dist, "dist")} → ${href}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`\n✗ ${broken.length} broken internal link(s):`);
  for (const b of [...new Set(broken)].sort()) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`✓ internal links OK — ${checked} page link(s) checked, none broken`);
