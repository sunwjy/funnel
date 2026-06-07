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

  /**
   * X advanced matching rides on EVENT parameters (`email_address`,
   * `phone_number`) — not on `twq("config")`. The uwt.js pixel SHA-256
   * hashes these client-side before transmission, so the plugin passes
   * normalized plaintext (pre-hashing would cause a double-hash mismatch).
   * Phone must be in `+<country code><number>` format.
   *
   * @see https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites
   */
  /** Params of the first twq("event", ...) call — skips the initialize-time config call. */
  function firstEventParams(): Record<string, unknown> {
    const call = (window.twq as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "event");
    expect(call).toBeDefined();
    return call?.[2] as Record<string, unknown>;
  }

  describe("setUser — advanced matching via event params", () => {
    it("should attach normalized email_address and E.164 phone_number to subsequent events", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      plugin.setUser?.({ email: "  Test@Example.COM ", phone_number: "+82 10-1234-5678" });
      plugin.track("purchase", { transaction_id: "T-1", currency: "USD", value: 50 }, mockContext);

      expect(window.twq).toHaveBeenCalledWith(
        "event",
        "Purchase",
        expect.objectContaining({
          email_address: "test@example.com",
          phone_number: "+821012345678",
        }),
      );
    });

    it("should not use the legacy em/ph_number keys", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      plugin.setUser?.({ email: "test@example.com", phone_number: "+821012345678" });
      plugin.track("page_view", {}, mockContext);

      const params = firstEventParams();
      expect(params.em).toBeUndefined();
      expect(params.ph_number).toBeUndefined();
    });

    it("should not call twq at setUser time — user data rides on events", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });
      (window.twq as ReturnType<typeof vi.fn>).mockClear(); // drop the config call

      plugin.setUser?.({ email: "test@example.com" });

      expect(window.twq).not.toHaveBeenCalled();
    });

    it("should omit user keys whose values are empty after normalization", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      plugin.setUser?.({ email: "   ", phone_number: undefined });
      plugin.track("page_view", {}, mockContext);

      const params = firstEventParams();
      expect(params.email_address).toBeUndefined();
      expect(params.phone_number).toBeUndefined();
    });

    it("should replace previously stored user data on subsequent setUser calls", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      plugin.setUser?.({ email: "old@example.com", phone_number: "+821011112222" });
      plugin.setUser?.({ email: "new@example.com" });
      plugin.track("page_view", {}, mockContext);

      const params = firstEventParams();
      expect(params.email_address).toBe("new@example.com");
      expect(params.phone_number).toBeUndefined();
    });

    it("should not throw in SSR", () => {
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      expect(() => plugin.setUser?.({ email: "test@example.com" })).not.toThrow();
    });
  });

  describe("resetUser", () => {
    it("should stop attaching user data after resetUser", () => {
      window.twq = vi.fn();
      const plugin = createXPixelPlugin();
      plugin.initialize({ pixelId: "o12345" });

      plugin.setUser?.({ email: "test@example.com", phone_number: "+821012345678" });
      plugin.resetUser?.();
      plugin.track("page_view", {}, mockContext);

      const params = firstEventParams();
      expect(params.email_address).toBeUndefined();
      expect(params.phone_number).toBeUndefined();
    });

    it("should not throw in SSR", () => {
      const plugin = createXPixelPlugin();

      expect(() => plugin.resetUser?.()).not.toThrow();
    });
  });
});
