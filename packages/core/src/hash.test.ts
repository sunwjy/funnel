import { describe, expect, it } from "vitest";
import { hashPii, normalizePii } from "./hash";

describe("normalizePii", () => {
  it("should lowercase and trim emails", () => {
    expect(normalizePii("  Jane@Example.COM ", "email")).toBe("jane@example.com");
  });

  it("should strip non-digits from phone numbers", () => {
    expect(normalizePii("+82 (10) 1234-5678", "phone")).toBe("821012345678");
  });

  it("should lowercase and trim names", () => {
    expect(normalizePii("  Jane ", "name")).toBe("jane");
  });

  it("should only trim ids", () => {
    expect(normalizePii("  U-001  ", "id")).toBe("U-001");
  });

  it("should return empty string for empty/null/undefined input", () => {
    expect(normalizePii(undefined, "email")).toBe("");
    expect(normalizePii(null, "email")).toBe("");
    expect(normalizePii("", "email")).toBe("");
    expect(normalizePii("   ", "email")).toBe("");
  });
});

describe("hashPii", () => {
  it("returns undefined for empty input", async () => {
    expect(await hashPii(undefined, "email")).toBeUndefined();
    expect(await hashPii("", "email")).toBeUndefined();
  });

  it("returns the SHA-256 hex of normalized email per Meta spec", async () => {
    // SHA-256 of "jane@example.com"
    expect(await hashPii("Jane@Example.com", "email")).toBe(
      "8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d",
    );
  });

  it("hashes the same email regardless of case/whitespace", async () => {
    const a = await hashPii("Jane@Example.com", "email");
    const b = await hashPii("  jane@example.COM  ", "email");
    expect(a).toBe(b);
  });

  it("hashes the same phone regardless of formatting", async () => {
    const a = await hashPii("+1 (555) 123-4567", "phone");
    const b = await hashPii("15551234567", "phone");
    expect(a).toBe(b);
  });
});
