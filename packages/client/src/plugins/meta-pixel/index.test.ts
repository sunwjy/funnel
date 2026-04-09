import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMetaPixelPlugin } from "./index";

describe("createMetaPixelPlugin", () => {
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
    it("should map page_view to PageView without params", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track("page_view", {}, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "PageView",
        {},
        { eventID: "test-event-id-123" },
      );
    });

    it("should map purchase to Purchase with params", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2 }],
        },
        mockContext,
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          content_ids: ["SKU1"],
          content_type: "product",
          contents: [{ id: "SKU1", quantity: 2 }],
          num_items: 1,
        }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should map add_to_cart to AddToCart", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

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
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith("track", "InitiateCheckout", expect.any(Object), {
        eventID: "test-event-id-123",
      });
    });

    it("should map sign_up to CompleteRegistration with status and content_name", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

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
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track("search", { search_term: "shoes" }, mockContext);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Search",
        expect.objectContaining({ search_string: "shoes" }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should map view_item_list with content_type product_group", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track(
        "view_item_list",
        {
          items: [{ item_id: "SKU1", item_name: "Shirt" }],
        },
        mockContext,
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({ content_type: "product_group" }),
        { eventID: "test-event-id-123" },
      );
    });

    it("should send unmapped events as trackCustom", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

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
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", quantity: 3 },
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
            { id: "A", quantity: 3 },
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
      const mockContext = { eventId: "test-event-id-123" };

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.fbq as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(params.content_ids).toBeUndefined();
      expect(params.contents).toBeUndefined();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when fbq is not available", () => {
      const plugin = createMetaPixelPlugin();
      const mockContext = { eventId: "test-event-id-123" };

      expect(() =>
        plugin.track("purchase", { currency: "KRW", value: 1000 }, mockContext),
      ).not.toThrow();
    });
  });

  describe("track — event deduplication", () => {
    it("should pass eventId as eventID to fbq", () => {
      window.fbq = vi.fn();
      const plugin = createMetaPixelPlugin();
      plugin.track("purchase", { currency: "KRW", value: 1000 }, { eventId: "abc-123" });
      expect(window.fbq).toHaveBeenCalledWith("track", "Purchase", expect.any(Object), {
        eventID: "abc-123",
      });
    });
  });
});
