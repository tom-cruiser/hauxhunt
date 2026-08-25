"use client";

import { isPaidTier, useTier } from "@/hooks/use-tier";
import { LockedPanel } from "@/components/tier/locked-feature";

/**
 * Tenant tier gate: "map view & location link" is Paid-only. This is the
 * property detail page's own embedded map (a plain OpenStreetMap iframe),
 * distinct from the search-results map toggle gated in
 * `renter-map-catalogue.tsx` — both surfaces are the same matrix line item,
 * gated the same way, on two different pages.
 */
export function PropertyLocationMap({ mapUrl, location }: { mapUrl: string; location: string }) {
  const tier = useTier();

  if (!isPaidTier(tier)) {
    return <LockedPanel feature="tenant.mapView" />;
  }

  return (
    <div className="mt-5 overflow-hidden border border-black/8 bg-white shadow-sm">
      <iframe
        title={`Map showing ${location}`}
        src={mapUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[320px] w-full border-0"
      />
    </div>
  );
}
