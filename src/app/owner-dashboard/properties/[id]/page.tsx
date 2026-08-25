"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Expand,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { AssignPropertyManagerDialog } from "@/components/owner/assign-property-manager-dialog";
import { AssignAgentDialog, type AssignableMember } from "@/components/owner/assign-agent-dialog";
import { InviteTeamMemberDialog } from "@/components/owner/invite-team-member-dialog";
import {
  OWNER_LISTINGS,
  getOwnerApplications,
  getOwnerPayments,
  getOwnerProperty,
  getOwnerRentals,
  managementSummaryFor,
  subscribeToOwnerApplications,
  subscribeToOwnerPayments,
  subscribeToOwnerRentals,
  OWNER,
  RENTER_DEMO_NAME,
  type OwnerListing,
  type OwnerPayment,
  type OwnerRental,
  type PropertyManagerAssignment,
} from "@/lib/owner-data";
import { getMaintenanceRequests, subscribeToMaintenance, type MaintenanceRequest } from "@/lib/maintenance-data";
import { REGISTERED_PROFESSIONALS, TEAM_ID, getActiveMemberships, type ProfessionalRole } from "@/lib/team-data";
import { OWNER_PARTICIPANT_ID, RENTER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";

type TabKey = "overview" | "listing" | "rental" | "payments" | "maintenance" | "team";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "listing", label: "Listing" },
  { key: "rental", label: "Rental" },
  { key: "payments", label: "Payments" },
  { key: "maintenance", label: "Maintenance" },
  { key: "team", label: "Team" },
];

export default function OwnerPropertyDetailPage() {
  return (
    <Suspense>
      <OwnerPropertyDetailPageInner />
    </Suspense>
  );
}

function OwnerPropertyDetailPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const property = getOwnerProperty(params.id);
  const initialTab = (searchParams.get("tab") as TabKey | null) ?? "overview";
  const [tab, setTab] = useState<TabKey>(TABS.some((t) => t.key === initialTab) ? initialTab : "overview");
  const [pickRole, setPickRole] = useState<ProfessionalRole | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ member: AssignableMember; role: ProfessionalRole } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Cross-Role Lifecycle Synchronization phase -- Section 32. Rentals,
  // Payments, and Maintenance now read through the same live getters PM's
  // dashboard reads, instead of the frozen base arrays, so a PM-created
  // Rental Setup / recorded Payment / status change is visible here too.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToOwnerApplications(forceUpdate), []);
  useEffect(() => subscribeToOwnerRentals(forceUpdate), []);
  useEffect(() => subscribeToOwnerPayments(forceUpdate), []);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);

  if (!property) return notFound();

  const listing = OWNER_LISTINGS.find((l) => l.propertyId === property.id) ?? null;
  const rentals = getOwnerRentals().filter((r) => r.propertyId === property.id);
  const payments = getOwnerPayments().filter((p) => p.propertyId === property.id);
  const maintenance = getMaintenanceRequests().filter((m) => m.propertyId === property.id);
  const currentRental = rentals.find((r) => r.status === "Active" || r.status === "Upcoming" || r.status === "Ending Soon");
  // Owner Properties phase -- Section 29/43: the Listing tab's applications
  // count previously read OWNER_LISTINGS' own static `applications` number,
  // a second, independently-maintained count that happened to agree with
  // the real records but had no mechanism keeping it that way. Derived live
  // from the same shared Applications the Properties card and the Phase 2
  // Applications screen already use, scoped by propertyId.
  const applicationsCount = getOwnerApplications().filter((a) => a.propertyId === property.id).length;

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          {/* Header ---------------------------------------------------------- */}
          <header className="flex flex-col gap-6 border-b border-black/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link href="/owner-dashboard/properties" className="text-carbon-500 text-sm font-medium hover:text-black">
                ← Properties
              </Link>
              <h1 className="dashboard-page-title text-carbon-900 mt-4">{property.title}</h1>
              <p className="text-carbon-500 mt-3 flex items-center gap-1.5 text-base">
                <MapPin aria-hidden="true" className="size-4" />
                {property.location}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill status={property.occupancy} />
                <StatusPill status={listing?.status ?? property.listingStatus} tone="outline" />
              </div>
              <p className="text-carbon-500 mt-3 text-sm">{managementSummaryFor(property)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/owner-dashboard/properties/${property.id}/edit`}
                className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
              >
                <Pencil aria-hidden="true" className="size-4" />
                Edit Property
              </Link>
              <button
                type="button"
                onClick={() => setTab("team")}
                className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
              >
                <Users aria-hidden="true" className="size-4" />
                Manage Team
              </button>
              {listing && (listing.status === "Live" || listing.status === "In Review") ? (
                <button
                  type="button"
                  onClick={() => setTab("listing")}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  View Listing
                </button>
              ) : (
                <Link
                  href="/owner-dashboard/properties/new"
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Create Listing
                </Link>
              )}
            </div>
          </header>

          {/* Tabs -------------------------------------------------------------- */}
          <div className="mt-6 overflow-x-auto">
            <div className="flex min-w-max gap-1.5 border-b border-black/10 pb-0">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`relative h-11 px-4 text-sm font-medium transition-colors ${tab === t.key ? "text-black" : "text-carbon-500 hover:text-black"}`}
                >
                  {t.label}
                  {tab === t.key ? <span className="absolute inset-x-4 -bottom-px h-0.5 bg-black" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {tab === "overview" ? (
              <OverviewTab property={property} rental={currentRental} listing={listing} maintenance={maintenance} />
            ) : null}
            {tab === "listing" ? <ListingTab property={property} listing={listing} applicationsCount={applicationsCount} /> : null}
            {tab === "rental" ? <RentalTab rentals={rentals} propertyManager={property.propertyManager} /> : null}
            {tab === "payments" ? <PaymentsTab payments={payments} /> : null}
            {tab === "maintenance" ? <MaintenanceTab requests={maintenance} /> : null}
            {tab === "team" ? (
              <TeamTab
                key={refreshKey}
                property={property}
                onPick={(role) => setPickRole(role)}
                onInvite={() => setInviteOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </section>

      {pickRole ? (
        <PickTeamMemberDialog
          role={pickRole}
          onClose={() => setPickRole(null)}
          onPick={(member) => {
            setAssignTarget({ member, role: pickRole });
            setPickRole(null);
          }}
        />
      ) : null}

      <AssignPropertyManagerDialog
        open={Boolean(assignTarget && assignTarget.role === "property_manager")}
        onClose={() => setAssignTarget(null)}
        member={assignTarget?.role === "property_manager" ? assignTarget.member : null}
        propertyId={property.id}
        onAssigned={() => setRefreshKey((k) => k + 1)}
      />
      <AssignAgentDialog
        open={Boolean(assignTarget && assignTarget.role === "agent")}
        onClose={() => setAssignTarget(null)}
        member={assignTarget?.role === "agent" ? assignTarget.member : null}
        propertyId={property.id}
        onAssigned={() => setRefreshKey((k) => k + 1)}
      />
      <InviteTeamMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSent={() => setRefreshKey((k) => k + 1)} />
    </OwnerDashboardShell>
  );
}

// A property's Team tab only ever offers ACTIVE team members, never the
// full registered-professional pool -- registering isn't the same as being
// on this Owner's team, so assigning a property must go through membership
// first (see Section 35 of the phase brief).
function PickTeamMemberDialog({
  role,
  onClose,
  onPick,
}: {
  role: ProfessionalRole;
  onClose: () => void;
  onPick: (member: AssignableMember) => void;
}) {
  const roleLabel = role === "agent" ? "Agent" : "Property Manager";
  const members = getActiveMemberships(TEAM_ID).filter((m) => m.role === role);

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <h2 className="font-bricolage text-lg font-medium">Assign Team Member</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-6">
          <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Select an active {roleLabel}</p>
          <div className="mt-4 space-y-2">
            {members.map((m) => {
              const professional = REGISTERED_PROFESSIONALS.find((p) => p.id === m.professionalId);
              if (!professional) return null;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPick({ professionalId: professional.id, name: professional.name, verified: professional.verified, avatar: professional.avatar })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-black/12 p-4 text-left transition-colors hover:border-black/30"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{professional.name.slice(0, 1)}</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    {professional.name}
                    {professional.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  property,
  rental,
  listing,
  maintenance,
}: {
  property: NonNullable<ReturnType<typeof getOwnerProperty>>;
  rental: OwnerRental | undefined;
  listing: OwnerListing | null;
  maintenance: MaintenanceRequest[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Property information</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact icon={BedDouble} label="Bedrooms" value={String(property.bedrooms)} />
            <Fact icon={Bath} label="Bathrooms" value={String(property.bathrooms)} />
            <Fact icon={Expand} label="Size" value={`${property.size} m²`} />
            <Fact label="Type" value={property.type} />
          </dl>
          {property.amenities.length > 0 ? (
            <div className="mt-5 border-t border-black/8 pt-5">
              <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Amenities</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-black/4.5 px-3 py-1.5 text-xs">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Occupancy &amp; rental</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-carbon-400 text-xs">Occupancy</dt>
              <dd className="mt-1"><StatusPill status={property.occupancy} /></dd>
            </div>
            <div>
              <dt className="text-carbon-400 text-xs">Listing status</dt>
              <dd className="mt-1"><StatusPill status={listing?.status ?? property.listingStatus} /></dd>
            </div>
            {rental ? (
              <>
                <div>
                  <dt className="text-carbon-400 text-xs">Current renter</dt>
                  <dd className="mt-1 font-medium">{rental.renter}</dd>
                </div>
                <div>
                  <dt className="text-carbon-400 text-xs">Rent</dt>
                  <dd className="mt-1 font-medium">{rental.rent}</dd>
                </div>
                <div>
                  <dt className="text-carbon-400 text-xs">Rental dates</dt>
                  <dd className="mt-1 font-medium">{rental.start} – {rental.end}</dd>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <dt className="text-carbon-400 text-xs">Current renter</dt>
                <dd className="text-carbon-500 mt-1">No active rental.</dd>
              </div>
            )}
          </dl>
        </section>

        {maintenance.length > 0 ? (
          <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
            <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Recent maintenance</h2>
            <ul className="mt-4 divide-y divide-black/8">
              {maintenance.slice(0, 3).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 truncate text-sm">{m.title}</span>
                  <StatusPill status={m.status} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-6">
        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Assigned to</h2>
          <div className="mt-4 space-y-4">
            <PersonRow role="Property Manager" assignment={property.propertyManager} />
            <PersonRow role="Agent" assignment={property.agent} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon?: typeof BedDouble; label: string; value: string }) {
  return (
    <div>
      {Icon ? <Icon aria-hidden="true" className="size-4 text-black/40" /> : null}
      <p className="text-carbon-400 mt-2 text-xs">{label}</p>
      <p className="font-bricolage mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function PersonRow({ role, assignment }: { role: string; assignment: { name: string; verified: boolean } | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/6 text-black">
        <UserRound aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-carbon-400 text-xs">{role}</p>
        {assignment ? (
          <p className="flex items-center gap-1 truncate text-sm font-medium">
            {assignment.name}
            {assignment.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
          </p>
        ) : (
          <p className="text-carbon-500 text-sm">Not assigned</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

function ListingTab({
  property,
  listing,
  applicationsCount,
}: {
  property: NonNullable<ReturnType<typeof getOwnerProperty>>;
  listing: (typeof OWNER_LISTINGS)[number] | null;
  applicationsCount: number;
}) {
  const isUnpublished = !listing || listing.status === "Not Listed" || listing.status === "Draft";
  if (isUnpublished) {
    const hasDraft = listing?.status === "Draft";
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <h3 className="font-bricolage text-xl font-medium">{hasDraft ? "This listing is still a draft" : "No listing yet"}</h3>
        <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
          {hasDraft ? "Finish and publish the listing to start receiving enquiries." : "Create a listing to advertise this property to renters."}
        </p>
        <Link href="/owner-dashboard/properties/new" className="font-bricolage mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
          <Plus aria-hidden="true" className="size-4" />
          {hasDraft ? "Continue Listing" : "Create Listing"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bricolage text-carbon-900 text-lg font-medium">{property.title}</h2>
            <p className="text-carbon-500 mt-1 text-sm">{property.location}</p>
          </div>
          <StatusPill status={listing.status} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-carbon-400 text-xs">Managed by</dt>
            <dd className="mt-1 font-medium">{property.propertyManager?.name ?? "You"}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Marketing agent</dt>
            <dd className="mt-1 font-medium">{property.agent?.name ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Applications</dt>
            <dd className="mt-1 font-medium">
              <Link href={`/owner-dashboard/applications?propertyId=${property.id}`} className="underline underline-offset-4 hover:no-underline">
                {applicationsCount}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Rent</dt>
            <dd className="mt-1 font-medium">{property.rent ?? "Not set"}</dd>
          </div>
        </dl>
      </section>

      {listing.views !== null ? (
        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Listing performance</h2>
          <p className="text-carbon-500 mt-1 text-sm">How property seekers are responding to this listing.</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Views" value={listing.views} />
            <Metric label="Saves" value={listing.saves ?? 0} />
            <Metric label="Enquiries" value={listing.enquiries ?? 0} />
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-black/3 p-4">
      <dt className="text-carbon-500 text-xs">{label}</dt>
      <dd className="font-bricolage text-carbon-900 mt-2 text-2xl font-medium">{value.toLocaleString()}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rental
// ---------------------------------------------------------------------------

function RentalTab({ rentals, propertyManager }: { rentals: OwnerRental[]; propertyManager: PropertyManagerAssignment | null }) {
  if (rentals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <h3 className="font-bricolage text-xl font-medium">No rentals yet</h3>
        <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">This property has no rental history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {rentals.map((rental) => (
        <section key={rental.id} className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-carbon-400 text-xs">{rental.id}</p>
              <h3 className="font-bricolage mt-1 text-lg font-medium">{rental.renter}</h3>
              <p className="text-carbon-500 mt-1 text-sm">{rental.start} – {rental.end}</p>
            </div>
            <StatusPill status={rental.status} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-carbon-400 text-xs">Managed by</dt>
              <dd className="mt-1 font-medium">{propertyManager?.name ?? "You"}</dd>
            </div>
            <div>
              <dt className="text-carbon-400 text-xs">Monthly rent</dt>
              <dd className="mt-1 font-medium">{rental.rent}</dd>
            </div>
            <div>
              <dt className="text-carbon-400 text-xs">Agreement</dt>
              <dd className="mt-1"><StatusPill status={rental.agreementStatus} /></dd>
            </div>
            <div>
              <dt className="text-carbon-400 text-xs">Deposit</dt>
              <dd className="mt-1"><StatusPill status={rental.depositStatus} /></dd>
            </div>
          </dl>
          <p className="text-carbon-500 mt-5 border-t border-black/8 pt-4 text-sm">{rental.note}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(() => {
              // Messages Synchronization phase -- Section 37/83: resolves
              // the SAME participant/conversation as the standalone
              // Rentals workspace's own Message action, using stable ids
              // instead of the PM's display name.
              const target = propertyManager
                ? { id: propertyManager.professionalId, name: propertyManager.name }
                : rental.renter === RENTER_DEMO_NAME
                  ? { id: RENTER_PARTICIPANT_ID, name: rental.renter }
                  : null;
              if (!target) return null;
              const conversation = getOrCreateConversation(OWNER_PARTICIPANT_ID, target.id, {
                type: "rental",
                propertyId: rental.propertyId,
                rentalId: rental.id,
                label: "Rental",
              });
              if (!conversation) return null;
              return (
                <Link
                  href={`/owner-dashboard/messages?open=${conversation.id}`}
                  className="font-bricolage inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black"
                >
                  <MessageSquare aria-hidden="true" className="size-4" />
                  Message {target.name}
                </Link>
              );
            })()}
            <Link
              href={`/owner-dashboard/payments?property=${rental.propertyId}`}
              className="font-bricolage inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black"
            >
              View Payments
            </Link>
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

function PaymentsTab({ payments }: { payments: OwnerPayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <h3 className="font-bricolage text-xl font-medium">No payments yet</h3>
        <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Rent payments for this property will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
      <div className="divide-y divide-black/8">
        {payments.map((payment) => (
          <div key={payment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{payment.purpose}</p>
              <p className="text-carbon-500 mt-1 text-sm">{payment.renter} · {payment.date}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bricolage text-lg font-medium">{payment.amount}</span>
              <StatusPill status={payment.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

function MaintenanceTab({ requests }: { requests: MaintenanceRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <h3 className="font-bricolage text-xl font-medium">No maintenance requests</h3>
        <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Nothing has been reported for this property.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
      <div className="divide-y divide-black/8">
        {requests.map((request) => (
          <div key={request.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-medium">
                {request.title}
                {request.urgency === "Urgent" ? <StatusPill status="Urgent" /> : null}
              </p>
              <p className="text-carbon-500 mt-1 text-sm">
                Reported by {request.reportedBy} · Managed by {request.managedBy ?? "You"}
                {request.scheduledVisit ? ` · ${request.scheduledVisit.contact}` : ""}
              </p>
            </div>
            <StatusPill status={request.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team — who owns this property and who's actively delegated to work on it.
// "Assign Team Member" only ever offers ACTIVE team members (see
// PickTeamMemberDialog above); a registered professional who hasn't joined
// this Owner's team can't be assigned here at all.
// ---------------------------------------------------------------------------

function TeamTab({
  property,
  onPick,
  onInvite,
}: {
  property: NonNullable<ReturnType<typeof getOwnerProperty>>;
  onPick: (role: ProfessionalRole) => void;
  onInvite: () => void;
}) {
  const hasAgentsOnTeam = getActiveMemberships(TEAM_ID).some((m) => m.role === "agent");
  const hasPmsOnTeam = getActiveMemberships(TEAM_ID).some((m) => m.role === "property_manager");

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
        <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Property Owner</h2>
        <div className="mt-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{OWNER.name.slice(0, 1)}</span>
          <div>
            <p className="font-medium">{OWNER.name}</p>
            <p className="text-carbon-500 text-sm">Owner</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Property Manager</h2>
          {property.propertyManager ? (
            <>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{property.propertyManager.name.slice(0, 1)}</span>
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    {property.propertyManager.name}
                    {property.propertyManager.verified ? <BadgeCheck aria-label="Verified" className="size-4 fill-black text-white" /> : null}
                  </p>
                  <StatusPill status="Active" />
                </div>
              </div>
              <p className="text-carbon-400 mt-4 text-xs">Responsibilities</p>
              <p className="text-carbon-600 mt-1 text-sm">{property.propertyManager.responsibilities.join(" · ")}</p>
              <p className="text-carbon-500 mt-3 text-xs">
                Manage Agents: <span className="text-carbon-900 font-medium">{property.propertyManager.canManageAgents ? "Allowed" : "Not allowed"}</span>
              </p>
              <div className="mt-5">
                {property.propertyManager.membershipId ? (
                  <Link
                    href={`/owner-dashboard/team/${property.propertyManager.membershipId}`}
                    className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black"
                  >
                    Manage Access
                  </Link>
                ) : null}
              </div>
            </>
          ) : hasPmsOnTeam ? (
            <>
              <p className="text-carbon-500 mt-4 text-sm">No Property Manager assigned. You are managing this property yourself.</p>
              <button type="button" onClick={() => onPick("property_manager")} className="font-bricolage mt-5 inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white">
                Assign Team Member
              </button>
            </>
          ) : (
            <>
              <p className="text-carbon-500 mt-4 text-sm">No Property Managers are currently on your team.</p>
              <button type="button" onClick={onInvite} className="font-bricolage mt-5 inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white">
                Invite Property Manager
              </button>
            </>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Agent</h2>
          {property.agent ? (
            <>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{property.agent.name.slice(0, 1)}</span>
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    {property.agent.name}
                    {property.agent.verified ? <BadgeCheck aria-label="Verified" className="size-4 fill-black text-white" /> : null}
                  </p>
                  <StatusPill status="Active" />
                </div>
              </div>
              <p className="text-carbon-400 mt-4 text-xs">Responsibilities</p>
              <p className="text-carbon-600 mt-1 text-sm">{property.agent.responsibilities.join(" · ")}</p>
              <p className="text-carbon-400 mt-3 text-xs">
                Assigned by <span className="text-carbon-600 font-medium">{property.agent.assignedBy}</span>
                {property.agent.assignedByProfessionalId ? " · Property Manager" : ""}
              </p>
              <div className="mt-5">
                {property.agent.membershipId ? (
                  <Link
                    href={`/owner-dashboard/team/${property.agent.membershipId}`}
                    className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black"
                  >
                    Manage Access
                  </Link>
                ) : null}
              </div>
            </>
          ) : hasAgentsOnTeam ? (
            <>
              <p className="text-carbon-500 mt-4 text-sm">No Agent is currently assigned to this property.</p>
              <button type="button" onClick={() => onPick("agent")} className="font-bricolage mt-5 inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white">
                Assign Team Member
              </button>
            </>
          ) : (
            <>
              <p className="text-carbon-500 mt-4 text-sm">No Agents are currently on your team.</p>
              <button type="button" onClick={onInvite} className="font-bricolage mt-5 inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white">
                Invite Agent
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
