import { hashPii } from "@sunwjy/funnel-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMetaConversionApiPlugin } from "./index";

const TEST_ENDPOINT = "https://example.com/api/meta-capi";
const TEST_EVENT_ID = "evt-abc-123";
const TEST_CONTEXT = { eventId: TEST_EVENT_ID };

function lastBeaconBlob(): Blob {
  const calls = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1][1] as Blob;
}

async function lastBeaconPayload(): Promise<Record<string, unknown>> {
  const text = await lastBeaconBlob().text();
  return JSON.parse(text);
}

describe("createMetaConversionApiPlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigator.sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("should have name 'meta-conversion-api'", () => {
    const plugin = createMetaConversionApiPlugin();
    expect(plugin.name).toBe("meta-conversion-api");
  });

  describe("initialize", () => {
    it("should store the endpoint and use it when tracking", () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).toHaveBeenCalledWith(TEST_ENDPOINT, expect.any(Blob));
    });

    it("should not send when endpoint is absent", () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({});
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("track — payload structure", () => {
    it("should include event_id from context", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_id).toBe(TEST_EVENT_ID);
    });

    it("should include action_source as website", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.action_source).toBe("website");
    });

    it("should include event_time as unix seconds", async () => {
      const now = 1712600000;
      vi.spyOn(Date, "now").mockReturnValue(now * 1000);

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_time).toBe(now);
    });

    it("should include event_source_url from window.location.href", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_source_url).toBe(window.location.href);
    });

    it("should include test_event_code when configured", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, testEventCode: "TEST123" });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.test_event_code).toBe("TEST123");
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to PageView", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_name).toBe("PageView");
    });

    it("should map purchase to Purchase with order_id, currency, value", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
        },
        TEST_CONTEXT,
      );

      const payload = await lastBeaconPayload();
      expect(payload.event_name).toBe("Purchase");
      expect(payload.custom_data).toMatchObject({
        currency: "KRW",
        value: 29000,
        order_id: "T-1",
        content_ids: ["SKU1"],
        contents: [{ id: "SKU1", quantity: 2, item_price: 14500 }],
        num_items: 1,
      });
    });

    it("should map add_to_cart to AddToCart", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_name).toBe("AddToCart");
      expect(payload.custom_data).toMatchObject({ currency: "USD", value: 50 });
    });

    it("should map search with search_term to search_string", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("search", { search_term: "running shoes" }, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_name).toBe("Search");
      const customData = payload.custom_data as Record<string, unknown>;
      expect(customData.search_string).toBe("running shoes");
    });

    it("should map view_item_list to ViewContent", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track(
        "view_item_list",
        { items: [{ item_id: "SKU1", item_name: "Shirt" }] },
        TEST_CONTEXT,
      );

      const payload = await lastBeaconPayload();
      expect(payload.event_name).toBe("ViewContent");
    });

    it("should use original GA4 event name for unmapped events", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("refund", { currency: "KRW", value: 5000 }, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      expect(payload.event_name).toBe("refund");
    });
  });

  describe("track — item transformation", () => {
    it("should transform items to content_ids, contents (with item_price), and num_items", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3, price: 10 },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        TEST_CONTEXT,
      );

      const payload = await lastBeaconPayload();
      expect(payload.custom_data).toMatchObject({
        content_ids: ["A", "B"],
        contents: [
          { id: "A", quantity: 3, item_price: 10 },
          { id: "B", quantity: 1 },
        ],
        num_items: 2,
      });
    });

    it("should not include item fields when items array is empty", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("view_item", { items: [] }, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const customData = payload.custom_data as Record<string, unknown>;
      expect(customData.content_ids).toBeUndefined();
      expect(customData.contents).toBeUndefined();
    });
  });

  describe("track — user_data collection", () => {
    it("should include fbp cookie in user_data", async () => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "_fbp=fb.1.1234567890.abcdef",
      });

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, unknown>;
      expect(userData.fbp).toBe("fb.1.1234567890.abcdef");
    });

    it("should include fbc cookie in user_data", async () => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "_fbc=fb.1.1234567890.xyz",
      });

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, unknown>;
      expect(userData.fbc).toBe("fb.1.1234567890.xyz");
    });

    it("should include client_user_agent from navigator", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, unknown>;
      expect(userData.client_user_agent).toBe(navigator.userAgent);
    });

    it("should omit fbp and fbc when cookies are absent", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, unknown>;
      expect(userData.fbp).toBeUndefined();
      expect(userData.fbc).toBeUndefined();
    });

    it("should synthesize fbc from fbclid query param when no _fbc cookie", async () => {
      const now = 1712600000_000;
      vi.spyOn(Date, "now").mockReturnValue(now);
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "https://example.com/?fbclid=abc123", search: "?fbclid=abc123" },
      });

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, unknown>;
      expect(userData.fbc).toBe(`fb.1.${now}.abc123`);

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should synthesize fbc once and reuse the same value on later events", async () => {
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1712600000_000);
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "https://example.com/?fbclid=abc123", search: "?fbclid=abc123" },
      });

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);
      // A later event must NOT re-synthesize fbc with a fresh timestamp —
      // Meta treats the creation time as part of the click identifier.
      nowSpy.mockReturnValue(1712600005_000);
      plugin.track("page_view", {}, { eventId: "evt-2" });

      const calls = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls).toHaveLength(2);
      const first = JSON.parse(await (calls[0][1] as Blob).text());
      const second = JSON.parse(await (calls[1][1] as Blob).text());
      expect(first.user_data.fbc).toBe("fb.1.1712600000000.abc123");
      expect(second.user_data.fbc).toBe(first.user_data.fbc);

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });
  });

  describe("track — sendBeacon with fetch fallback", () => {
    it("should use sendBeacon as the primary transport", () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should fall back to fetch when sendBeacon returns false", () => {
      navigator.sendBeacon = vi.fn().mockReturnValue(false);

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(fetch).toHaveBeenCalledWith(
        TEST_ENDPOINT,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should use fetch when sendBeacon is not available", () => {
      // @ts-expect-error — simulate missing sendBeacon
      delete navigator.sendBeacon;

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(fetch).toHaveBeenCalledWith(
        TEST_ENDPOINT,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should not throw when fetch rejects", () => {
      navigator.sendBeacon = vi.fn().mockReturnValue(false);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      expect(() => plugin.track("page_view", {}, TEST_CONTEXT)).not.toThrow();
    });
  });

  describe("setUser / resetUser — PII hashing", () => {
    it("should hash email/phone/name/user_id before sending", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.setUser?.({
        email: "  Jane@Example.COM ",
        phone_number: "+82 10-1234-5678",
        first_name: "Jane",
        last_name: "Doe",
        user_id: "u-001",
      });

      plugin.track("page_view", {}, TEST_CONTEXT);
      // Deterministically wait for the async hash + dispatch — a single
      // setTimeout(0) tick races against the SubtleCrypto digests and is
      // flaky under full-suite load.
      await vi.waitFor(() => {
        expect(navigator.sendBeacon).toHaveBeenCalled();
      });

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, string>;

      // Verify each field is hashed (not the raw value) and has expected SHA-256 hex.
      const expectedEm = await hashPii("  Jane@Example.COM ", "email");
      const expectedPh = await hashPii("+82 10-1234-5678", "phone");
      const expectedFn = await hashPii("Jane", "name");
      const expectedLn = await hashPii("Doe", "name");
      const expectedExt = await hashPii("u-001", "id");

      expect(userData.em).toBe(expectedEm);
      expect(userData.ph).toBe(expectedPh);
      expect(userData.fn).toBe(expectedFn);
      expect(userData.ln).toBe(expectedLn);
      expect(userData.external_id).toBe(expectedExt);

      // Sanity: hashed values are not the raw inputs.
      expect(userData.em).not.toBe("Jane@Example.COM");
      expect(userData.ph).not.toBe("+82 10-1234-5678");
    });

    it("should hash PII once at setUser and reuse the digests across tracks", async () => {
      const digestSpy = vi.spyOn(crypto.subtle, "digest");
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.setUser?.({
        email: "user@example.com",
        phone_number: "+821012345678",
        first_name: "Jane",
        last_name: "Doe",
        user_id: "u-001",
      });

      plugin.track("page_view", {}, TEST_CONTEXT);
      plugin.track("page_view", {}, { eventId: "evt-2" });

      await vi.waitFor(() => {
        expect((navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
      });

      // 5 PII fields → 5 digests total, NOT 5 per track() call.
      expect(digestSpy).toHaveBeenCalledTimes(5);

      const calls = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls;
      const first = JSON.parse(await (calls[0][1] as Blob).text());
      const second = JSON.parse(await (calls[1][1] as Blob).text());
      expect(first.user_data.em).toMatch(/^[a-f0-9]{64}$/);
      expect(second.user_data.em).toBe(first.user_data.em);
    });

    it("should clear user properties after resetUser", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.setUser?.({ email: "user@example.com" });
      plugin.resetUser?.();

      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await lastBeaconPayload();
      const userData = payload.user_data as Record<string, unknown>;
      expect(userData.em).toBeUndefined();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when window is undefined", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — simulate SSR
      delete globalThis.window;

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      expect(() => plugin.track("page_view", {}, TEST_CONTEXT)).not.toThrow();

      globalThis.window = originalWindow;
    });
  });
});
