import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSGTMPlugin } from "./index";

const TEST_ENDPOINT = "https://sgtm.example.com";
const TEST_MEASUREMENT_ID = "G-TEST123";
const TEST_API_SECRET = "secret-xyz";
const TEST_EVENT_ID = "evt-abc-123";
const TEST_CONTEXT = { eventId: TEST_EVENT_ID };

function parseBeaconBody(mock: ReturnType<typeof vi.fn>): Promise<Record<string, unknown>> {
  const [, blob] = mock.mock.calls[0];
  return (blob as Blob).text().then((t) => JSON.parse(t));
}

function beaconUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0] as string;
}

describe("createSGTMPlugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigator.sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should have name 'sgtm'", () => {
    const plugin = createSGTMPlugin();
    expect(plugin.name).toBe("sgtm");
  });

  describe("initialize", () => {
    it("should persist a generated client_id on first initialize", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });

      expect(localStorage.getItem("_funnel_sgtm_cid")).toBeTruthy();
    });

    it("should reuse a persisted client_id across instances", async () => {
      localStorage.setItem("_funnel_sgtm_cid", "persisted-cid");

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.client_id).toBe("persisted-cid");
    });

    it("should honor the clientId override without touching localStorage", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        clientId: "override-cid",
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.client_id).toBe("override-cid");
      expect(localStorage.getItem("_funnel_sgtm_cid")).toBeNull();
    });
  });

  describe("track — URL construction", () => {
    it("should POST to {endpoint}/mp/collect with measurement_id", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toBe(`${TEST_ENDPOINT}/mp/collect?measurement_id=${TEST_MEASUREMENT_ID}`);
    });

    it("should include api_secret when provided", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        apiSecret: TEST_API_SECRET,
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toContain(`api_secret=${TEST_API_SECRET}`);
      expect(url).toContain(`measurement_id=${TEST_MEASUREMENT_ID}`);
    });

    it("should honor a custom path", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        path: "/custom/collect",
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toBe(`${TEST_ENDPOINT}/custom/collect?measurement_id=${TEST_MEASUREMENT_ID}`);
    });

    it("should normalize trailing slashes and missing leading slash in path", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: `${TEST_ENDPOINT}/`,
        measurementId: TEST_MEASUREMENT_ID,
        path: "custom/collect",
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toBe(`${TEST_ENDPOINT}/custom/collect?measurement_id=${TEST_MEASUREMENT_ID}`);
    });

    it("should not send when endpoint is missing", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should not send when measurementId is missing", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("track — payload shape", () => {
    it("should wrap the event in a GA4 MP v2 events array", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("purchase", { currency: "KRW", value: 29000 }, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(Array.isArray(payload.events)).toBe(true);
      const events = payload.events as Array<Record<string, unknown>>;
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("purchase");
      expect(events[0].params).toMatchObject({ currency: "KRW", value: 29000 });
    });

    it("should include event_id from context in event params for dedup", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const event = (payload.events as Array<Record<string, unknown>>)[0];
      expect((event.params as Record<string, unknown>).event_id).toBe(TEST_EVENT_ID);
    });

    it("should include session_id and engagement_time_msec in event params", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const event = (payload.events as Array<Record<string, unknown>>)[0];
      const params = event.params as Record<string, unknown>;
      expect(params.session_id).toBeTruthy();
      expect(params.engagement_time_msec).toBe(100);
    });

    it("should reuse the same session_id across calls in the same session", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);
      plugin.track("page_view", {}, { eventId: "evt-2" });

      const beacon = navigator.sendBeacon as ReturnType<typeof vi.fn>;
      const first = JSON.parse(await (beacon.mock.calls[0][1] as Blob).text());
      const second = JSON.parse(await (beacon.mock.calls[1][1] as Blob).text());
      expect(first.events[0].params.session_id).toBe(second.events[0].params.session_id);
    });

    it("should send timestamp_micros as unix micros", async () => {
      const now = 1712600000_000;
      vi.spyOn(Date, "now").mockReturnValue(now);

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.timestamp_micros).toBe(now * 1000);
    });

    it("should include non_personalized_ads when configured", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        nonPersonalizedAds: true,
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.non_personalized_ads).toBe(true);
    });

    it("should omit non_personalized_ads when unset", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.non_personalized_ads).toBeUndefined();
    });

    it("should pass through complex GA4 params including items", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track(
        "purchase",
        {
          currency: "USD",
          value: 99.99,
          transaction_id: "T-1",
          items: [{ item_id: "SKU1", item_name: "Shirt", quantity: 2, price: 49.99 }],
        },
        TEST_CONTEXT,
      );

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const params = (payload.events as Array<Record<string, unknown>>)[0].params as Record<
        string,
        unknown
      >;
      expect(params).toMatchObject({
        currency: "USD",
        value: 99.99,
        transaction_id: "T-1",
        items: [{ item_id: "SKU1", item_name: "Shirt", quantity: 2, price: 49.99 }],
      });
    });
  });

  describe("setUser / resetUser", () => {
    it("should include user_id at the top level when set", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.setUser?.({ user_id: "u-42" });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.user_id).toBe("u-42");
    });

    it("should include non-id user fields under user_properties as { value }", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.setUser?.({
        user_id: "u-42",
        email: "jane@example.com",
        first_name: "Jane",
        plan: "pro",
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.user_properties).toEqual({
        email: { value: "jane@example.com" },
        first_name: { value: "Jane" },
        plan: { value: "pro" },
      });
    });

    it("should omit user_properties when only user_id is set", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.setUser?.({ user_id: "u-42" });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.user_properties).toBeUndefined();
    });

    it("should clear user state after resetUser", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.setUser?.({ user_id: "u-42", email: "jane@example.com" });
      plugin.resetUser?.();
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.user_id).toBeUndefined();
      expect(payload.user_properties).toBeUndefined();
    });
  });

  describe("transport — sendBeacon with fetch fallback", () => {
    it("should prefer sendBeacon", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should fall back to fetch when sendBeacon returns false", () => {
      navigator.sendBeacon = vi.fn().mockReturnValue(false);

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/mp/collect"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }),
      );
    });

    it("should use fetch when sendBeacon is unavailable", () => {
      // @ts-expect-error — simulate missing sendBeacon
      delete navigator.sendBeacon;

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/mp/collect"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should not throw when fetch rejects", () => {
      navigator.sendBeacon = vi.fn().mockReturnValue(false);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });

      expect(() => plugin.track("page_view", {}, TEST_CONTEXT)).not.toThrow();
    });
  });

  describe("SSR safety", () => {
    it("should not throw when window is undefined", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — simulate SSR
      delete globalThis.window;

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });

      expect(() => plugin.track("page_view", {}, TEST_CONTEXT)).not.toThrow();

      globalThis.window = originalWindow;
    });
  });
});
