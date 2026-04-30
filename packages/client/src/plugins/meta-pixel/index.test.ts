import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMetaPixelPlugin } from "./index";

describe("createMetaPixelPlugin", () => {
  const mockContext = { eventId: "test-event-id-123" };

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.fbq;
  });

  it("should have name 'meta-pixel'", () => {
    const plugin = createMetaPixelPlugin();
    expect(plugin.name).toBe("meta-pixel");
  });

  describe("initialize", () => {
    it("should call fbq init with pixelId", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.initialize({ pixelId: "123456789" });

      expect(window.fbq).toHaveBeenCalledWith("init", "123456789");
    });

    it("should not call fbq when pixelId is absent", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.initialize({});

      expect(window.fbq).not.toHaveBeenCalled();
    });

    it("should not throw when fbq is not defined", () => {
      const plugin = createMetaPixelPlugin();

      expect(() => plugin.initialize({ pixelId: "123" })).not.toThrow();
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to PageView and forward page_title/location/referrer when provided", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track(
        "page_view",
        {
          page_title: "Home",
          page_location: "https://example.com/",
          page_referrer: "https://example.com/prev",
        },
        mockContext,
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "PageView",
        expect.objectContaining({
          page_title: "Home",
          page_location: "https://example.com/",
          page_referrer: "https://example.com/prev",
        }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should map page_view with no params to PageView with empty payload", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "PageView",
        {},
        { eventID: "test-event-id-123" },
      );
    });

    it("should map purchase to Purchase with order_id and per-item content fields", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-1",
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
        },
        mockContext,
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          order_id: "T-1",
          content_ids: ["SKU1"],
          content_type: "product",
          contents: [{ id: "SKU1", quantity: 2, item_price: 14500 }],
          num_items: 1,
        }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should map add_to_cart to AddToCart", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "AddToCart",
        expect.objectContaining({ currency: "USD", value: 50 }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should map begin_checkout to InitiateCheckout", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith("track", "InitiateCheckout", expect.any(Object), {
        eventID: "test-event-id-123",
      });
    });

    it("should map sign_up to CompleteRegistration with status and content_name", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("sign_up", { method: "google" }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "CompleteRegistration",
        expect.objectContaining({ status: "complete", content_name: "google" }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should map search with search_term to search_string", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("search", { search_term: "shoes" }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Search",
        expect.objectContaining({ search_string: "shoes" }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should set content_type product_group on view_item_list when items are present", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track(
        "view_item_list",
        { items: [{ item_id: "SKU1", item_name: "Shirt" }] },
        mockContext,
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({ content_type: "product_group" }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should NOT set content_type product_group on view_item_list when items are absent", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("view_item_list", {}, mockContext);

      const params = (window.fbq as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(params.content_type).toBeUndefined();
    });

    it("should send unmapped events as trackCustom", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("refund", { currency: "KRW", value: 5000 }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "trackCustom",
        "refund",
        expect.objectContaining({ currency: "KRW", value: 5000 }),
        { eventID: "test-event-id-123" },
      );
    });
  });

  describe("track — item transformation", () => {
    it("should transform items to content_ids, contents, and num_items", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3, price: 10 },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        mockContext,
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({
          content_ids: ["A", "B"],
          contents: [
            { id: "A", quantity: 3, item_price: 10 },
            { id: "B", quantity: 1 },
          ],
          num_items: 2,
        }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should not include item fields when items is empty", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.fbq as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(params.content_ids).toBeUndefined();
      expect(params.contents).toBeUndefined();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when fbq is not available", () => {
      const plugin = createMetaPixelPlugin();

      expect(() =>
        plugin.track(
          "purchase",
          { currency: "KRW", value: 1000, transaction_id: "T-1" },
          mockContext,
        ),
      ).not.toThrow();
    });
  });

  describe("setUser", () => {
    it("should call fbq init with pixelId and mapped user data", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      plugin.initialize({ pixelId: "123456789" });

      plugin.setUser?.({ email: "user@example.com", first_name: "Jane", last_name: "Doe" });

      expect(window.fbq).toHaveBeenCalledWith("init", "123456789", {
        em: "user@example.com",
        fn: "Jane",
        ln: "Doe",
      });
    });

    it("should map user_id to external_id", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      plugin.initialize({ pixelId: "123456789" });

      plugin.setUser?.({ user_id: "u-001", phone_number: "+821012345678" });

      expect(window.fbq).toHaveBeenCalledWith("init", "123456789", {
        external_id: "u-001",
        ph: "+821012345678",
      });
    });

    it("should not call fbq when pixelId is not set", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();

      plugin.setUser?.({ email: "user@example.com" });

      expect(window.fbq).not.toHaveBeenCalled();
    });

    it("should not throw in SSR", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — simulate SSR
      delete globalThis.window;

      const plugin = createMetaPixelPlugin();

      expect(() => plugin.setUser?.({ email: "user@example.com" })).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  describe("track — event deduplication", () => {
    it("should pass eventId as eventID to fbq", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      plugin.track(
        "purchase",
        { currency: "KRW", value: 1000, transaction_id: "T-1" },
        { eventId: "abc-123" },
      );
      expect(window.fbq).toHaveBeenCalledWith("track", "Purchase", expect.any(Object), {
        eventID: "abc-123",
      });
    });
  });
});
