"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";

import { LockedFeature } from "@/components/tier/locked-feature";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import type { GatedFeature } from "@/lib/access-control";
import {
  api,
  DATA_CHANGED_EVENT,
  reportWriteFailure,
} from "@/lib/api/client";
import { useManagedListing } from "@/lib/api/hydrate";

/**
 * The "Boost this listing" control, gated behind the Paid tier via the
 * `owner.propertyBoost` / `agent.propertyBoost` entries in the
 * `GATED_FEATURES` registry (`src/lib/access-control.ts`). A free-tier user
 * sees the locked variant (`LockedFeature`, "button" style), which opens
 * `UpgradeModal` -- this app's payment wall -- instead of boosting anything.
 * A paid-tier user sees the real button; clicking it boosts the property's
 * listing through the API, and it reads "Boosted" while that boost runs. Only
 * a live listing can be boosted, so paid users see nothing without one.
 *
 * Extracted from the near-identical inline implementations this originally
 * had on the Owner and Partner Property Detail pages (Listing Performance
 * phase) so every surface that offers Boost -- those two, plus the Partner
 * and Owner Performance pages -- shares one definition of what "boosted"
 * looks like.
 *
 * Boosted state comes from the listing the API returns, so it survives a
 * reload. Pass `key` at the call site (e.g. `key={propertyId}`) when the same button
 * instance can represent a different property over its lifetime, so
 * switching the underlying property resets this back to "not boosted"
 * instead of carrying over a stale badge.
 */
export function BoostListingButton({
  feature,
  propertyId,
}: {
  feature: Extract<GatedFeature, "owner.propertyBoost" | "agent.propertyBoost">;
  propertyId: string;
}) {
  const tier = useTier();
  const listing = useManagedListing(propertyId);
  const [boosting, setBoosting] = useState(false);
  const [boosted, setBoosted] = useState(false);

  if (!isPaidTier(tier)) {
    return <LockedFeature feature={feature} variant="button" />;
  }

  if (listing?.status !== "live") return null;

  async function boost() {
    if (!listing) return;
    setBoosting(true);
    try {
      await api(`/listings/${listing.id}/boost`, { method: "POST" });
      setBoosted(true);
      window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
    } catch (error) {
      reportWriteFailure(error);
    } finally {
      setBoosting(false);
    }
  }

  if (boosted || listing.boosted) {
    return (
      <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-black/[0.06] px-4 text-sm font-medium whitespace-nowrap text-black/70">
        <BadgeCheck aria-hidden="true" className="size-4" /> Boosted
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={boost}
      disabled={boosting}
      className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-black/80 disabled:opacity-60"
    >
      Boost this listing
    </button>
  );
}
