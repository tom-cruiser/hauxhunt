"use client";

import { useSyncExternalStore } from "react";

/**
 * True once the component has hydrated on the client, false during SSR and
 * the first client render. Useful for deferring a `document`-only read
 * (e.g. `document.getElementById`) until it's safe, without the
 * `useState` + `useEffect(() => setState(true), [])` pattern — driving that
 * off `useSyncExternalStore` instead means there's no setState call inside
 * an effect body for `react-hooks/set-state-in-effect` to flag.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
