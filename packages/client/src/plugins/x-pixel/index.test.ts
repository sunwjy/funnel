import { beforeEach, describe, expect, it, vi } from "vitest";
import { createXPixelPlugin } from "./index";

describe("createXPixelPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.twq;
  });

  it("should have name 'x-pixel'", () => {
    const plugin = createXPixelPlugin();
    expect(plugin.name).toBe("x-pixel");
  });

  describe("initialize", () => {
    it("should call twq('config', pixelId) when pixelId is provided", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.initialize({ pixelId: "o12345" });

      expect(window.twq).toHaveBeenCalledWith("config", "o12345");
    });

    it("should not call twq when pixelId is absent", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.initialize({});

      expect(window.twq).not.toHaveBeenCalled();
    });

    it("should not throw when twq is not defined (SSR)", () => {
      const plugin = createXPixelPlugin();

      expect(() => plugin.initialize({ pixelId: "o12345" })).not.toThrow();
    });
  });

  describe("track — event mapping", () => {
    it("should map page_view to PageVisit", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.twq).toHaveBeenCalledWith("event", "PageVisit", {});
    });

    it("should map purchase to Purchase with value, currency, order_id, content_ids", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track(
        "purchase",
        {
          currency: "USD",
          value: 99.99,
          transaction_id: "TXN-001",
          items: [{ item_id: "SKU1", item_name: "Shirt", quantity: 1, price: 99.99 }],
        },
        mockContext,
      );

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "Purchase",
        expect.objectContaining({
          value: 99.99,
          currency: "USD",
          order_id: "TXN-001",
          content_ids: ["SKU1"],
          content_type: "product",
          num_items: 1,
        }),
      );
    });

    it("should map add_to_cart to AddToCart with item params", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track(
        "add_to_cart",
        {
          currency: "USD",
          value: 50,
          items: [{ item_id: "SKU2", item_name: "Hat" }],
        },
        mockContext,
      );

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "AddToCart",
        expect.objectContaining({
          currency: "USD",
          value: 50,
          content_ids: ["SKU2"],
          content_type: "product",
          num_items: 1,
        }),
      );
    });

    it("should map begin_checkout to InitiateCheckout", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("begin_checkout", { currency: "USD", value: 120 }, mockContext);

      expect(window.twq).toHaveBeenCalledWith("event", "InitiateCheckout", expect.any(Object));
    });

    it("should map search to Search with search_string", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("search", { search_term: "running shoes" }, mockContext);

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "Search",
        expect.objectContaining({ search_string: "running shoes" }),
      );
    });

    it("should map sign_up to CompleteRegistration", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("sign_up", {}, mockContext);

      expect(window.twq).toHaveBeenCalledWith("event", "CompleteRegistration", expect.any(Object));
    });

    it("should map generate_lead to Lead with value and currency", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("generate_lead", { currency: "USD", value: 25 }, mockContext);

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "Lead",
        expect.objectContaining({ value: 25, currency: "USD" }),
      );
    });

    it("should map add_payment_info to AddPaymentInfo", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("add_payment_info", { currency: "USD", value: 100 }, mockContext);

      expect(window.twq).toHaveBeenCalledWith("event", "AddPaymentInfo", expect.any(Object));
    });

    it("should send unmapped events as custom via twq('event', eventName, params)", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("refund", { currency: "USD", value: 20 }, mockContext);

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "refund",
        expect.objectContaining({ currency: "USD", value: 20 }),
      );
    });
  });

  describe("track — item transformation", () => {
    it("should transform items to content_ids, content_type, num_items", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A" },
            { item_id: "B", item_name: "Item B" },
          ],
        },
        mockContext,
      );

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "ViewContent",
        expect.objectContaining({
          content_ids: ["A", "B"],
          content_type: "product",
          num_items: 2,
        }),
      );
    });

    it("should not include content_ids when items is empty", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.twq as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(params.content_ids).toBeUndefined();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when twq is not available", () => {
      const plugin = createXPixelPlugin();

      expect(() =>
        plugin.track("purchase", { currency: "USD", value: 50 }, mockContext),
      ).not.toThrow();
    });
  });
});
