"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { AlertCircle, MapPin, Plus, Search } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { OWNER_LISTINGS, getOwnerProperties, managementSummaryFor, subscribeToOwnerApplications, subscribeToOwnerRentals, subscribeToOwnerPayments } from "@/lib/owner-data";
import { subscribeToMaintenance } from "@/lib/maintenance-data";
import { subscribeToTeam } from "@/lib/team-data";
import { attentionReasonFor, getPropertyOperationalSummary } from "@/lib/owner-property-summary";
import noDataIllustration from "@/assets/images/empty.png";

// Owner Properties phase (Phase 3) -- Properties is the portfolio
// workspace, not a second Listings page (Section 1/49): a card's job is
// "what do I own, who manages it, is anything happening" -- never views,
// saves, or listing performance. Listing status is read the same way
// Property Detail already reads it (listing?.status, falling back to the
// property's own fact) so the two screens can never disagree about the
// same property.

type Filter = "All" | "Needs Attention" | "Occupied" | "Vacant" | "Listed" | "Unlisted";
const FILTERS: Filter[] = ["All", "Needs Attention", "Occupied", "Vacant", "Listed", "Unlisted"];

export default function OwnerPropertiesPage() {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToOwnerApplications(forceUpdate), []);
  useEffect(() => subscribeToOwnerRentals(forceUpdate), []);
  useEffect(() => subscribeToOwnerPayments(forceUpdate), []);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const properties = getOwnerProperties();

  const rows = useMemo(
    () =>
      properties.map((property) => ({
        property,
        listingStatus: OWNER_LISTINGS.find((l) => l.propertyId === property.id)?.status ?? property.listingStatus,
        summary: getPropertyOperationalSummary(property.id),
      })),
    [properties],
  );

  const filtered = rows.filter(({ property, listingStatus, summary }) => {
    const matchesQuery = query.trim()
      ? `${property.title} ${property.location} ${property.propertyManager?.name ?? ""} ${property.agent?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
      : true;
    if (!matchesQuery) return false;
    if (filter === "All") return true;
    if (filter === "Needs Attention") return summary.needsAttention;
    if (filter === "Occupied") return property.occupancy === "Occupied";
    if (filter === "Vacant") return property.occupancy === "Vacant";
    if (filter === "Listed") return listingStatus === "Live" || listingStatus === "In Review";
    if (filter === "Unlisted") return listingStatus === "Not Listed" || listingStatus === "Draft" || listingStatus === "Paused" || listingStatus === "Archived";
    return true;
  });

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="flex flex-col gap-6 border-b border-black/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">Properties</h1>
              <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
                What you own, how it&apos;s managed, and what needs your attention.
              </p>
            </div>
            <Link
              href="/owner-dashboard/properties/new"
              className="font-bricolage inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 sm:self-auto"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add Property
            </Link>
          </header>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block w-full max-w-sm">
              <span className="sr-only">Search your properties</span>
              <span className="catalogue-location-filter flex items-center gap-2 px-4">
                <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, location, or manager"
                  className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>

          {filtered.length === 0 ? (
            <section className="mt-6 flex min-h-[420px] flex-col items-center justify-center bg-white px-6 py-14 text-center shadow-[0_18px_55px_rgba(0,0,0,0.055)]">
              <Image src={noDataIllustration} alt="" className="h-40 w-auto object-contain" />
              <h3 className="font-bricolage text-carbon-900 mt-5 text-2xl font-medium">
                {properties.length === 0 ? "No properties yet" : "No properties match these filters"}
              </h3>
              <p className="text-carbon-500 mt-2 max-w-md text-sm leading-6">
                {properties.length === 0
                  ? "Add your first property to create a listing, manage applications, and start renting through HauxHunt."
                  : "Try a different filter or search term."}
              </p>
              {properties.length === 0 ? (
                <Link href="/owner-dashboard/properties/new" className="font-bricolage mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
                  <Plus aria-hidden="true" className="size-4" />
                  Add Property
                </Link>
              ) : null}
            </section>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ property, listingStatus, summary }) => {
                const attentionReason = attentionReasonFor(summary);

                // Section 15/51: the applications count is the one signal
                // that needs its own click target (into the Phase 2
                // property-scoped Applications workspace), while the card
                // itself stays a single "View Property" action (Section
                // 21). A nested <a> inside <a> is invalid HTML, so the card
                // is an <article> with the property-detail Link stretched
                // behind everything (inset-0, z-0) and the applications
                // Link rendered as an ordinary sibling on top (z-10) --
                // clicking it never reaches the stretched link underneath.
                const signalNodes: ReactNode[] = [];
                if (summary.currentRental) {
                  signalNodes.push(<span key="rental">{summary.currentRental.status === "Upcoming" ? "1 upcoming rental" : "1 active rental"}</span>);
                }
                if (summary.activeApplications > 0) {
                  signalNodes.push(
                    <Link
                      key="applications"
                      href={`/owner-dashboard/applications?propertyId=${property.id}`}
                      className="relative z-10 underline underline-offset-2 hover:no-underline"
                    >
                      {summary.activeApplications} application{summary.activeApplications === 1 ? "" : "s"}
                    </Link>,
                  );
                }
                if (summary.openMaintenanceCount > 0) {
                  signalNodes.push(<span key="maintenance">{summary.openMaintenanceCount} open maintenance</span>);
                }

                return (
                  <article
                    key={property.id}
                    className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_14px_38px_rgba(0,0,0,0.055)] transition-shadow hover:shadow-[0_18px_50px_rgba(0,0,0,0.09)]"
                  >
                    <Link href={`/owner-dashboard/properties/${property.id}`} aria-label={`View ${property.title}`} className="absolute inset-0 z-0" />
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw"
                        className="pointer-events-none object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
                      />
                      <div className="pointer-events-none absolute top-4 left-4 flex flex-wrap gap-1.5">
                        <StatusPill status={property.occupancy} />
                        <StatusPill status={listingStatus} tone="outline" />
                      </div>
                    </div>
                    <div className="relative p-5">
                      <h3 className="font-bricolage text-carbon-900 text-lg font-medium tracking-[-0.02em]">{property.title}</h3>
                      <p className="text-carbon-500 mt-1.5 flex items-center gap-1.5 text-sm">
                        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                        {property.location}
                      </p>
                      <p className="text-carbon-400 mt-1.5 text-xs">
                        {property.type} · {property.bedrooms} bed · {property.bathrooms} bath
                      </p>

                      <p className="text-carbon-600 mt-4 border-t border-black/8 pt-4 text-sm font-medium">{managementSummaryFor(property)}</p>

                      {attentionReason ? (
                        <p className="text-carbon-900 mt-2 flex items-center gap-1.5 text-sm font-medium">
                          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
                          {attentionReason}
                        </p>
                      ) : null}

                      {signalNodes.length > 0 ? (
                        <p className="text-carbon-500 mt-2 text-xs">
                          {signalNodes.map((node, i) => (
                            <span key={i}>
                              {i > 0 ? " · " : ""}
                              {node}
                            </span>
                          ))}
                        </p>
                      ) : null}

                      {property.rent ? <p className="text-carbon-900 mt-3 text-sm font-medium">{property.rent}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </OwnerDashboardShell>
  );
}
