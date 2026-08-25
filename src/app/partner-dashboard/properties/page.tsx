"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import {
  canManageListingFor,
  getProfessionalPropertyCards,
  subscribeToIndependentProperties,
  type ProfessionalPropertyCard,
} from "@/lib/professional-properties";
import { getMaintenanceForProperty, getPaymentsForProperty, getRentalsForProperty, subscribeToPmWork } from "@/lib/pm-work";
import emptyIllustration from "@/assets/images/empty.png";

// Phase 3 -- the professional's OWN properties, from either authority
// source (Team Assignment or Independent Authorization), across every Team
// they belong to. Deliberately separate from the pre-existing "Portfolio &
// listings" nav item (PORTFOLIO_LISTINGS in dashboard-route-page.tsx) --
// that surface is its own, older, disconnected mock dataset; reconciling
// the two is a full dashboard redesign question for a future phase, not
// this one (see the Phase 3 report, Section Q).
//
// Foundation Cleanup phase: this is now the ONLY professional property
// inventory (Portfolio & Listings no longer exists as one -- see
// /partner-dashboard/listings, which redirects here). Every card now also
// shows Listing state, resolved per-property via professional-
// properties.ts's getListingForProperty -- never PORTFOLIO_LISTINGS.

type SourceFilter = "all" | "team" | "independent";
type ListingFilter = "all" | "none" | "Draft" | "In Review" | "Live" | "Archived";

export default function PartnerPropertiesPage() {
  return (
    <Suspense>
      <PartnerPropertiesPageInner />
    </Suspense>
  );
}

function PartnerPropertiesPageInner() {
  const partnerRole = usePartnerRole();
  const role = partnerRole === "agent" ? "agent" : "property_manager";
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);
  const searchParams = useSearchParams();
  const showGuidance = searchParams.get("guidance") === "create-listing";

  const [filter, setFilter] = useState<SourceFilter>(searchParams.get("filter") === "team" ? "team" : searchParams.get("filter") === "independent" ? "independent" : "all");
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");

  const professional = useDemoProfessional(role);
  const cards = professional ? getProfessionalPropertyCards(professional.id) : [];
  const teamCards = cards.filter((c) => c.source === "TEAM_ASSIGNMENT");
  const independentCards = cards.filter((c) => c.source === "INDEPENDENT_AUTHORIZATION");

  const sourceFiltered = filter === "team" ? teamCards : filter === "independent" ? independentCards : cards;
  const visible = sourceFiltered.filter((c) => {
    if (listingFilter === "all") return true;
    if (listingFilter === "none") return !c.listing || c.listing.status === "Not Listed";
    return c.listing?.status === listingFilter;
  });

  const title = role === "agent" ? "My Properties" : "Managed Properties";
  const description =
    role === "agent"
      ? "Properties you market through a Team, and properties you're independently authorized to represent."
      : "Properties assigned to you through a Team, and properties you're independently authorized to manage.";

  return (
    <DashboardShell initialSection="properties">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="flex flex-col gap-6 border-b border-black/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">{title}</h1>
              <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">{description}</p>
            </div>
            <Link
              href="/partner-dashboard/properties/new"
              className="font-bricolage inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 sm:self-auto"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add Property
            </Link>
          </header>

          {showGuidance ? (
            <div className="mt-6 rounded-2xl bg-black/3 p-4 text-sm">
              <span className="font-medium">Choose a property to create a listing for.</span>{" "}
              <span className="text-carbon-600">Every listing belongs to a property you already have access to -- select one below, then create its listing from Property Detail.</span>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                All <span className="ml-1 opacity-60">{cards.length}</span>
              </FilterButton>
              <FilterButton active={filter === "team"} onClick={() => setFilter("team")}>
                Team Assigned <span className="ml-1 opacity-60">{teamCards.length}</span>
              </FilterButton>
              <FilterButton active={filter === "independent"} onClick={() => setFilter("independent")}>
                Independent <span className="ml-1 opacity-60">{independentCards.length}</span>
              </FilterButton>
            </div>
            <label className="relative block shrink-0">
              <span className="sr-only">Filter by listing status</span>
              <select
                value={listingFilter}
                onChange={(e) => setListingFilter(e.target.value as ListingFilter)}
                className="h-9 appearance-none rounded-full bg-black/4.5 py-1 pr-9 pl-3.5 text-xs font-medium text-black/70 outline-none"
              >
                <option value="all">Listing: All</option>
                <option value="none">No Listing</option>
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Live">Live</option>
                <option value="Archived">Archived</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-black/50" />
            </label>
          </div>

          {cards.length === 0 ? (
            <EmptyState
              title="No properties yet"
              body={
                role === "agent"
                  ? "Properties assigned through your Teams or properties you're independently authorized to represent will appear here."
                  : "Properties assigned through your Teams or properties you're independently authorized to manage will appear here."
              }
              cta="Add Property"
              illustrated
            />
          ) : visible.length === 0 ? (
            filter === "independent" ? (
              <EmptyState title="No independent properties" body="Properties you represent directly on behalf of property owners will appear here." cta="Add Property" />
            ) : filter === "team" ? (
              <EmptyState title="No Team-assigned properties" body="Properties assigned to you by Property Owners or authorized Property Managers will appear here." />
            ) : (
              <EmptyState title="No properties match this filter" body="Try a different listing status filter." />
            )
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((card) => (
                <PropertyCard key={card.propertyId} card={card} professionalId={professional?.id} showOperationalSummary={role === "property_manager"} />
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${active ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body, cta, illustrated }: { title: string; body: string; cta?: string; illustrated?: boolean }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
      {illustrated ? <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" /> : null}
      <h3 className={`font-bricolage text-xl font-medium ${illustrated ? "mt-5" : ""}`}>{title}</h3>
      <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">{body}</p>
      {cta ? (
        <Link href="/partner-dashboard/properties/new" className="font-bricolage mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
          <Plus aria-hidden="true" className="size-4" />
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

// Card priority (Section 15/66): property, location, authority source, Team
// OR Owner context, Listing status, Authorization status if independent.
// Deeper detail (responsibilities, proof document, contact info, full
// listing content) lives on Property Detail, not here.
//
// Property Manager Dashboard phase -- Section 13: PM's card additionally
// gets a compact operational summary line ("2 active rentals · 1 open
// maintenance"), scoped to properties this PM actually has rental/
// maintenance responsibility for (pm-work.ts already gates on that).
// Agent's card is unaffected -- showOperationalSummary is false for Agent.
function PropertyCard({ card, professionalId, showOperationalSummary }: { card: ProfessionalPropertyCard; professionalId?: string; showOperationalSummary: boolean }) {
  const sourceLabel = card.source === "TEAM_ASSIGNMENT" ? "Team Assigned" : card.role === "agent" ? "Independent Representation" : "Independent Management";
  const listingLabel = card.listing?.status ?? "Not Listed";

  const rentals = showOperationalSummary && professionalId ? getRentalsForProperty(professionalId, card.propertyId) : [];
  const activeRentals = rentals.filter((r) => r.status === "Active").length;
  const openMaintenance = showOperationalSummary && professionalId ? getMaintenanceForProperty(professionalId, card.propertyId).filter((m) => m.status !== "Resolved" && m.status !== "Cancelled").length : 0;
  const overduePayments = showOperationalSummary && professionalId ? getPaymentsForProperty(professionalId, card.propertyId).filter((p) => p.status === "Overdue").length : 0;

  return (
    <Link href={`/partner-dashboard/properties/${card.propertyId}`} className="block rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.09)]">
      <div className="flex items-center gap-4">
        <Image src={card.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="truncate font-medium">{card.title}</p>
          <p className="text-carbon-500 truncate text-sm">{card.location}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="bg-black/4.5 rounded-full px-2.5 py-1 text-xs font-medium">{sourceLabel}</span>
      </div>

      <p className="text-carbon-500 mt-3 text-sm">
        {card.source === "TEAM_ASSIGNMENT" ? (
          <>{card.teamName}</>
        ) : (
          <>
            Property Owner: <span className="text-carbon-900 font-medium">{card.ownerName}</span>
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/8 pt-4">
        {card.source === "TEAM_ASSIGNMENT" ? <StatusPill status="Active" /> : <StatusPill status={card.authorizationStatus ?? "Under Review"} />}
        <StatusPill status={listingLabel} tone="outline" />
        {canManageListingFor(card) ? null : <span className="text-carbon-400 text-xs">View only</span>}
      </div>

      {showOperationalSummary && (rentals.length > 0 || openMaintenance > 0 || overduePayments > 0) ? (
        <p className="text-carbon-500 mt-3 border-t border-black/8 pt-3 text-xs">
          {activeRentals} active rental{activeRentals === 1 ? "" : "s"} · {openMaintenance} open maintenance
          {overduePayments > 0 ? ` · ${overduePayments} payment overdue` : ""}
        </p>
      ) : null}
    </Link>
  );
}
