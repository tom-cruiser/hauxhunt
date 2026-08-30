"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { Check, CheckCircle2, CircleAlert, ClipboardList, Clock3, KeyRound, MessageSquare, X } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { TenantHistoryButton } from "@/components/partner/tenant-history-button";
import { StatusReasonModal } from "@/components/partner/status-reason-modal";
import { logStatusEvent } from "@/lib/application-history";
import {
  OWNER,
  getOwnerApplications,
  propertyLocation,
  propertyTitle,
  subscribeToOwnerApplications,
  updateOwnerApplication,
  type ApplicationStatus,
  type OwnerApplication,
} from "@/lib/owner-data";
import { getCurrentReviewerFor, getRentalSetupManagerFor, ownerDecidesApplication as ownerDecides } from "@/lib/professional-work";
import { getRentalSetupDraft, subscribeToRentalSetup } from "@/lib/pm-work";
import { getProfessionalByName } from "@/lib/team-data";
import { OWNER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";

// Owner Applications phase. Reuses the exact architecture already built for
// Agent/PM/Renter -- owner-data.ts's OWNER_APPLICATIONS + override store is
// the one shared record every role reads (professional-work.ts's
// getApplicationsFor merges it for Agent/PM; renter-dashboard/applications
// reads it directly, same as here). Nothing here creates a second dataset.
//
// Owner decision authority is derived, never stored: an Owner decides an
// application when either requiresOwnerApproval is true, or nobody with
// "Review applications" responsibility is currently assigned to the
// property (getCurrentReviewerFor, already exported by
// professional-work.ts for the same purpose there). This one rule produces
// all four operating modes from the brief without a new permission model:
// self-managed and Agent-only properties fall to Owner by the second
// clause; PM-managed-with-approval falls to Owner by the first; PM-managed
// with delegated authority falls to neither, so Owner sees oversight only.

type Filter = "All" | "Needs My Decision" | "Under Review" | "Action Required" | "Completed";
const FILTERS: Filter[] = ["All", "Needs My Decision", "Under Review", "Action Required", "Completed"];

function isTerminal(status: ApplicationStatus): boolean {
  return status === "Approved" || status === "Not Selected" || status === "Completed";
}

type Participant = { name: string; role: string; note: string };

// The one place "who's been involved" is computed, reused by both the list
// row's compact context label and the detail page's Application Handling
// section and Timeline, so the three never disagree with each other.
function participantsFor(application: OwnerApplication): Participant[] {
  const list: Participant[] = [];
  if (application.assistedBy) {
    list.push({ name: application.assistedBy, role: application.assistedByRole ?? "Agent", note: "Assisted with application" });
  }
  const reviewer = getCurrentReviewerFor(application.propertyId);
  if (reviewer && !list.some((p) => p.name === reviewer.name)) {
    list.push({ name: reviewer.name, role: reviewer.roleLabel, note: "Reviewed application" });
  }
  // Neither resolved above -- an Agent-only property with no recorded
  // assistedBy, or a PM whose live assignment didn't resolve. Fall back to
  // handledBy rather than implying nobody is involved. If handledBy names
  // the Owner themselves, this is a genuinely self-managed application and
  // there is no professional to show at all.
  if (list.length === 0 && application.handledBy !== OWNER.name) {
    list.push({
      name: application.handledBy,
      role: application.handledByRole,
      note: application.handledByRole === "Property Manager" ? "Reviewed application" : "Assisted with application",
    });
  }
  return list;
}

// Derived entirely from real fields already on the application -- never a
// stored event log. Each line only appears when the fact it states is true.
function timelineFor(application: OwnerApplication): string[] {
  const events: string[] = [`Application submitted — ${application.submitted}`];

  if (application.status !== "Submitted") {
    for (const p of participantsFor(application)) {
      events.push(`${p.name} (${p.role}) ${p.note === "Reviewed application" ? "reviewed this application" : "assisted with this application"}`);
    }
  }

  if (application.recommendation) {
    events.push(`${application.recommendedBy ?? application.handledBy} recommended ${application.recommendation === "Approve" ? "approval" : "not selecting this applicant"}`);
  }

  if (application.status === "Decision Pending" && ownerDecides(application)) {
    events.push("Sent to you for a decision");
  }

  const reviewer = getCurrentReviewerFor(application.propertyId);
  if (application.status === "Approved") {
    events.push(ownerDecides(application) ? "You approved this application" : `${reviewer?.name ?? "Your Property Manager"} approved this application`);
  }
  if (application.status === "Not Selected") {
    events.push(ownerDecides(application) ? "You marked this application as Not Selected" : `${reviewer?.name ?? "Your Property Manager"} marked this application as Not Selected`);
  }
  if (application.status === "Completed") {
    events.push("Lease signed and deposit paid — the rental is now active");
  }

  return events;
}

export default function OwnerApplicationsPage() {
  return (
    <Suspense>
      <OwnerApplicationsPageInner />
    </Suspense>
  );
}

function OwnerApplicationsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const propertyIdParam = searchParams.get("propertyId");

  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToOwnerApplications(forceUpdate), []);
  useEffect(() => subscribeToRentalSetup(forceUpdate), []);

  const [filter, setFilter] = useState<Filter>("All");

  const allApplications = getOwnerApplications();
  const applications = propertyIdParam ? allApplications.filter((a) => a.propertyId === propertyIdParam) : allApplications;

  const visible =
    filter === "All"
      ? applications
      : filter === "Needs My Decision"
        ? applications.filter((a) => !isTerminal(a.status) && ownerDecides(a))
        : filter === "Completed"
          ? applications.filter((a) => isTerminal(a.status))
          : filter === "Under Review"
            ? applications.filter((a) => a.status === "Under Review" || a.status === "Decision Pending")
          : applications.filter((a) => a.status === filter);

  const [selectedId, setSelectedId] = useState<string | null>(openParam ?? applications[0]?.id ?? null);
  const selected = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null;

  const needsDecisionCount = applications.filter((a) => !isTerminal(a.status) && ownerDecides(a)).length;
  const underReviewCount = applications.filter((a) => a.status === "Under Review" || a.status === "Decision Pending").length;
  const actionRequiredCount = applications.filter((a) => a.status === "Action Required").length;
  const completedCount = applications.filter((a) => isTerminal(a.status)).length;
  const filterCounts: Record<Filter, number> = {
    All: applications.length,
    "Needs My Decision": needsDecisionCount,
    "Under Review": underReviewCount,
    "Action Required": actionRequiredCount,
    Completed: completedCount,
  };

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/owner-dashboard/applications${query ? `?${query}` : ""}`);
  }

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Applications</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Review applications across your portfolio, see who is handling each one, and act only when a final owner decision is required.
            </p>
            {propertyIdParam ? <PropertyFilterChip propertyId={propertyIdParam} onClear={clearPropertyFilter} /> : null}
          </header>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ApplicationSummaryCard icon={ClipboardList} label="Total applications" value={applications.length} note="Across your portfolio" />
            <ApplicationSummaryCard icon={CircleAlert} label="Needs my decision" value={needsDecisionCount} note={needsDecisionCount ? "Action required" : "Nothing waiting"} emphasized={needsDecisionCount > 0} />
            <ApplicationSummaryCard icon={Clock3} label="In review" value={underReviewCount} note="With you or your team" />
            <ApplicationSummaryCard icon={CheckCircle2} label="Completed" value={completedCount} note="Approved or not selected" />
          </div>

          <div className="mt-7 flex flex-wrap gap-2 border-b border-black/10">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`relative h-11 px-1 text-sm font-medium transition-colors ${filter === f ? "text-black" : "text-black/45 hover:text-black"}`}
              >
                {f} <span className="ml-1 text-xs opacity-55">{filterCounts[f]}</span>
                {filter === f ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" /> : null}
              </button>
            ))}
          </div>

          {applications.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">{propertyIdParam ? "No applications for this property yet" : "No applications yet"}</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
                {propertyIdParam ? "Applications for this property will appear here." : "Applications for your properties will appear here."}
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No applications match this filter</h3>
            </div>
          ) : (
            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
              <div className="space-y-3 lg:max-h-[75vh] lg:overflow-y-auto lg:pr-1">
                {visible.map((application) => (
                  <ApplicationRow
                    key={application.id}
                    application={application}
                    active={selected?.id === application.id}
                    onSelect={() => setSelectedId(application.id)}
                  />
                ))}
              </div>

              <div className="min-w-0 rounded-[1.5rem] bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.055)] sm:p-8 lg:sticky lg:top-24">
                {selected ? <ApplicationDetail key={selected.id} application={selected} /> : <p className="text-carbon-500 text-sm">Select an application to view details.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

function PropertyFilterChip({ propertyId, onClear }: { propertyId: string; onClear: () => void }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/4.5 py-1.5 pr-1.5 pl-4 text-sm font-medium">
      <span>{propertyTitle(propertyId)}</span>
      <button type="button" onClick={onClear} aria-label="Clear property filter" className="flex size-6 items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

function ApplicationRow({ application, active, onSelect }: { application: OwnerApplication; active: boolean; onSelect: () => void }) {
  const needsDecision = !isTerminal(application.status) && ownerDecides(application);
  const participants = participantsFor(application);
  const contextLabel =
    participants.length === 0
      ? "Self-managed"
      : participants.length === 1
        ? `${participants[0].name} · ${participants[0].role}`
        : participants.map((p) => p.name.split(" ")[0]).join(" + ");

  return (
    <button type="button" onClick={onSelect} className={`block w-full rounded-2xl border p-5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.035)] transition-all ${active ? "border-black bg-white ring-1 ring-black" : "border-black/8 bg-white hover:border-black/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{application.applicant}</p>
          <p className="text-carbon-500 mt-1 truncate text-sm">{propertyTitle(application.propertyId)}</p>
        </div>
        {needsDecision ? <span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-[10px] font-medium text-white">Your decision</span> : null}
      </div>
      <p className="text-carbon-400 mt-2 truncate text-xs">{contextLabel}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusPill status={application.status} />
        <span className="text-carbon-400 text-xs">{application.submitted}</span>
      </div>
    </button>
  );
}

function ApplicationSummaryCard({
  icon: Icon,
  label,
  value,
  note,
  emphasized = false,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  note: string;
  emphasized?: boolean;
}) {
  return (
    <article className={`rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.045)] ${emphasized ? "bg-black text-white" : "bg-white text-black"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={emphasized ? "text-xs text-white/60" : "text-carbon-500 text-xs"}>{label}</p>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <p className="font-bricolage mt-4 text-3xl font-medium tabular-nums">{value}</p>
      <p className={emphasized ? "mt-1 text-xs text-white/55" : "text-carbon-500 mt-1 text-xs"}>{note}</p>
    </article>
  );
}

function ApplicationDetail({ application }: { application: OwnerApplication }) {
  const [confirmingNotSelect, setConfirmingNotSelect] = useState(false);

  const terminal = isTerminal(application.status);
  const decides = ownerDecides(application);
  const reviewer = getCurrentReviewerFor(application.propertyId);
  const participants = participantsFor(application);
  const timeline = timelineFor(application);
  const selfManaged = application.handledBy === OWNER.name;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h2 className="font-bricolage text-xl font-medium">{application.applicant}</h2>
          <p className="text-carbon-500 mt-1 text-sm">
            {propertyTitle(application.propertyId)} · {propertyLocation(application.propertyId)}
          </p>
        </div>
        <StatusPill status={application.status} />
      </div>

      {/* Application Handling -- who's been involved, before anything else. */}
      <div className="mt-6">
        <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Application Handling</p>
        {participants.length === 0 ? (
          <p className="mt-2 text-sm">
            <span className="font-medium">Managed by</span> <span className="text-carbon-600">You</span>
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {participants.map((p) => (
              <div key={`${p.name}-${p.role}`} className="flex items-center justify-between gap-3 rounded-xl bg-black/3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-carbon-500 text-xs">{p.role}</p>
                </div>
                <p className="text-carbon-500 shrink-0 text-xs">{p.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-carbon-400 text-xs">Submitted</dt>
          <dd className="mt-1 font-medium">{application.submitted}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Proposed rent</dt>
          <dd className="mt-1 font-medium">{application.proposedRent}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Move-in</dt>
          <dd className="mt-1 font-medium">{application.moveIn}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl bg-black/3 p-4">
        <p className="text-sm leading-6">{application.note}</p>
      </div>

      {/* Recommendation (advisory) and Your Decision (final), visually separate. */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-black/10">
        {application.recommendation ? (
          <div className="border-b border-black/10 p-4">
            <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">
              {application.recommendedBy && application.recommendedBy === application.assistedBy ? "Agent Recommendation" : "Property Manager Recommendation"}
            </p>
            <p className="mt-1 text-sm font-medium">
              Recommend {application.recommendation}
              <span className="text-carbon-600 font-normal"> — by {application.recommendedBy ?? application.handledBy}</span>
            </p>
          </div>
        ) : null}

        <div className="p-4 sm:p-5">
          <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Your Decision</p>
          {terminal ? (
            <p className="mt-1 text-sm font-medium">
              {application.status}
              <span className="text-carbon-600 font-normal"> · decided by {decides ? "you" : reviewer ? `${reviewer.name} · ${reviewer.roleLabel}` : "your Property Manager"}</span>
            </p>
          ) : decides ? (
            <>
              <p className="text-carbon-600 mt-1 text-sm">Needs Your Decision</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateOwnerApplication(application.id, { status: "Approved" });
                    logStatusEvent({ applicationId: application.id, from: application.status, to: "Approved", direction: "forward", actor: "You", actorRole: "Owner" });
                  }}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  <Check aria-hidden="true" className="size-4" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingNotSelect(true)}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                >
                  <X aria-hidden="true" className="size-4" />
                  Not Select
                </button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm font-medium">
              Decision delegated
              <span className="text-carbon-600 mt-1 block text-sm font-normal">
                {reviewer ? `${reviewer.name} · ${reviewer.roleLabel} will make the final decision.` : "Your Property Manager will make the final decision."}
              </span>
            </p>
          )}
        </div>
      </section>

      <RentalSetupSection application={application} />

      <div className="mt-6">
        <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Timeline</p>
        <ul className="mt-3 space-y-2.5">
          {timeline.map((event, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-black/30" />
              <span className="text-carbon-600">{event}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
        <Link
          href={`/owner-dashboard/properties/${application.propertyId}`}
          className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
        >
          View Property
        </Link>
        <TenantHistoryButton applicantName={application.applicant} feature="owner.tenantHistory" />
        {!selfManaged
          ? (() => {
              // Messages Synchronization phase -- Section 39: this messages
              // the handling professional (handledBy), matching this
              // screen's existing intent -- not the applicant. handledBy is
              // only ever a name here, so it's resolved once, at this call
              // site, into the professional's real id; the conversation
              // itself is addressed by that id from then on.
              const handler = getProfessionalByName(application.handledBy);
              if (!handler) return null;
              const conversation = getOrCreateConversation(OWNER_PARTICIPANT_ID, handler.id, {
                type: "application",
                propertyId: application.propertyId,
                applicationId: application.id,
                label: "Application",
              });
              if (!conversation) return null;
              return (
                <Link
                  href={`/owner-dashboard/messages?open=${conversation.id}`}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                >
                  <MessageSquare aria-hidden="true" className="size-4" />
                  Message {handler.name}
                </Link>
              );
            })()
          : null}
      </div>

      {confirmingNotSelect ? (
        <StatusReasonModal
          title="Not select this application?"
          description={`${application.applicant} will see that their application was not selected.`}
          confirmLabel="Not Select"
          onCancel={() => setConfirmingNotSelect(false)}
          onConfirm={(reason) => {
            updateOwnerApplication(application.id, { status: "Not Selected" });
            logStatusEvent({ applicationId: application.id, from: application.status, to: "Not Selected", direction: "forward", actor: "You", actorRole: "Owner", reason });
            setConfirmingNotSelect(false);
          }}
        />
      ) : null}
    </div>
  );
}

// Approved applications only -- Not Selected never reaches this component
// (RentalSetupSection returns null for any non-Approved status), so a
// declined applicant can never show a rental-setup state or CTA.
// Owner Rental Setup Continuity phase -- Section 6/24/29: getRentalSetupManagerFor
// used to resolve a PM with "Manage rental setup" so Owner could stay
// oversight-only and defer to them. Rentals was since removed as a
// partner-dashboard surface entirely, so that function always returns null
// now -- meaning `manager` below is always null and the Owner always gets
// the real Start/Continue Rental Setup entry point, unconditionally.
function RentalSetupSection({ application }: { application: OwnerApplication }) {
  if (application.status !== "Approved") return null;

  const draft = getRentalSetupDraft(application.id);
  const manager = getRentalSetupManagerFor(application.propertyId);
  const setupHref = `/owner-dashboard/applications/${application.id}/rental-setup`;

  return (
    <section className="mt-6 rounded-2xl bg-black/3 p-4 sm:p-5">
      <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Rental Setup</p>

      {manager ? (
        // PM responsible -- oversight only, no matter the draft's status.
        !draft ? (
          <p className="mt-1 text-sm leading-6">Approved. Rental setup can now be prepared by {manager.name} · {manager.roleLabel}.</p>
        ) : draft.status === "Completed" && draft.rentalId ? (
          <>
            <p className="mt-1 text-sm font-medium">Rental Setup Completed</p>
            <RentalSetupViewLink rentalId={draft.rentalId} />
          </>
        ) : draft.status === "Sent to Renter" ? (
          <>
            <p className="mt-1 text-sm font-medium">Rental Setup Sent</p>
            <p className="text-carbon-600 mt-1 text-sm">Awaiting {application.applicant} to complete it.</p>
            {draft.rentalId ? <RentalSetupViewLink rentalId={draft.rentalId} /> : null}
          </>
        ) : draft.status === "Cancelled" ? (
          <p className="mt-1 text-sm font-medium">Rental setup was declined by {application.applicant}.</p>
        ) : (
          <p className="mt-1 text-sm font-medium">Rental setup is being prepared by {manager.name} · {manager.roleLabel}.</p>
        )
      ) : !draft ? (
        <>
          <p className="mt-1 text-sm leading-6">Approved. You manage this property directly.</p>
          <Link
            href={setupHref}
            className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Start Rental Setup
          </Link>
        </>
      ) : draft.status === "Draft" ? (
        <>
          <p className="mt-1 text-sm leading-6">Rental setup started but not sent yet.</p>
          <Link
            href={setupHref}
            className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Continue Rental Setup
          </Link>
        </>
      ) : draft.status === "Cancelled" ? (
        <>
          <p className="mt-1 text-sm leading-6">Rental setup was declined by {application.applicant}.</p>
          <Link
            href={setupHref}
            className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Continue Rental Setup
          </Link>
        </>
      ) : draft.status === "Sent to Renter" ? (
        <>
          <p className="mt-1 text-sm font-medium">Rental Setup Sent</p>
          <p className="text-carbon-600 mt-1 text-sm">Awaiting {application.applicant} to complete it.</p>
          {draft.rentalId ? <RentalSetupViewLink rentalId={draft.rentalId} /> : null}
        </>
      ) : draft.status === "Completed" && draft.rentalId ? (
        <>
          <p className="mt-1 text-sm font-medium">Rental Setup Completed</p>
          <RentalSetupViewLink rentalId={draft.rentalId} />
        </>
      ) : null}
    </section>
  );
}

function RentalSetupViewLink({ rentalId }: { rentalId: string }) {
  return (
    <Link
      href={`/owner-dashboard/rentals?open=${rentalId}`}
      className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
    >
      <KeyRound aria-hidden="true" className="size-4" />
      View Rental
    </Link>
  );
}

