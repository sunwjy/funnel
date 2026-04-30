import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGTMPlugin } from "./index";

describe("createGTMPlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.dataLayer;
  });

  it("should have name 'gtm'", () => {
    const plugin = createGTMPlugin();
    expect(plugin.name).toBe("gtm");
  });

  describe("initialize", () => {
    it("should push gtm.js event when containerId is provided", () => {
      const plugin = createGTMPlugin();

      plugin.initialize({ containerId: "GTM-TEST" });

      expect(window.dataLayer).toBeDefined();
      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "gtm.js",
            "gtm.start": expect.any(Number),
          }),
        ]),
      );
    });

    it("should be idempotent — calling initialize twice does not push gtm.start twice", () => {
      const plugin = createGTMPlugin();

      plugin.initialize({ containerId: "GTM-TEST" });
      plugin.initialize({ containerId: "GTM-TEST" });

      const starts = window.dataLayer.filter((e) => "gtm.start" in e);
      expect(starts).toHaveLength(1);
    });

    it("should initialize dataLayer without pushing gtm.js when no containerId", () => {
      const plugin = createGTMPlugin();

      plugin.initialize({});

      expect(window.dataLayer).toEqual([]);
    });

    it("should preserve existing dataLayer entries", () => {
      window.dataLayer = [{ existing: true }];
      const plugin = createGTMPlugin();

      plugin.initialize({ containerId: "GTM-TEST" });

      expect(window.dataLayer[0]).toEqual({ existing: true });
    });
  });

  describe("track — non-ecommerce events", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should push event name, event_id, and params flat for page_view", () => {
      const plugin = createGTMPlugin();
      plugin.initialize({});

      plugin.track("page_view", { page_title: "Home" }, mockContext);

      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "page_view",
            event_id: "test-event-id",
            page_title: "Home",
          }),
        ]),
      );
    });

    it("should create dataLayer if not present when tracking", () => {
      const plugin = createGTMPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.dataLayer).toEqual(
        expect.arrayContaining([expect.objectContaining({ event: "page_view" })]),
      );
    });
  });

  describe("track — ecommerce events", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should clear ecommerce object before pushing purchase", () => {
      const plugin = createGTMPlugin();
      plugin.initialize({});

      plugin.track(
        "purchase",
        { currency: "KRW", value: 29000, transaction_id: "T-1" },
        mockContext,
      );

      // Find the index of the ecommerce: null clear and the purchase event
      const clearIdx = window.dataLayer.findIndex((e) => "ecommerce" in e && e.ecommerce === null);
      const purchaseIdx = window.dataLayer.findIndex((e) => e.event === "purchase");

      expect(clearIdx).toBeGreaterThanOrEqual(0);
      expect(purchaseIdx).toBeGreaterThan(clearIdx);
    });

    it("should nest currency/value/items under ecommerce for purchase", () => {
      const plugin = createGTMPlugin();
      plugin.initialize({});

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          transaction_id: "T-42",
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
        },
        mockContext,
      );

      const purchase = window.dataLayer.find((e) => e.event === "purchase");
      expect(purchase).toEqual(
        expect.objectContaining({
          event: "purchase",
          event_id: "test-event-id",
          ecommerce: expect.objectContaining({
            currency: "KRW",
            value: 29000,
            transaction_id: "T-42",
            items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
          }),
        }),
      );
    });
  });

  describe("setUser", () => {
    it("should push canonical funnel.set_user event with user_id and user_properties", () => {
      const plugin = createGTMPlugin();
      plugin.setUser?.({ user_id: "abc123", email: "user@example.com" });

      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "funnel.set_user",
            user_id: "abc123",
            user_properties: { email: "user@example.com" },
          }),
        ]),
      );
    });

    it("should not throw in SSR", () => {
      const plugin = createGTMPlugin();

      expect(() => plugin.setUser?.({ user_id: "abc123" })).not.toThrow();
    });
  });

  describe("resetUser", () => {
    it("should push funnel.reset_user with user_id null and user_properties null", () => {
      const plugin = createGTMPlugin();

      plugin.resetUser?.();

      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "funnel.reset_user",
            user_id: null,
            user_properties: null,
          }),
        ]),
      );
    });
  });
});
