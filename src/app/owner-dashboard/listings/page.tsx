"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { OWNER_LISTINGS, getOwnerProperties } from "@/lib/owner-data";

const FILTERS = ["All", "Draft", "In Review", "Live", "Paused", "Archived", "Not Listed"] as const;

export default function OwnerListingsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const properties = getOwnerProperties();

  const rows = useMemo(
    () =>
      OWNER_LISTINGS.map((listing) => ({
        listing,
        property: properties.find((p) => p.id === listing.propertyId)!,
      })).filter((row) => filter === "All" || row.listing.status === filter),
    [properties, filter],
  );

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Listings</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              The public adverts connected to your properties.
            </p>
          </header>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${filter === item ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="divide-y divide-black/8">
              {rows.map(({ listing, property }) => (
                <Link
                  key={property.id}
                  href={`/owner-dashboard/properties/${property.id}?tab=listing`}
                  className="grid gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Image src={property.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <h3 className="font-bricolage text-carbon-900 truncate font-medium">{property.title}</h3>
                      <p className="text-carbon-500 mt-1 text-sm">{property.location}</p>
                    </div>
                  </div>
                  <StatusPill status={listing.status} />
                  <div className="flex gap-6 text-sm">
                    <MiniMetric label="Views" value={listing.views} />
                    <MiniMetric label="Applications" value={listing.applications} />
                  </div>
                  <div className="text-carbon-500 text-sm lg:text-right">
                    <p>{property.propertyManager?.name ?? "You"}</p>
                    <p className="text-carbon-400 text-xs">{property.agent?.name ?? "No agent"}</p>
                  </div>
                </Link>
              ))}
              {rows.length === 0 ? (
                <p className="text-carbon-500 p-8 text-center text-sm">No listings match this filter.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-carbon-400 text-xs">{label}</p>
      <p className="text-carbon-900 mt-1 font-medium">{value ?? "—"}</p>
    </div>
  );
}
