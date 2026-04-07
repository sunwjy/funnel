import { describe, expect, it, vi, beforeEach } from "vitest";
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
  });

  describe("track", () => {
    it("should dispatch event to all plugins", () => {
      const plugin1 = createMockPlugin("p1");
      const plugin2 = createMockPlugin("p2");
      const funnel = new Funnel({ plugins: [plugin1, plugin2] });
      funnel.initialize();

      const params = { search_term: "shoes" };
      funnel.track("search", params);

      expect(plugin1.track).toHaveBeenCalledWith("search", params);
      expect(plugin2.track).toHaveBeenCalledWith("search", params);
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

      expect(healthy.track).toHaveBeenCalledWith("page_view", {});
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
        '[funnel] Plugin "bad" failed to track "page_view"',
        error,
      );
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
});
