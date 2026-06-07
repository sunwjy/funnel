import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNaverAdPlugin } from "./index";

/**
 * Naver's new conversion script (wcs.trans version) API surface:
 *
 * ```js
 * // common script (every page)
 * wcs_add["wa"] = "AccountId";
 * wcs.inflow("site-domain");
 * wcs_do(); // PV
 *
 * // conversion script
 * var _conv = { type: "purchase", id: "T-1", value: "29000", items: [...] };
 * wcs.trans(_conv);
 * ```
 *
 * @see https://naver.github.io/conversion-tracking/pages/01_script_guide_wcstrans/
 */
describe("createNaverAdPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  function mockWcs() {
    window.wcs = { inflow: vi.fn(), trans: vi.fn() };
    window.wcs_do = vi.fn();
  }

  function transMock() {
    return window.wcs.trans as ReturnType<typeof vi.fn>;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset globals
    delete window.wcs;
    // @ts-expect-error — reset globals
    delete window.wcs_do;
    // @ts-expect-error — reset globals
    delete window.wcs_add;
  });

  it("should have name 'naver-ad'", () => {
    const plugin = createNaverAdPlugin();
    expect(plugin.name).toBe("naver-ad");
  });

  describe("initialize", () => {
    it("should register accountId on wcs_add['wa']", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.initialize({ accountId: "s_abc123" });

      expect(window.wcs_add).toEqual({ wa: "s_abc123" });
    });

    it("should preserve existing wcs_add entries", () => {
      mockWcs();
      window.wcs_add = { other: "value" };
      const plugin = createNaverAdPlugin();

      plugin.initialize({ accountId: "s_abc123" });

      expect(window.wcs_add).toEqual({ other: "value", wa: "s_abc123" });
    });

    it("should call wcs.inflow with siteDomain when provided", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.initialize({ accountId: "s_abc123", siteDomain: "example.com" });

      expect(window.wcs.inflow).toHaveBeenCalledWith("example.com");
    });

    it("should not call wcs.inflow when siteDomain is absent", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.initialize({ accountId: "s_abc123" });

      expect(window.wcs.inflow).not.toHaveBeenCalled();
    });

    it("should not throw when wcs is not defined (SSR)", () => {
      const plugin = createNaverAdPlugin();

      expect(() => plugin.initialize({ accountId: "s_abc123" })).not.toThrow();
    });
  });

  describe("track — page_view (PV)", () => {
    it("should call wcs_do for page_view without firing a conversion", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.wcs_do).toHaveBeenCalledTimes(1);
      expect(transMock()).not.toHaveBeenCalled();
    });
  });

  describe("track — conversion mapping via wcs.trans", () => {
    it("should send purchase with type, id, value, and items", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track(
        "purchase",
        {
          transaction_id: "T-1",
          currency: "KRW",
          value: 29000,
          items: [{ item_id: "SKU1", item_name: "Shoes", quantity: 2, price: 14500 }],
        },
        mockContext,
      );

      expect(transMock()).toHaveBeenCalledWith({
        type: "purchase",
        id: "T-1",
        value: "29000",
        items: [{ id: "SKU1", name: "Shoes", quantity: 2, payAmount: 29000 }],
      });
    });

    it("should map item_category to category and item_variant to option", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track(
        "purchase",
        {
          transaction_id: "T-2",
          value: 90000,
          items: [
            {
              item_id: "7786",
              item_name: "설화수 탄력크림",
              item_category: "화장품/스킨케어/크림",
              item_variant: "용량:120",
              quantity: 3,
              price: 30000,
            },
          ],
        },
        mockContext,
      );

      expect(transMock()).toHaveBeenCalledWith({
        type: "purchase",
        id: "T-2",
        value: "90000",
        items: [
          {
            id: "7786",
            name: "설화수 탄력크림",
            category: "화장품/스킨케어/크림",
            option: "용량:120",
            quantity: 3,
            payAmount: 90000,
          },
        ],
      });
    });

    it("should fall back to summed item payAmount when purchase value is absent", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track(
        "purchase",
        {
          transaction_id: "T-3",
          items: [
            { item_id: "A", item_name: "Item A", quantity: 2, price: 1000 },
            { item_id: "B", item_name: "Item B", quantity: 1, price: 500 },
          ],
        },
        mockContext,
      );

      const conv = transMock().mock.calls[0][0];
      expect(conv.value).toBe("2500");
    });

    it("should send sign_up with type only", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track("sign_up", { method: "email" }, mockContext);

      expect(transMock()).toHaveBeenCalledWith({ type: "sign_up" });
    });

    it("should send generate_lead as type 'lead' with value when present", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track("generate_lead", { currency: "KRW", value: 5000 }, mockContext);

      expect(transMock()).toHaveBeenCalledWith({ type: "lead", value: "5000" });
    });

    it("should send add_to_cart with items", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track(
        "add_to_cart",
        { items: [{ item_id: "SKU1", item_name: "Shoes" }] },
        mockContext,
      );

      expect(transMock()).toHaveBeenCalledWith({
        type: "add_to_cart",
        items: [{ id: "SKU1", name: "Shoes" }],
      });
    });

    it("should send add_to_wishlist with items", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track(
        "add_to_wishlist",
        { items: [{ item_id: "SKU1", item_name: "Shoes" }] },
        mockContext,
      );

      expect(transMock()).toHaveBeenCalledWith({
        type: "add_to_wishlist",
        items: [{ id: "SKU1", name: "Shoes" }],
      });
    });

    it("should send begin_checkout with value and items", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track(
        "begin_checkout",
        { value: 100, items: [{ item_id: "SKU1", item_name: "Shoes" }] },
        mockContext,
      );

      expect(transMock()).toHaveBeenCalledWith({
        type: "begin_checkout",
        value: "100",
        items: [{ id: "SKU1", name: "Shoes" }],
      });
    });

    it("should send view_item as type 'view_content'", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track("view_item", { items: [{ item_id: "SKU1", item_name: "Shoes" }] }, mockContext);

      expect(transMock()).toHaveBeenCalledWith({
        type: "view_content",
        items: [{ id: "SKU1", name: "Shoes" }],
      });
    });

    it("should omit items key when conversion has no items", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track("begin_checkout", { value: 100 }, mockContext);

      expect(transMock()).toHaveBeenCalledWith({ type: "begin_checkout", value: "100" });
    });
  });

  describe("track — unmapped events", () => {
    it("should drop unmapped events without calling trans or wcs_do", () => {
      mockWcs();
      const plugin = createNaverAdPlugin();

      plugin.track("search", { search_term: "shoes" }, mockContext);
      plugin.track("login", {}, mockContext);
      plugin.track("refund", { transaction_id: "T-1" }, mockContext);

      expect(transMock()).not.toHaveBeenCalled();
      expect(window.wcs_do).not.toHaveBeenCalled();
    });
  });

  describe("track — SSR / missing globals safety", () => {
    it("should not throw when wcs is not available", () => {
      const plugin = createNaverAdPlugin();

      expect(() =>
        plugin.track("purchase", { transaction_id: "T-1", value: 1000 }, mockContext),
      ).not.toThrow();
    });

    it("should not throw when wcs exists but trans is missing (old script loaded)", () => {
      // @ts-expect-error — simulate legacy wcslog.js without trans support
      window.wcs = { inflow: vi.fn() };
      window.wcs_do = vi.fn();
      const plugin = createNaverAdPlugin();

      expect(() =>
        plugin.track("purchase", { transaction_id: "T-1", value: 1000 }, mockContext),
      ).not.toThrow();
    });
  });
});
