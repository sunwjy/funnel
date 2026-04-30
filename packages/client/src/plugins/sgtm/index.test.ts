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

    it("should reject apiSecret unless allowApiSecretInBrowser is true (and warn)", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        apiSecret: TEST_API_SECRET,
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).not.toContain("api_secret");
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should include apiSecret when allowApiSecretInBrowser is true", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        apiSecret: TEST_API_SECRET,
        allowApiSecretInBrowser: true,
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toContain(`api_secret=${TEST_API_SECRET}`);
    });

    it("should normalize trailing slashes on the endpoint", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: `${TEST_ENDPOINT}////`,
        measurementId: TEST_MEASUREMENT_ID,
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toBe(`${TEST_ENDPOINT}/mp/collect?measurement_id=${TEST_MEASUREMENT_ID}`);
    });

    it("should honor a custom path", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        path: "/g/collect",
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const url = beaconUrl(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(url).toBe(`${TEST_ENDPOINT}/g/collect?measurement_id=${TEST_MEASUREMENT_ID}`);
    });
  });

  describe("track — payload structure", () => {
    it("should default engagement_time_msec to 1 (not 100)", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const events = payload.events as Array<Record<string, unknown>>;
      const params = events[0].params as Record<string, unknown>;
      expect(params.engagement_time_msec).toBe(1);
    });

    it("should honor configured engagementTimeMsec", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({
        endpoint: TEST_ENDPOINT,
        measurementId: TEST_MEASUREMENT_ID,
        engagementTimeMsec: 5000,
      });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const events = payload.events as Array<Record<string, unknown>>;
      const params = events[0].params as Record<string, unknown>;
      expect(params.engagement_time_msec).toBe(5000);
    });

    it("should include event_id and session_id in event params", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const events = payload.events as Array<Record<string, unknown>>;
      const params = events[0].params as Record<string, unknown>;
      expect(params.event_id).toBe(TEST_EVENT_ID);
      expect(params.session_id).toBeTruthy();
    });

    it("should map purchase event with currency, value, transaction_id", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track(
        "purchase",
        { currency: "KRW", value: 29000, transaction_id: "T-1" },
        TEST_CONTEXT,
      );

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      const events = payload.events as Array<Record<string, unknown>>;
      expect(events[0].name).toBe("purchase");
      expect(events[0].params).toMatchObject({
        currency: "KRW",
        value: 29000,
        transaction_id: "T-1",
      });
    });
  });

  describe("track — session expiry", () => {
    it("should reuse an active session within the 30-min idle window", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);
      const payload1 = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);

      // Reset send mock so we can read the next call cleanly
      (navigator.sendBeacon as ReturnType<typeof vi.fn>).mockClear();

      plugin.track("page_view", {}, TEST_CONTEXT);
      const payload2 = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);

      const sid1 = (payload1.events as Array<Record<string, unknown>>)[0].params as Record<
        string,
        unknown
      >;
      const sid2 = (payload2.events as Array<Record<string, unknown>>)[0].params as Record<
        string,
        unknown
      >;
      expect(sid1.session_id).toBe(sid2.session_id);
    });

    it("should start a new session after 30 min of idle", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });

      // First track at t=0
      const t0 = 1_000_000_000;
      vi.spyOn(Date, "now").mockReturnValue(t0);
      plugin.track("page_view", {}, TEST_CONTEXT);
      const payload1 = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);

      (navigator.sendBeacon as ReturnType<typeof vi.fn>).mockClear();

      // Second track 31 min later
      vi.spyOn(Date, "now").mockReturnValue(t0 + 31 * 60 * 1000);
      plugin.track("page_view", {}, TEST_CONTEXT);
      const payload2 = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);

      const params1 = (payload1.events as Array<Record<string, unknown>>)[0].params as Record<
        string,
        unknown
      >;
      const params2 = (payload2.events as Array<Record<string, unknown>>)[0].params as Record<
        string,
        unknown
      >;
      expect(params1.session_id).not.toBe(params2.session_id);
    });
  });

  describe("track — non_personalized_ads + user properties", () => {
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

    it("should include user_id and user_properties from setUser", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.setUser?.({ user_id: "u-1", plan: "pro" });
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.user_id).toBe("u-1");
      expect(payload.user_properties).toEqual({ plan: { value: "pro" } });
    });

    it("should clear user properties after resetUser", async () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.setUser?.({ user_id: "u-1", plan: "pro" });
      plugin.resetUser?.();
      plugin.track("page_view", {}, TEST_CONTEXT);

      const payload = await parseBeaconBody(navigator.sendBeacon as ReturnType<typeof vi.fn>);
      expect(payload.user_id).toBeUndefined();
      expect(payload.user_properties).toBeUndefined();
    });
  });

  describe("transport fallback", () => {
    it("should fall back to fetch when sendBeacon returns false", () => {
      navigator.sendBeacon = vi.fn().mockReturnValue(false);

      const plugin = createSGTMPlugin();
      plugin.initialize({ endpoint: TEST_ENDPOINT, measurementId: TEST_MEASUREMENT_ID });
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(fetch).toHaveBeenCalled();
    });

    it("should not send when endpoint or measurementId is missing", () => {
      const plugin = createSGTMPlugin();
      plugin.initialize({});
      plugin.track("page_view", {}, TEST_CONTEXT);

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });
  });
});
