/**
 * PII normalization and SHA-256 hashing for advertising-platform user data.
 *
 * @remarks
 * Meta CAPI, Google Enhanced Conversions, TikTok Events API, and X Conversion API
 * all expect normalized + SHA-256-hashed PII (lowercase, trimmed, country-code-only
 * digits for phone). These helpers centralize that normalization so plugins do not
 * each ship their own.
 *
 * SubtleCrypto is required for hashing. When unavailable (older browsers, some
 * SSR runtimes), the helpers return `undefined` so callers can omit the field
 * rather than transmit raw PII.
 *
 * @packageDocumentation
 */

const HEX = "0123456789abcdef";

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    const b = view[i];
    out += HEX[(b >> 4) & 0xf] + HEX[b & 0xf];
  }
  return out;
}

function getSubtleCrypto(): SubtleCrypto | undefined {
  const g = globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } };
  return g.crypto?.subtle;
}

/**
 * Supported PII kinds for {@link normalizePii} / {@link hashPii}.
 *
 * Phone normalization is platform-specific:
 * - `phone` — Meta/Google style: digits only, no "+".
 * - `phone_e164` — X (Twitter) style: leading "+" preserved (e.g. `+11234567890`).
 */
export type PiiKind = "email" | "phone" | "phone_e164" | "name" | "id";

/**
 * Normalizes a value according to the rules for the given PII kind.
 *
 * - `email`: trim + lowercase
 * - `phone`: keep digits only (drops "+", spaces, dashes, parentheses)
 * - `phone_e164`: keep digits, preserving a single leading "+"
 * - `name`: trim + lowercase
 * - `id`: trim
 *
 * Returns an empty string for null/undefined/empty input.
 */
export function normalizePii(value: string | null | undefined, kind: PiiKind): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  switch (kind) {
    case "email":
      return trimmed.toLowerCase();
    case "phone":
      return trimmed.replace(/\D+/g, "");
    case "phone_e164": {
      const prefix = trimmed.startsWith("+") ? "+" : "";
      return prefix + trimmed.replace(/\D+/g, "");
    }
    case "name":
      return trimmed.toLowerCase();
    case "id":
      return trimmed;
  }
}

/**
 * Normalizes and SHA-256-hashes a PII value.
 *
 * @returns Lowercase hex digest, or `undefined` if input is empty or
 *          SubtleCrypto is unavailable.
 */
export async function hashPii(
  value: string | null | undefined,
  kind: PiiKind,
): Promise<string | undefined> {
  const normalized = normalizePii(value, kind);
  if (!normalized) return undefined;
  const subtle = getSubtleCrypto();
  if (!subtle) return undefined;
  const data = new TextEncoder().encode(normalized);
  const digest = await subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}
