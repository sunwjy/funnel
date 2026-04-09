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

  describe("track", () => {
    const mockContext = { eventId: "test-event-id" };

    it("should push event name and params to dataLayer", () => {
      const plugin = createGTMPlugin();
      plugin.initialize({});

      plugin.track("purchase", { currency: "KRW", value: 29000 }, mockContext);

      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "purchase",
            currency: "KRW",
            value: 29000,
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
});
