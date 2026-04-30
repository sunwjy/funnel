import { beforeEach, describe, expect, it, vi } from "vitest";
import { Funnel } from "./funnel";
import type { FunnelPlugin } from "./plugin";

function createMockPlugin(name = "mock"): FunnelPlugin {
  return {
    name,
    initialize: vi.fn(),
    track: vi.fn(),
  };
}

describe("Funnel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialize", () => {
    it("should call initialize on each plugin with matching config", () => {
      const plugin1 = createMockPlugin("p1");
      const plugin2 = createMockPlugin("p2");
      const funnel = new Funnel({ plugins: [plugin1, plugin2] });

      funnel.initialize({
        p1: { key: "value1" },
        p2: { key: "value2" },
      });

      expect(plugin1.initialize).toHaveBeenCalledWith({ key: "value1" });
      expect(plugin2.initialize).toHaveBeenCalledWith({ key: "value2" });
    });

    it("should pass empty object when no config is provided for a plugin", () => {
      const plugin = createMockPlugin("p1");
      const funnel = new Funnel({ plugins: [plugin] });

      funnel.initialize();

      expect(plugin.initialize).toHaveBeenCalledWith({});
    });

    it("should log when debug is enabled", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = createMockPlugin("p1");
      const funnel = new Funnel({ plugins: [plugin], debug: true });

      funnel.initialize();

      expect(spy).toHaveBeenCalledWith('[funnel] Plugin "p1" initialized');
    });

    it("should be idempotent at the per-plugin level — initialize twice does not re-init", () => {
      const plugin = createMockPlugin("p1");
      const funnel = new Funnel({ plugins: [plugin] });

      funnel.initialize();
      funnel.initialize();

      expect(plugin.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe("track", () => {
    it("should dispatch event to all plugins with context containing eventId", () => {
      const plugin1 = createMockPlugin("p1");
      const plugin2 = createMockPlugin("p2");
      const funnel = new Funnel({ plugins: [plugin1, plugin2] });
      funnel.initialize();

      const params = { search_term: "shoes" };
      funnel.track("search", params);

      expect(plugin1.track).toHaveBeenCalledWith(
        "search",
        params,
        expect.objectContaining({ eventId: expect.any(String) }),
      );
      expect(plugin2.track).toHaveBeenCalledWith(
        "search",
        params,
        expect.objectContaining({ eventId: expect.any(String) }),
      );
    });

    it("should pass the same eventId to all plugins for a single track call", () => {
      const plugin1 = createMockPlugin("p1");
      const plugin2 = createMockPlugin("p2");
      const funnel = new Funnel({ plugins: [plugin1, plugin2] });
      funnel.initialize();

      funnel.track("page_view", {});

      const context1 = (plugin1.track as ReturnType<typeof vi.fn>).mock.calls[0][2];
      const context2 = (plugin2.track as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(context1.eventId).toBe(context2.eventId);
    });

    it("should generate different eventIds for different track calls", () => {
      const plugin = createMockPlugin("p1");
      const funnel = new Funnel({ plugins: [plugin] });
      funnel.initialize();

      funnel.track("page_view", {});
      funnel.track("page_view", {});

      const id1 = (plugin.track as ReturnType<typeof vi.fn>).mock.calls[0][2].eventId;
      const id2 = (plugin.track as ReturnType<typeof vi.fn>).mock.calls[1][2].eventId;
      expect(id1).not.toBe(id2);
    });

    it("should warn and skip when not initialized", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const plugin = createMockPlugin("p1");
      const funnel = new Funnel({ plugins: [plugin] });

      funnel.track("page_view", {});

      expect(spy).toHaveBeenCalledWith("[funnel] Not initialized. Call initialize() first.");
      expect(plugin.track).not.toHaveBeenCalled();
    });

    it("should isolate plugin errors — one failure does not block others", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const failing = createMockPlugin("failing");
      (failing.track as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("plugin crash");
      });
      const healthy = createMockPlugin("healthy");

      const funnel = new Funnel({ plugins: [failing, healthy] });
      funnel.initialize();

      funnel.track("page_view", {});

      expect(healthy.track).toHaveBeenCalledWith(
        "page_view",
        {},
        expect.objectContaining({ eventId: expect.any(String) }),
      );
    });

    it("should log error when a plugin throws", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("boom");
      const failing = createMockPlugin("bad");
      (failing.track as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw error;
      });

      const funnel = new Funnel({ plugins: [failing] });
      funnel.initialize();
      funnel.track("page_view", {});

      expect(spy).toHaveBeenCalledWith(
        '[funnel] Plugin "bad" failed during track "page_view"',
        error,
      );
    });

    it("should call onError hook instead of console.error when configured", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onError = vi.fn();
      const error = new Error("boom");
      const failing = createMockPlugin("bad");
      (failing.track as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw error;
      });

      const funnel = new Funnel({ plugins: [failing], onError });
      funnel.initialize();
      funnel.track("page_view", {});

      expect(onError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ plugin: "bad", phase: "track", eventName: "page_view" }),
      );
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("should log when debug is enabled", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = createMockPlugin("p1");
      const funnel = new Funnel({ plugins: [plugin], debug: true });
      funnel.initialize();

      const params = { search_term: "test" };
      funnel.track("search", params);

      expect(spy).toHaveBeenCalledWith('[funnel] "p1" tracked "search"', params);
    });
  });

  describe("setUser", () => {
    it("should call setUser on plugins that implement it", () => {
      const plugin = createMockPlugin("p1");
      plugin.setUser = vi.fn();
      const funnel = new Funnel({ plugins: [plugin] });
      funnel.initialize();

      const properties = { user_id: "u-123", email: "test@example.com" };
      funnel.setUser(properties);

      expect(plugin.setUser).toHaveBeenCalledWith(properties);
    });

    it("should skip plugins that do not implement setUser", () => {
      const withSetUser = createMockPlugin("with");
      withSetUser.setUser = vi.fn();
      const withoutSetUser = createMockPlugin("without");
      const funnel = new Funnel({ plugins: [withSetUser, withoutSetUser] });
      funnel.initialize();

      funnel.setUser({ user_id: "u-1" });

      expect(withSetUser.setUser).toHaveBeenCalled();
      // withoutSetUser has no setUser — should not throw
    });

    it("should isolate errors — one plugin failure does not block others", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const failing = createMockPlugin("failing");
      failing.setUser = vi.fn(() => {
        throw new Error("crash");
      });
      const healthy = createMockPlugin("healthy");
      healthy.setUser = vi.fn();
      const funnel = new Funnel({ plugins: [failing, healthy] });
      funnel.initialize();

      funnel.setUser({ user_id: "u-1" });

      expect(healthy.setUser).toHaveBeenCalledWith({ user_id: "u-1" });
    });

    it("should log error when a plugin throws in setUser", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("boom");
      const failing = createMockPlugin("bad");
      failing.setUser = vi.fn(() => {
        throw error;
      });
      const funnel = new Funnel({ plugins: [failing] });
      funnel.initialize();

      funnel.setUser({ user_id: "u-1" });

      expect(spy).toHaveBeenCalledWith('[funnel] Plugin "bad" failed during setUser', error);
    });

    it("should store properties and replay after initialize", () => {
      const plugin = createMockPlugin("p1");
      plugin.setUser = vi.fn();
      const funnel = new Funnel({ plugins: [plugin] });

      const properties = { user_id: "u-1", email: "a@b.com" };
      funnel.setUser(properties);

      expect(plugin.setUser).not.toHaveBeenCalled();

      funnel.initialize();

      expect(plugin.setUser).toHaveBeenCalledWith(properties);
    });

    it("should log when debug is enabled", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = createMockPlugin("p1");
      plugin.setUser = vi.fn();
      const funnel = new Funnel({ plugins: [plugin], debug: true });
      funnel.initialize();

      const properties = { user_id: "u-1" };
      funnel.setUser(properties);

      expect(spy).toHaveBeenCalledWith('[funnel] "p1" setUser', properties);
    });
  });

  describe("resetUser", () => {
    it("should call resetUser on plugins that implement it", () => {
      const plugin = createMockPlugin("p1");
      plugin.resetUser = vi.fn();
      const funnel = new Funnel({ plugins: [plugin] });
      funnel.initialize();

      funnel.resetUser();

      expect(plugin.resetUser).toHaveBeenCalled();
    });

    it("should skip plugins without resetUser", () => {
      const withReset = createMockPlugin("with");
      withReset.resetUser = vi.fn();
      const withoutReset = createMockPlugin("without");
      const funnel = new Funnel({ plugins: [withReset, withoutReset] });
      funnel.initialize();

      funnel.resetUser();

      expect(withReset.resetUser).toHaveBeenCalled();
    });

    it("should isolate errors", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const failing = createMockPlugin("failing");
      failing.resetUser = vi.fn(() => {
        throw new Error("crash");
      });
      const healthy = createMockPlugin("healthy");
      healthy.resetUser = vi.fn();
      const funnel = new Funnel({ plugins: [failing, healthy] });
      funnel.initialize();

      funnel.resetUser();

      expect(healthy.resetUser).toHaveBeenCalled();
    });

    it("should clear stored user so replay does not occur after resetUser + initialize", () => {
      const plugin = createMockPlugin("p1");
      plugin.setUser = vi.fn();
      const funnel = new Funnel({ plugins: [plugin] });

      funnel.setUser({ user_id: "u-1" });
      funnel.resetUser();
      funnel.initialize();

      expect(plugin.setUser).not.toHaveBeenCalled();
    });
  });
});
