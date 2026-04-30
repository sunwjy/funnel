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
    it("should map page_view to PageVisit with event_id", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "PageVisit",
        expect.objectContaining({ event_id: "test-event-id" }),
      );
    });

    it("should map purchase to Purchase with per-item content fields and order_id", () => {
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
          contents: [{ id: "SKU1", item_price: 99.99, quantity: 1 }],
          num_items: 1,
          event_id: "test-event-id",
        }),
      );
    });

    it("should map add_to_cart to AddToCart with content_ids when no per-item data", () => {
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
    it("should use content_ids when no per-item price/quantity", () => {
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

    it("should use contents array when per-item price/quantity is present", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track(
        "view_item",
        {
          items: [
            { item_id: "A", item_name: "Item A", price: 10, quantity: 2 },
            { item_id: "B", item_name: "Item B", price: 20 },
          ],
        },
        mockContext,
      );

      const params = (window.twq as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(params.contents).toEqual([
        { id: "A", item_price: 10, quantity: 2 },
        { id: "B", item_price: 20 },
      ]);
      expect(params.num_items).toBe(2);
    });

    it("should not include content_ids when items is empty", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.twq as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(params.content_ids).toBeUndefined();
      expect(params.contents).toBeUndefined();
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when twq is not available", () => {
      const plugin = createXPixelPlugin();

      expect(() =>
        plugin.track(
          "purchase",
          { currency: "USD", value: 50, transaction_id: "T-1" },
          mockContext,
        ),
      ).not.toThrow();
    });
  });

  describe("setUser", () => {
    it("should call twq config with pixelId and SHA-256-hashed user data", async () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      plugin.setUser?.({ email: "test@example.com", phone_number: "+821012345678" });
      // setUser hashes asynchronously
      await new Promise((r) => setTimeout(r, 0));

      const call = (window.twq as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === "config" && c[1] === "o12345" && c[2],
      );
      expect(call).toBeDefined();
      const data = call?.[2] as Record<string, string>;
      // Hashed values are 64-char hex; raw values must NOT appear.
      expect(data.em).toMatch(/^[a-f0-9]{64}$/);
      expect(data.ph_number).toMatch(/^[a-f0-9]{64}$/);
      expect(data.em).not.toBe("test@example.com");
      expect(data.ph_number).not.toBe("+821012345678");
    });

    it("should not call twq when pixelId is not set", async () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();

      plugin.setUser?.({ email: "test@example.com" });
      await new Promise((r) => setTimeout(r, 0));

      expect(window.twq).not.toHaveBeenCalled();
    });

    it("should not throw in SSR", () => {
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      expect(() => plugin.setUser?.({ email: "test@example.com" })).not.toThrow();
    });
  });
});
