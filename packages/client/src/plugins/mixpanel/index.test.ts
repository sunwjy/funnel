import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMixpanelPlugin } from "./index";

describe("createMixpanelPlugin", () => {
  const mockContext = { eventId: "test-event-id" };

  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error — reset global
    delete window.mixpanel;
  });

  it("should have name 'mixpanel'", () => {
    const plugin = createMixpanelPlugin();
    expect(plugin.name).toBe("mixpanel");
  });

  describe("initialize", () => {
    it("should call mixpanel.init with token", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.initialize({ token: "test-token-123" });

      expect(window.mixpanel.init).toHaveBeenCalledWith("test-token-123");
    });

    it("should not call init when token is absent", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.initialize({});

      expect(window.mixpanel.init).not.toHaveBeenCalled();
    });

    it("should not throw when mixpanel is not defined (SSR)", () => {
      const plugin = createMixpanelPlugin();

      expect(() => plugin.initialize({ token: "test-token" })).not.toThrow();
    });
  });

  describe("track — event name conversion", () => {
    it("should send page_view as 'Page View'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("page_view", {}, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith("Page View", {});
    });

    it("should send purchase as 'Purchase' with flattened items", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track(
        "purchase",
        {
          currency: "KRW",
          value: 29000,
          items: [
            { item_id: "SKU1", item_name: "Shoes", quantity: 2 },
            { item_id: "SKU2", item_name: "Socks", quantity: 1 },
          ],
        },
        mockContext,
      );

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "Purchase",
        expect.objectContaining({
          currency: "KRW",
          value: 29000,
          item_ids: ["SKU1", "SKU2"],
          item_names: ["Shoes", "Socks"],
          num_items: 2,
        }),
      );
    });

    it("should send add_to_cart as 'Add To Cart'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("add_to_cart", { currency: "USD", value: 50 }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "Add To Cart",
        expect.objectContaining({ currency: "USD", value: 50 }),
      );
    });

    it("should send search as 'Search' with search_term passed through", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("search", { search_term: "shoes" }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith("Search", { search_term: "shoes" });
    });

    it("should send begin_checkout as 'Begin Checkout'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("begin_checkout", { currency: "USD", value: 100 }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "Begin Checkout",
        expect.objectContaining({ currency: "USD", value: 100 }),
      );
    });

    it("should send sign_up as 'Sign Up'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("sign_up", { method: "google" }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith("Sign Up", { method: "google" });
    });

    it("should send generate_lead as 'Generate Lead'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("generate_lead", { value: 100, currency: "USD" }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "Generate Lead",
        expect.objectContaining({ value: 100, currency: "USD" }),
      );
    });

    it("should send view_item as 'View Item'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("view_item", { items: [{ item_id: "A", item_name: "Hat" }] }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "View Item",
        expect.objectContaining({ item_ids: ["A"], item_names: ["Hat"], num_items: 1 }),
      );
    });
  });

  describe("toTitleCase conversions", () => {
    it("should convert page_view to 'Page View'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();
      plugin.track("page_view", {}, mockContext);
      expect(window.mixpanel.track).toHaveBeenCalledWith("Page View", expect.anything());
    });

    it("should convert add_to_cart to 'Add To Cart'", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();
      plugin.track("add_to_cart", {}, mockContext);
      expect(window.mixpanel.track).toHaveBeenCalledWith("Add To Cart", expect.anything());
    });
  });

  describe("track — item flattening", () => {
    it("should flatten items to item_ids, item_names, and num_items", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

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

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "View Item",
        expect.objectContaining({
          item_ids: ["A", "B"],
          item_names: ["Item A", "Item B"],
          num_items: 2,
        }),
      );
    });

    it("should not include item fields when items array is empty", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("view_item", { items: [] }, mockContext);

      const params = (window.mixpanel.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.item_ids).toBeUndefined();
      expect(params.item_names).toBeUndefined();
      expect(params.num_items).toBeUndefined();
    });

    it("should not include items key in output when items are present", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track(
        "add_to_cart",
        {
          currency: "USD",
          value: 20,
          items: [{ item_id: "X", item_name: "Widget" }],
        },
        mockContext,
      );

      const params = (window.mixpanel.track as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params.items).toBeUndefined();
    });
  });

  describe("track — non-item properties pass through", () => {
    it("should pass through currency and value", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.track("purchase", { currency: "EUR", value: 99.99 }, mockContext);

      expect(window.mixpanel.track).toHaveBeenCalledWith(
        "Purchase",
        expect.objectContaining({ currency: "EUR", value: 99.99 }),
      );
    });
  });

  describe("track — SSR safety", () => {
    it("should not throw when mixpanel is not available", () => {
      const plugin = createMixpanelPlugin();

      expect(() =>
        plugin.track("purchase", { currency: "KRW", value: 1000 }, mockContext),
      ).not.toThrow();
    });
  });

  describe("setUser", () => {
    it("should call mixpanel.identify with user_id", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.setUser?.({ user_id: "user-123" });

      expect(window.mixpanel.identify).toHaveBeenCalledWith("user-123");
    });

    it("should call mixpanel.people.set with mapped properties ($email, $phone, etc.)", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.setUser?.({
        user_id: "user-123",
        email: "test@example.com",
        phone_number: "+821012345678",
        first_name: "Jane",
        last_name: "Doe",
      });

      expect(window.mixpanel.people.set).toHaveBeenCalledWith({
        $email: "test@example.com",
        $phone: "+821012345678",
        $first_name: "Jane",
        $last_name: "Doe",
      });
    });

    it("should pass custom properties to people.set", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.setUser?.({ plan: "pro", trial: false });

      expect(window.mixpanel.people.set).toHaveBeenCalledWith({
        plan: "pro",
        trial: false,
      });
    });

    it("should not throw in SSR", () => {
      const plugin = createMixpanelPlugin();

      expect(() => plugin.setUser?.({ user_id: "user-123" })).not.toThrow();
    });
  });

  describe("resetUser", () => {
    it("should call mixpanel.reset()", () => {
      window.mixpanel = {
        init: vi.fn(),
        track: vi.fn(),
        identify: vi.fn(),
        people: { set: vi.fn() },
        reset: vi.fn(),
      };
      const plugin = createMixpanelPlugin();

      plugin.resetUser?.();

      expect(window.mixpanel.reset).toHaveBeenCalled();
    });
  });
});
