import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMetaConversionApiPlugin } from "./index";

const TEST_ENDPOINT = "https://example.com/api/meta-capi";
const TEST_EVENT_ID = "evt-abc-123";
const TEST_CONTEXT = { eventId: TEST_EVENT_ID };

describe("createMetaConversionApiPlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom does not define sendBeacon — assign a mock directly
    navigator.sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    // Reset cookies
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

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_id).toBe(TEST_EVENT_ID);
    });

    it("should include action_source as website", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.action_source).toBe("website");
    });

    it("should include event_time as unix seconds", async () => {
      const now = 1712600000;
      vi.spyOn(Date, "now").mockReturnValue(now * 1000);

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_time).toBe(now);
    });

    it("should include event_source_url from window.location.href", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_source_url).toBe(window.location.href);
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to PageView", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_name).toBe("PageView");
    });

    it("should map purchase to Purchase with currency and value", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2 }],
        },
        TEST_CONTEXT,
      );

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_name).toBe("Purchase");
      expect(payload.custom_data).toMatchObject({
        currency: "KRW",
        value: 29000,
        content_ids: ["SKU1"],
        contents: [{ id: "SKU1", quantity: 2 }],
        num_items: 1,
      });
    });

    it("should map add_to_cart to AddToCart", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_name).toBe("AddToCart");
      expect(payload.custom_data).toMatchObject({ currency: "USD", value: 50 });
    });

    it("should map search with search_term to search_string", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("search", { search_term: "running shoes" }, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_name).toBe("Search");
      expect(payload.custom_data.search_string).toBe("running shoes");
    });

    it("should map view_item_list to ViewContent", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track(
        "view_item_list",
        { items: [{ item_id: "SKU1", item_name: "Shirt" }] },
        TEST_CONTEXT,
      );

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_name).toBe("ViewContent");
    });

    it("should use original GA4 event name for unmapped events", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("refund", { currency: "KRW", value: 5000 }, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.event_name).toBe("refund");
    });
  });

  describe("track — item transformation", () => {
    it("should transform items to content_ids, contents, and num_items", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3 },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        TEST_CONTEXT,
      );

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.custom_data).toMatchObject({
        content_ids: ["A", "B"],
        contents: [
          { id: "A", quantity: 3 },
          { id: "B", quantity: 1 },
        ],
        num_items: 2,
      });
    });

    it("should not include item fields when items array is empty", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("view_item", { items: [] }, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.custom_data.content_ids).toBeUndefined();
      expect(payload.custom_data.contents).toBeUndefined();
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

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.fbp).toBe("fb.1.1234567890.abcdef");
    });

    it("should include fbc cookie in user_data", async () => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "_fbc=fb.1.1234567890.xyz",
      });

      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.fbc).toBe("fb.1.1234567890.xyz");
    });

    it("should include client_user_agent from navigator", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.client_user_agent).toBe(navigator.userAgent);
    });

    it("should omit fbp and fbc when cookies are absent", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.fbp).toBeUndefined();
      expect(payload.user_data.fbc).toBeUndefined();
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

  describe("setUser / resetUser", () => {
    it("should include user properties in track payload after setUser", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.setUser?.({ email: "user@example.com", user_id: "u-001" });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.em).toBe("user@example.com");
      expect(payload.user_data.external_id).toBe("u-001");
    });

    it("should clear user properties after resetUser", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.setUser?.({ email: "user@example.com" });
      plugin.resetUser?.();

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.em).toBeUndefined();
    });

    it("should map email→em, phone_number→ph, first_name→fn, last_name→ln, user_id→external_id", async () => {
      const plugin = createMetaConversionApiPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.setUser?.({
        email: "a@b.com",
        phone_number: "+821012345678",
        first_name: "Jane",
        last_name: "Doe",
        user_id: "u-42",
      });

      plugin.track("page_view", {}, TEST_CONTEXT);

      const [, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(await (blob as Blob).text());

      expect(payload.user_data.em).toBe("a@b.com");
      expect(payload.user_data.ph).toBe("+821012345678");
      expect(payload.user_data.fn).toBe("Jane");
      expect(payload.user_data.ln).toBe("Doe");
      expect(payload.user_data.external_id).toBe("u-42");
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
