"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { Bath, BadgeCheck, BedDouble, ChevronLeft, Expand, FileText, MapPin } from "lucide-react";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { LockedFeature } from "@/components/tier/locked-feature";
import { BoostListingButton } from "@/components/tier/boost-listing-button";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import {
  canManageListingFor,
  getPropertyAccessDetail,
  saveListingForProperty,
  setAuthorizationStatus,
  subscribeToIndependentProperties,
  type AuthorizationStatus,
  type ProfessionalPropertyCard,
} from "@/lib/professional-properties";
import { getApplicationsFor, getEnquiriesFor, getViewingsFor, subscribeToProfessionalWork } from "@/lib/professional-work";
import {
  canHandleMaintenanceFor,
  canManageEnquiriesFor,
  canReviewApplicationsFor,
  canTrackPaymentsFor,
  getMaintenanceForProperty,
  getPaymentsForProperty,
  subscribeToPmWork,
} from "@/lib/pm-work";

// Phase 3 -- a professional's own view of ONE property, from whichever
// authority source granted them access. Deliberately shows less than the
// Owner's Property Detail (owner-dashboard/properties/[id]/page.tsx) --
// this is what the professional themself needs (their own access, their
// own authorization state), not the Owner's full oversight surface.
//
// Foundation Cleanup phase: adds the Listing section (Section 29) --
// resolved via professional-properties.ts's getListingForProperty, which
// reads owner-data.ts's OWNER_LISTINGS for Pacifique's own properties
// rather than a second copy, and never PORTFOLIO_LISTINGS. Listing
// management actions are gated by canManageListingFor -- "Manage listing"
// responsibility for Team-assigned properties, Verified authorization for
// independent ones.

export default function PartnerPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const partnerRole = usePartnerRole();
  const role = partnerRole === "agent" ? "agent" : "property_manager";
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const professional = useDemoProfessional(role);
  const card = professional ? getPropertyAccessDetail(professional.id, params.id) : null;

  if (!professional || !card) return notFound();

  // Property Manager Dashboard phase -- Section 16: responsibility-based
  // progressive disclosure. A PM only sees Leasing Activity if they hold a
  // leasing responsibility on THIS property, and Rental Operations only if
  // they hold a rental-operations responsibility -- never every section for
  // every PM. Agent's condition (unconditional) is unchanged.
  const showLeasing = role === "agent" || canManageEnquiriesFor(professional.id, card.propertyId) || canReviewApplicationsFor(professional.id, card.propertyId);
  const showRentalOps =
    role === "property_manager" &&
    (canTrackPaymentsFor(professional.id, card.propertyId) || canHandleMaintenanceFor(professional.id, card.propertyId));

  return (
    <DashboardShell initialSection="properties">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-300">
          <Link href="/partner-dashboard/properties" className="text-carbon-500 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
            <ChevronLeft className="size-4" />
            {role === "agent" ? "My Properties" : "Managed Properties"}
          </Link>

          <header className="mt-4 flex flex-col gap-6 border-b border-black/10 pb-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
                <Image src={card.image} alt="" fill className="object-cover" />
              </span>
              <div>
                <h1 className="font-bricolage text-carbon-900 text-2xl font-medium">{card.title}</h1>
                <p className="text-carbon-500 mt-2 flex items-center gap-1.5 text-sm">
                  <MapPin aria-hidden="true" className="size-4" />
                  {card.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="bg-black/4.5 rounded-full px-3 py-1 text-xs font-medium">
                    {card.source === "TEAM_ASSIGNMENT" ? "Team Assigned" : card.role === "agent" ? "Independent Representation" : "Independent Management"}
                  </span>
                  {card.source === "INDEPENDENT_AUTHORIZATION" ? <StatusPill status={card.authorizationStatus ?? "Under Review"} /> : <StatusPill status="Active" />}
                </div>
              </div>
            </div>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <div className="space-y-6">
              <PropertyInfoSection card={card} />
              <ListingSection card={card} />
              {showLeasing ? <LeasingActivitySection propertyId={card.propertyId} professionalId={professional.id} /> : null}
              {showRentalOps ? <RentalOperationsSection propertyId={card.propertyId} professionalId={professional.id} /> : null}
              {card.source === "INDEPENDENT_AUTHORIZATION" ? <AuthorizationSection card={card} /> : null}
            </div>
            <aside>
              <PropertyAccessSection card={card} />
            </aside>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function PropertyInfoSection({ card }: { card: ProfessionalPropertyCard }) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Property information</h2>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {card.units ? <Fact label="Units" value={String(card.units)} /> : null}
        <Fact icon={BedDouble} label="Bedrooms" value={String(card.bedrooms)} />
        <Fact icon={Bath} label="Bathrooms" value={String(card.bathrooms)} />
        <Fact icon={Expand} label="Size" value={`${card.size} m²`} />
      </dl>
      {card.responsibilities && card.responsibilities.length > 0 ? (
        <div className="mt-5 border-t border-black/8 pt-5">
          <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Your responsibilities</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.responsibilities.map((r) => (
              <span key={r} className="bg-black/4.5 rounded-full px-2.5 py-1 text-xs">
                {r}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
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

// Agent Dashboard Redesign phase -- Section 16-18. A compact summary of
// this property's leasing lifecycle (Enquiries, Viewings, Applications),
// scoped to this propertyId only, with links to the real filtered
// workspaces rather than duplicating their detail here.
function LeasingActivitySection({ propertyId, professionalId }: { propertyId: string; professionalId: string }) {
  const enquiries = getEnquiriesFor(professionalId).filter((e) => e.propertyId === propertyId);
  const viewings = getViewingsFor(professionalId).filter((v) => v.propertyId === propertyId);
  const applications = getApplicationsFor(professionalId).filter((a) => a.propertyId === propertyId);

  const openEnquiries = enquiries.filter((e) => e.status !== "Closed").length;
  const upcomingViewings = viewings.filter((v) => v.status === "Confirmed" || v.status === "Awaiting Confirmation" || v.status === "New Time Suggested" || v.status === "Reschedule Requested").length;
  const activeApplications = applications.filter((a) => a.status !== "Approved" && a.status !== "Not Selected").length;

  const hasActivity = enquiries.length > 0 || viewings.length > 0 || applications.length > 0;

  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Leasing Activity</h2>
      {!hasActivity ? (
        <p className="text-carbon-500 mt-3 text-sm">No enquiries, viewings, or applications yet for this property.</p>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-4">
          <LeasingStat label="Enquiries" value={openEnquiries} href={`/partner-dashboard/enquiries?propertyId=${encodeURIComponent(propertyId)}`} />
          <LeasingStat label="Upcoming Viewings" value={upcomingViewings} href={`/partner-dashboard/enquiries?view=calendar&propertyId=${encodeURIComponent(propertyId)}`} />
          <LeasingStat label="Applications" value={activeApplications} href={`/partner-dashboard/applications?propertyId=${encodeURIComponent(propertyId)}`} />
        </div>
      )}
    </section>
  );
}

function LeasingStat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block rounded-xl bg-black/3 p-4 transition-colors hover:bg-black/5">
      <p className="font-bricolage text-2xl font-medium">{value}</p>
      <p className="text-carbon-500 mt-1 text-xs">{label}</p>
    </Link>
  );
}

// Property Manager Dashboard phase -- Section 14/91 "Rental Operations":
// Payments, Maintenance for THIS property, scoped/gated by the same
// pm-work.ts responsibility checks used for the top-level PM pages -- never
// a second permission system. Links carry ?propertyId= into the real
// top-level workspaces (Section 71), same pattern as Leasing Activity above.
// Rentals was dropped from this section -- rental tracking is an Owner-side
// task now (see dashboard-shell.tsx).
function RentalOperationsSection({ propertyId, professionalId }: { propertyId: string; professionalId: string }) {
  const showPayments = canTrackPaymentsFor(professionalId, propertyId);
  const showMaintenance = canHandleMaintenanceFor(professionalId, propertyId);

  const paymentsDue = showPayments ? getPaymentsForProperty(professionalId, propertyId).filter((p) => p.status === "Due" || p.status === "Pending" || p.status === "Overdue").length : 0;
  const openMaintenance = showMaintenance ? getMaintenanceForProperty(professionalId, propertyId).filter((m) => m.status !== "Resolved" && m.status !== "Cancelled").length : 0;

  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Rental Operations</h2>
      <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${[showPayments, showMaintenance].filter(Boolean).length}, minmax(0, 1fr))` }}>
        {showPayments ? <LeasingStat label="Payments Due" value={paymentsDue} href={`/partner-dashboard/payments?propertyId=${encodeURIComponent(propertyId)}`} /> : null}
        {showMaintenance ? <LeasingStat label="Open Maintenance" value={openMaintenance} href={`/partner-dashboard/maintenance?propertyId=${encodeURIComponent(propertyId)}`} /> : null}
      </div>
    </section>
  );
}

// Section 29/56 -- the public advertisement, kept separate from
// Authorization status (Section 17/22) and shown for BOTH authority
// sources. "No Listing" is a normal state, not an error, and never
// confused with "no property" (the property above still fully exists).
function ListingSection({ card }: { card: ProfessionalPropertyCard }) {
  const tier = useTier();
  const [viewOpen, setViewOpen] = useState(false);
  const listing = card.listing && card.listing.status !== "Not Listed" ? card.listing : null;
  const canManage = canManageListingFor(card);
  const isIndependent = card.source === "INDEPENDENT_AUTHORIZATION";
  const gatedByAuthorization = isIndependent && card.authorizationStatus !== "Verified";
  const editHref = `/partner-dashboard/properties/${card.propertyId}/listing/new`;

  function republish() {
    if (!listing) return;
    saveListingForProperty(
      card.propertyId,
      { title: listing.title, description: listing.description, rent: listing.rent, availableFrom: listing.availableFrom, amenities: listing.amenities },
      "Draft",
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Listing</h2>
        <div className="flex items-center gap-2">
          {listing ? <StatusPill status={listing.status} /> : null}
          {listing?.status === "Live" ? (
            isPaidTier(tier) ? (
              <BadgeCheck aria-label="Verified listing" className="size-5 fill-black text-white" />
            ) : (
              <LockedFeature feature="agent.verifiedBadge" variant="badge" label="Verified listing" />
            )
          ) : null}
        </div>
      </div>

      {gatedByAuthorization ? (
        <p className="text-carbon-600 mt-3 max-w-md text-sm leading-6">
          {card.authorizationStatus === "Under Review"
            ? "You can prepare property information while your authorization is being reviewed. Publishing will become available after your authorization is verified."
            : "Listing publication is on hold until your authorization is verified."}
        </p>
      ) : null}

      {!listing ? (
        <>
          <p className="text-carbon-500 mt-3 text-sm">No listing created yet.</p>
          {canManage && !gatedByAuthorization ? (
            <Link href={editHref} className="font-bricolage mt-4 inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white">
              Create Listing
            </Link>
          ) : !canManage ? (
            <ManagedByNote card={card} />
          ) : null}
        </>
      ) : (
        <>
          <p className="text-carbon-500 mt-3 text-sm">
            {listing.status === "Draft" ? `Draft${listing.updatedAt ? ` · Last edited ${listing.updatedAt}` : ""}` : null}
            {listing.status === "In Review" ? "Your listing has been submitted for HauxHunt review. We'll update its status here once the review is complete." : null}
            {listing.status === "Live" ? "Published on HauxHunt." : null}
            {listing.status === "Archived" ? "Archived." : null}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {listing.status === "In Review" ? (
              <button type="button" onClick={() => setViewOpen((v) => !v)} className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black">
                View Listing
              </button>
            ) : canManage ? (
              <>
                {listing.status === "Live" ? (
                  <>
                    <button type="button" onClick={() => setViewOpen((v) => !v)} className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black">
                      View Public Listing
                    </button>
                    <BoostListingButton feature="agent.propertyBoost" />
                  </>
                ) : (
                  <button type="button" onClick={() => setViewOpen((v) => !v)} className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black">
                    View Listing
                  </button>
                )}
                {listing.status === "Draft" ? (
                  <Link href={editHref} className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white">
                    Continue Editing
                  </Link>
                ) : listing.status === "Live" ? (
                  <Link href={editHref} className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white">
                    Edit Listing
                  </Link>
                ) : listing.status === "Archived" ? (
                  <button type="button" onClick={republish} className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white">
                    Republish
                  </button>
                ) : null}
              </>
            ) : (
              <button type="button" onClick={() => setViewOpen((v) => !v)} className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black">
                View Listing
              </button>
            )}
          </div>

          {!canManage && listing.status !== "In Review" ? <ManagedByNote card={card} /> : null}

          {viewOpen ? (
            <div className="mt-4 rounded-xl bg-black/3 p-4 text-sm">
              <p className="font-medium">{listing.title || card.title}</p>
              {listing.rent ? <p className="text-carbon-600 mt-1">{listing.rent}</p> : null}
              {listing.description ? <p className="text-carbon-600 mt-2 leading-6">{listing.description}</p> : <p className="text-carbon-400 mt-2 italic">No description added yet.</p>}
              {listing.amenities.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {listing.amenities.map((a) => (
                    <span key={a} className="bg-black/4.5 rounded-full px-2.5 py-1 text-xs">
                      {a}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

// Section 19/30 -- "prefer hiding actions the professional cannot perform
// and explaining ownership when useful" rather than a disabled button.
function ManagedByNote({ card }: { card: ProfessionalPropertyCard }) {
  return (
    <p className="text-carbon-500 mt-3 text-sm leading-6">
      {card.source === "TEAM_ASSIGNMENT" ? (
        <>
          Managed by <span className="text-carbon-900 font-medium">{card.propertyOwnerName}</span>. You can view this listing, but you do not have permission to manage it.
        </>
      ) : (
        <>Listing managed by another authorized professional on this property.</>
      )}
    </p>
  );
}

// Section 38 -- WHY this professional has access to this property. The two
// authority sources render genuinely different information; they are never
// merged into one generic block.
function PropertyAccessSection({ card }: { card: ProfessionalPropertyCard }) {
  const roleLabel = card.role === "agent" ? "Agent" : "Property Manager";
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Property Access</h2>
      {card.source === "TEAM_ASSIGNMENT" ? (
        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-carbon-400 text-xs">Authority</dt>
            <dd className="mt-1 font-medium">Team Assignment</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Team</dt>
            <dd className="mt-1 font-medium">{card.teamName}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Property Owner</dt>
            <dd className="mt-1 font-medium">{card.propertyOwnerName}</dd>
          </div>
          {card.assignedBy ? (
            <div>
              <dt className="text-carbon-400 text-xs">Assigned by</dt>
              <dd className="mt-1 font-medium">{card.assignedBy}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-carbon-400 text-xs">Your Role</dt>
            <dd className="mt-1 font-medium">{roleLabel}</dd>
          </div>
        </dl>
      ) : (
        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-carbon-400 text-xs">Authority</dt>
            <dd className="mt-1 font-medium">Independent Owner Authorization</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Property Owner</dt>
            <dd className="mt-1 font-medium">{card.ownerName}</dd>
            <dd className="text-carbon-500 mt-0.5 text-xs">HauxHunt account: Not connected</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Represented by</dt>
            <dd className="mt-1 font-medium">You</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Your Role</dt>
            <dd className="mt-1 font-medium">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Authorization</dt>
            <dd className="mt-1"><StatusPill status={card.authorizationStatus ?? "Under Review"} /></dd>
          </div>
        </dl>
      )}
    </section>
  );
}

const STATUS_COPY: Record<AuthorizationStatus, { title: string; body: string }> = {
  "Under Review": { title: "Authorization Under Review", body: "HauxHunt is reviewing your authorization to represent this property." },
  Verified: { title: "Authorization Verified", body: "Your authorization to represent this property has been verified." },
  "Needs Attention": { title: "Authorization Needs Attention", body: "We need additional information before we can verify your authorization." },
  Rejected: { title: "Authorization Rejected", body: "We couldn't verify your authorization for this property." },
};

function AuthorizationSection({ card }: { card: ProfessionalPropertyCard }) {
  const status = card.authorizationStatus ?? "Under Review";
  const copy = STATUS_COPY[status];
  const [showDetail, setShowDetail] = useState(false);

  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">{copy.title}</h2>
          <p className="text-carbon-600 mt-2 max-w-lg text-sm leading-6">{copy.body}</p>
        </div>
        <StatusPill status={status} />
      </div>

      {status === "Needs Attention" || status === "Rejected" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowDetail((v) => !v)} className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black">
            {status === "Rejected" ? "View Details" : "Review Request"}
          </button>
          {status === "Rejected" ? (
            <Link href="/partner-dashboard/properties/new" className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white">
              Resubmit
            </Link>
          ) : null}
        </div>
      ) : null}
      {showDetail ? (
        <p className="text-carbon-500 mt-3 rounded-xl bg-black/3 p-3.5 text-sm leading-6">
          {status === "Rejected"
            ? "The document you submitted didn't clearly show authorization from the property owner for this specific property. You're welcome to submit a new authorization with updated proof."
            : "Please confirm the property owner's phone number matches the number shown on your proof document, then check back — no changes are needed from you beyond that for now."}
        </p>
      ) : null}

      <div className="mt-6 border-t border-black/8 pt-5">
        <p className="text-carbon-400 flex items-center gap-2 text-xs">
          <FileText aria-hidden="true" className="size-3.5" />
          {card.proofDocumentName}
        </p>
      </div>

      <DemoStatusControl authorizationId={card.authorizationId} current={status} />
    </section>
  );
}

// Section 49 -- discreet, prototype-only. Lets you preview every
// Authorization state without a real review engine. Deliberately styled as
// a muted, clearly-labeled strip, not a developer panel.
function DemoStatusControl({ authorizationId, current }: { authorizationId?: string; current: AuthorizationStatus }) {
  if (!authorizationId) return null;
  const statuses: AuthorizationStatus[] = ["Under Review", "Verified", "Needs Attention", "Rejected"];
  return (
    <div className="mt-6 rounded-xl border border-dashed border-black/15 p-3.5">
      <p className="text-carbon-400 text-[11px] font-medium tracking-wide uppercase">Preview authorization status (prototype)</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setAuthorizationStatus(authorizationId, s)}
            className={`h-7 rounded-full px-2.5 text-[11px] font-medium transition-colors ${s === current ? "bg-black text-white" : "bg-black/4.5 text-black/55 hover:text-black"}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
