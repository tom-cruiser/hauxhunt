"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";

import type { ProfessionalPropertyCard } from "@/lib/professional-properties";

// Overview Redesign phase -- Joseph's prototype overview had a "Listing
// performance" sidebar panel that was a fabricated day-by-day bar chart with
// an invented "+18%" trend badge. There is no time-series history anywhere
// in this app (see performance-dashboard.tsx's own header comment for why
// that was dropped rather than faked more convincingly), so this reads the
// exact same real, already-tracked per-listing views/saves/enquiries that
// page shows -- a snapshot, never an invented trend -- and renders relative
// bars across the listings that actually carry traffic data. Independent and
// other-Team properties have no traffic-tracking in this prototype, so they
// are simply excluded here rather than shown with a fabricated zero.

type TrackedCard = ProfessionalPropertyCard & {
  listing: NonNullable<ProfessionalPropertyCard["listing"]> & { views: number };
};

function isTracked(card: ProfessionalPropertyCard): card is TrackedCard {
  return typeof card.listing?.views === "number";
}

export function ListingPerformanceCard({ properties }: { properties: ProfessionalPropertyCard[] }) {
  const tracked = properties.filter(isTracked).sort((a, b) => b.listing.views - a.listing.views);
  const totalViews = tracked.reduce((sum, c) => sum + c.listing.views, 0);
  const totalEnquiries = tracked.reduce((sum, c) => sum + (c.listing.enquiries ?? 0), 0);
  const enquiryRate = totalViews > 0 ? (totalEnquiries / totalViews) * 100 : 0;
  const maxViews = tracked[0]?.listing.views ?? 0;

  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-tight">Listing performance</h2>
          <p className="text-carbon-500 mt-1 text-sm">Across your published listings</p>
        </div>
        <TrendingUp aria-hidden="true" className="size-5 shrink-0" />
      </div>

      {tracked.length === 0 ? (
        <p className="text-carbon-500 mt-6 text-sm leading-6">
          Views, saves and enquiries will appear here once one of your listings is published.
        </p>
      ) : (
        <>
          <div className="mt-7 space-y-3">
            {tracked.slice(0, 5).map((card) => (
              <div key={card.propertyId} className="flex items-center gap-3">
                <p className="text-carbon-700 w-24 shrink-0 truncate text-xs">{card.title}</p>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{ width: `${maxViews > 0 ? (card.listing.views / maxViews) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-carbon-900 w-10 shrink-0 text-right text-xs font-medium">{card.listing.views}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-black/10 pt-5">
            <div>
              <p className="text-carbon-500 text-xs">Total views</p>
              <p className="font-bricolage text-carbon-900 mt-1 text-2xl font-medium">{totalViews.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-carbon-500 text-xs">Enquiry rate</p>
              <p className="font-bricolage text-carbon-900 mt-1 text-2xl font-medium">{enquiryRate.toFixed(1)}%</p>
            </div>
          </div>
        </>
      )}

      <Link
        href="/partner-dashboard/performance"
        className="font-bricolage mt-6 inline-flex text-sm font-medium underline underline-offset-4"
      >
        View performance
      </Link>
    </section>
  );
}
