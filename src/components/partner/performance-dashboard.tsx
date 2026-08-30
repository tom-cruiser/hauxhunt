"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer } from "react";
import { ArrowUpRight, Eye, Heart, MessageSquare, Percent } from "lucide-react";

import { StatusPill } from "@/components/owner/status-pill";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import {
  getProfessionalPropertyCards,
  subscribeToIndependentProperties,
  type ProfessionalPropertyCard,
} from "@/lib/professional-properties";
import { subscribeToTeam } from "@/lib/team-data";
import emptyIllustration from "@/assets/images/empty.png";

// Listing Performance phase -- replaces the old performance-dashboard.tsx
// (copied verbatim from Joseph's earlier prototype), which was entirely
// hardcoded demo numbers with no real data behind them at all (a period
// picker faking "Last 7/30/90 days"/"This year" trends, a fabricated
// portfolio health score, invented "demand signal" search data, and a
// per-listing table of properties that didn't even correspond to this
// professional's real properties). None of that has a real backing source
// in this prototype -- there's no time-series history anywhere, and no
// market-wide search-demand data -- so rebuilding it "for real" meant
// dropping it, not faking it more convincingly.
//
// What IS real: owner-data.ts's OWNER_LISTINGS already carries actual
// views/saves/enquiries per Team-managed listing (the Owner dashboard's own
// Performance/Listings pages already show these). professional-
// properties.ts's getListingForProperty now carries those same numbers
// through onto ListingRecord (see the `views`/`saves`/`enquiries` fields
// added there), so this page reads the exact same counts the Owner sees --
// never a second, professional-only copy. Independent properties have no
// traffic-tracking in this prototype at all, so they're called out as
// "not tracked yet" rather than shown with invented zeros.

type TrackedCard = ProfessionalPropertyCard & {
  listing: NonNullable<ProfessionalPropertyCard["listing"]> & {
    views: number;
    saves: number;
    enquiries: number;
  };
};

function isTracked(card: ProfessionalPropertyCard): card is TrackedCard {
  return (
    typeof card.listing?.views === "number" &&
    typeof card.listing?.saves === "number" &&
    typeof card.listing?.enquiries === "number"
  );
}

export function PerformanceDashboard() {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);

  const partnerRole = usePartnerRole();
  const role = partnerRole === "agent" ? "agent" : "property_manager";
  const professional = useDemoProfessional(role);

  if (!professional) {
    return (
      <section className="px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
        <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
      </section>
    );
  }

  const properties = getProfessionalPropertyCards(professional.id);
  const tracked = properties.filter(isTracked).sort((a, b) => b.listing.views - a.listing.views);
  const untrackedCount = properties.length - tracked.length;

  const totalViews = tracked.reduce((sum, c) => sum + c.listing.views, 0);
  const totalSaves = tracked.reduce((sum, c) => sum + c.listing.saves, 0);
  const totalEnquiries = tracked.reduce((sum, c) => sum + c.listing.enquiries, 0);
  const enquiryRate = totalViews > 0 ? (totalEnquiries / totalViews) * 100 : 0;

  return (
    <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
      <div className="mx-auto max-w-340">
        <header className="border-b border-black/10 pb-8">
          <h1 className="dashboard-page-title text-carbon-900">Listing performance</h1>
          <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">How property seekers discover and respond to your published listings.</p>
        </header>

        {tracked.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-[1.75rem] bg-white px-6 py-16 text-center shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
            <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
            <h2 className="font-bricolage text-carbon-900 mt-5 text-2xl font-medium">No performance data yet</h2>
            <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Views, saves, and enquiries will appear here once one of your listings is published.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Eye} label="Total views" value={totalViews.toLocaleString()} />
              <StatCard icon={Heart} label="Total saves" value={totalSaves.toLocaleString()} />
              <StatCard icon={MessageSquare} label="Total enquiries" value={totalEnquiries.toLocaleString()} />
              <StatCard icon={Percent} label="Enquiry rate" value={`${enquiryRate.toFixed(1)}%`} />
            </div>

            <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
              <div className="border-b border-black/10 p-5 sm:p-6">
                <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-tight">Listings</h2>
                <p className="text-carbon-500 mt-1 text-sm">Ranked by views, most to least.</p>
              </div>
              <div className="divide-y divide-black/10">
                {tracked.map((card) => (
                  <ListingRow key={card.propertyId} card={card} />
                ))}
              </div>
            </section>
          </>
        )}

        {untrackedCount > 0 ? (
          <p className="text-carbon-500 mt-6 text-sm">
            {untrackedCount} other {untrackedCount === 1 ? "property isn't" : "properties aren't"} tracked yet -- performance data is only available for published, Team-managed listings.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <div className="flex items-start justify-between gap-5">
        <p className="text-carbon-500 text-sm">{label}</p>
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <p className="font-bricolage text-carbon-900 mt-5 text-4xl font-medium tracking-[-0.045em]">{value}</p>
    </article>
  );
}

function ListingRow({ card }: { card: TrackedCard }) {
  return (
    <Link href={`/partner-dashboard/properties/${card.propertyId}`} className="flex items-center gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
        <Image src={card.image} alt="" fill className="object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{card.title}</p>
        <p className="text-carbon-500 mt-1 truncate text-sm">{card.location}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-6 text-sm sm:flex">
        <Metric label="Views" value={card.listing.views} />
        <Metric label="Saves" value={card.listing.saves} />
        <Metric label="Enquiries" value={card.listing.enquiries} />
      </div>
      <StatusPill status={card.listing.status} />
      <ArrowUpRight aria-hidden="true" className="text-carbon-400 size-4 shrink-0" />
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="text-carbon-900 font-medium">{value.toLocaleString()}</p>
      <p className="text-carbon-400 text-xs">{label}</p>
    </div>
  );
}
