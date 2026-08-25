"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscription tier. This is the closest thing this prototype has to a
 * "billing" concept — there is no payment provider or database anywhere in
 * the app, so tier is a `sessionStorage` flag exactly like
 * `hauxhunt-authenticated-role` (see `authentication-form.tsx`), not a real
 * subscription record. It resets to "free" on every fresh login/register and
 * on logout, and is otherwise flipped by the demo "Plan" toggle on each
 * role's account/settings page (see `PlanToggleCard`).
 */
export type Tier = "free" | "paid";

const TIER_KEY = "hauxhunt-tier";
const TIER_EVENT = "hauxhunt-tier-change";

function readTier(): Tier {
  return window.sessionStorage.getItem(TIER_KEY) === "paid" ? "paid" : "free";
}

// Same shape as the currency/language/partner-role preference hooks: a
// `CustomEvent` for same-tab reactivity (native `storage` events never fire
// in the tab that made the change) plus `storage` for completeness.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(TIER_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TIER_EVENT, callback);
  };
}

/** The active tier. Server-rendered/pre-hydration reads always resolve to
 * "free" — the correct default fallback — then hydrate to the stored value. */
export function useTier(): Tier {
  return useSyncExternalStore(subscribe, readTier, () => "free");
}

export function setTier(tier: Tier) {
  window.sessionStorage.setItem(TIER_KEY, tier);
  window.dispatchEvent(new Event(TIER_EVENT));
}

/** Clears the tier flag. Call alongside every
 * `sessionStorage.removeItem("hauxhunt-authenticated-role")` logout site so
 * a "paid" demo flag never survives into the next login on the same tab. */
export function clearTier() {
  window.sessionStorage.removeItem(TIER_KEY);
  window.dispatchEvent(new Event(TIER_EVENT));
}

export function isPaidTier(tier: Tier): boolean {
  return tier === "paid";
}
