/**
 * Opt-in consent gate for platforms WITHOUT a native consent API.
 *
 * Plugins for platforms that do have one (gtag family, Meta Pixel) forward
 * the consent state natively instead of gating. For the rest, dispatch is
 * blocked only when the plugin is configured with `consentRequired: true`
 * AND the relevant Consent Mode signal has not been granted — the default
 * remains platform delegation (no gating).
 *
 * Internal — not part of the public client API.
 *
 * @internal
 */

import type { ConsentState } from "@sunwjy/funnel-core";

/** Consent Mode signal a plugin keys off: ad platforms vs analytics tools. */
export type ConsentSignal = "ad_storage" | "analytics_storage";

export interface ConsentGate {
  /** Merges a (partial) consent state update. */
  update(state: ConsentState): void;
  /** `true` when dispatch must be blocked (required but not granted). */
  blocked(): boolean;
}

export function createConsentGate(signal: ConsentSignal, isRequired: () => boolean): ConsentGate {
  let state: ConsentState = {};
  return {
    update(partial: ConsentState): void {
      state = { ...state, ...partial };
    },
    blocked(): boolean {
      // Opt-in semantics: when required, anything short of an explicit
      // "granted" (including "no signal yet") blocks dispatch.
      return isRequired() && state[signal] !== "granted";
    },
  };
}
