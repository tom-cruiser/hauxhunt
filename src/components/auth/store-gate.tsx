"use client";

import type { ReactNode } from "react";
import { useStoresReady } from "@/lib/api/hydrate";

/**
 * Holds dashboard pages back until the signed-in user's records have loaded.
 * Many pages copy store data into state on mount, so they must not render
 * against empty stores.
 */
export function StoreGate({ children }: { children: ReactNode }) {
  const ready = useStoresReady();
  if (!ready) {
    return (
      <div role="status" className="text-carbon-500 flex min-h-svh items-center justify-center text-sm">
        Loading…
      </div>
    );
  }
  return children;
}
