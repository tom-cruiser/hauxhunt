"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { Check, Eye, FileWarning, KeyRound, Send, X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { ApplicationStatusActions, type StatusActionConfig } from "@/components/partner/application-status-actions";
import { ApplicationStatusTimeline } from "@/components/partner/application-status-timeline";
import { StatusReasonModal } from "@/components/partner/status-reason-modal";
import { TenantHistoryButton } from "@/components/partner/tenant-history-button";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { subscribeToIndependentProperties } from "@/lib/professional-properties";
import {
  decideApplication,
  getApplicationsFor,
  recommendApplicationDecision,
  resolveAnyPropertyLocation,
  resolveAnyPropertyTitle,
  subscribeToProfessionalWork,
  type AgentApplicationView,
} from "@/lib/professional-work";
import { canManageRentalSetupFor, canReviewApplicationsFor, getRentalSetupDraft, subscribeToPmWork } from "@/lib/pm-work";
import { getHistoryFor, logStatusEvent, subscribeToApplicationHistory } from "@/lib/application-history";
import { transitionApplicationStatus } from "@/lib/application-workflow";
import { canTransition } from "@/lib/application-status-machine";
import type { ApplicationStatus } from "@/lib/owner-data";
import emptyIllustration from "@/assets/images/empty.png";

// Property Manager Dashboard phase -- Section 20-27. Applications is
// top-level and real for PM, reusing the exact same merged data source as
// Agent's Applications (getApplicationsFor -- role-agnostic, gated on the
// "Review applications" responsibility rather than a PM-specific dataset).
// What's genuinely different from Agent here is DECISION AUTHORITY: a PM
// with "Review applications" and no Owner-approval requirement can decide
// directly (decideApplication); otherwise -- Owner approval required, or an
// Independent property (Section 26, the deliberately conservative choice) --
// PM can only Recommend, exactly like Agent.

type Filter = "All" | "Under Review" | "Action Required" | "Decision Pending" | "Approved" | "Completed";
const FILTERS: Filter[] = ["All", "Under Review", "Action Required", "Decision Pending", "Approved", "Completed"];

export function PmApplicationsWorkspace() {
  return (
    <Suspense>
      <PmApplicationsWorkspaceInner />
    </Suspense>
  );
}

function PmApplicationsWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);
  useEffect(() => subscribeToApplicationHistory(forceUpdate), []);

  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));
  const professional = useDemoProfessional("property_manager");

  if (!professional) {
    return (
      <DashboardShell initialSection="applications">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const propertyId = searchParams.get("propertyId");
  const allApplications = getApplicationsFor(professional.id);
  const applications = propertyId ? allApplications.filter((a) => a.propertyId === propertyId) : allApplications;
  const visible =
    filter === "All"
      ? applications
      : filter === "Completed"
        ? applications.filter((a) => a.status === "Approved" || a.status === "Not Selected" || a.status === "Completed")
        : applications.filter((a) => a.status === filter);

  const selected = applications.find((a) => a.id === selectedId) ?? visible[0] ?? null;

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/applications${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="applications">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Applications</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Applications for the properties you manage. Where the Property Owner requires their own approval, you recommend and send it to them.
            </p>
            {propertyId ? <PropertyFilterChip propertyId={propertyId} onClear={clearPropertyFilter} /> : null}
          </header>

          <div className="mt-7 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${filter === f ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {f}
              </button>
            ))}
          </div>

          {applications.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
              <h3 className="font-bricolage mt-5 text-xl font-medium">{propertyId ? "No applications for this property yet" : "No applications yet"}</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
                {propertyId ? "Applications for this property will appear here." : "Applications for the properties you manage will appear here."}
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No applications match this filter</h3>
            </div>
          ) : (
            <div className="mt-6 grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
              <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
                {visible.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => setSelectedId(application.id)}
                    className={`block w-full p-5 text-left transition-colors ${selected?.id === application.id ? "bg-black/4.5" : "hover:bg-black/2"}`}
                  >
                    <p className="truncate font-medium">{application.applicant}</p>
                    <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(application.propertyId)}</p>
                    <p className="text-carbon-400 mt-1 text-xs">Move-in {application.moveIn}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <StatusPill status={application.status} />
                      <span className="text-carbon-400 text-xs">{application.submitted}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="min-w-0 p-6 sm:p-8">
                {selected ? <ApplicationDetail key={selected.id} application={selected} professionalId={professional.id} professionalName={professional.name} /> : <p className="text-carbon-500 text-sm">Select an application to view details.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function PropertyFilterChip({ propertyId, onClear }: { propertyId: string; onClear: () => void }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/4.5 py-1.5 pr-1.5 pl-4 text-sm font-medium">
      <span>{resolveAnyPropertyTitle(propertyId)}</span>
      <button type="button" onClick={onClear} aria-label="Clear property filter" className="flex size-6 items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

function ApplicationDetail({ application, professionalId, professionalName }: { application: AgentApplicationView; professionalId: string; professionalName: string }) {
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const isTerminal = application.status === "Approved" || application.status === "Not Selected" || application.status === "Completed";
  // Section 25: existing responsibility model decides authority, never a
  // new one. Independent properties stay Recommend-only -- the deliberately
  // safer Owner-authority interpretation (Section 26).
  const canDecideDirectly = application.source === "TEAM_ASSIGNMENT" && !application.requiresOwnerApproval && canReviewApplicationsFor(professionalId, application.propertyId);
  const canStartRentalSetup = application.source === "TEAM_ASSIGNMENT" && canManageRentalSetupFor(professionalId, application.propertyId);
  const rentalSetupDraft = application.status === "Approved" || application.status === "Completed" ? getRentalSetupDraft(application.id) : undefined;
  const history = getHistoryFor(application.id);

  // Applicant Lifecycle State Machine phase -- the contextual action bar
  // (`application-status-actions.tsx`) replaces the old bare Approve/Not
  // Select buttons, adding the missing manual steps (Start Review, Request
  // Info, Send for Decision) and every rollback, all driven by
  // `application-status-machine.ts`'s transition graph rather than a raw
  // dropdown of all seven statuses.
  const forwardActions: StatusActionConfig[] = [
    { to: "Under Review", label: "Start Review", icon: Eye },
    { to: "Action Required", label: "Request Info", icon: FileWarning },
    { to: "Decision Pending", label: "Send for Decision", icon: Send },
    { to: "Approved", label: "Approve", icon: Check, emphasis: "primary" },
  ];
  // A recommend-only reviewer never reaches Approved/Not Selected through
  // this generic bar -- "recommend" lands on Decision Pending WITH a
  // recommendation attached (the block below, using the existing
  // `recommendApplicationDecision`), never on Approved directly. Hiding
  // both here is what actually enforces that boundary; the pure state
  // machine has no notion of who's allowed to decide.
  const hideForward: ApplicationStatus[] = canDecideDirectly ? [] : ["Approved", "Not Selected"];
  // Rolling "Approved" back to "Under Review" once rental setup has already
  // been sent to the renter would leave that invite pointing at an
  // application that's no longer approved -- block the rollback instead.
  const hideBackward: ApplicationStatus[] = rentalSetupDraft ? ["Under Review"] : [];

  function handleTransition(to: ApplicationStatus, reason?: string) {
    if (!canTransition(application.status, to, "partner")) {
      // The bar only ever offers a legal, correctly-gated move, so this
      // means a real bug rather than user error -- surfaced rather than
      // silently swallowed.
      window.alert(`Cannot move an application from "${application.status}" to "${to}".`);
      return;
    }
    if (canDecideDirectly && (to === "Approved" || to === "Not Selected")) {
      // Keep the existing `decideApplication` call for a direct decision --
      // unlike the generic writer, it also records `recommendedBy` as the
      // deciding professional, an attribution this component already
      // displayed before this change and shouldn't quietly lose.
      decideApplication(application.id, application.source, to, professionalName);
      logStatusEvent({
        applicationId: application.id,
        from: application.status,
        to,
        direction: "forward",
        actor: professionalName,
        actorRole: "Property Manager",
        reason,
      });
      return;
    }
    const result = transitionApplicationStatus(
      application.id,
      application.source,
      application.status,
      to,
      { name: professionalName, role: "Property Manager" },
      reason,
    );
    if (!result.ok) window.alert(result.error);
  }

  function handleRecommend(recommendation: "Approve" | "Not Selected", reason?: string) {
    recommendApplicationDecision(application.id, application.source, recommendation, professionalName, "property_manager");
    logStatusEvent({
      applicationId: application.id,
      from: application.status,
      to: "Decision Pending",
      direction: "forward",
      actor: professionalName,
      actorRole: "Property Manager",
      reason: recommendation === "Not Selected" ? reason : `Recommended: ${recommendation}`,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h2 className="font-bricolage text-xl font-medium">{application.applicant}</h2>
          <p className="text-carbon-500 mt-1 text-sm">
            {resolveAnyPropertyTitle(application.propertyId)} · {resolveAnyPropertyLocation(application.propertyId)}
          </p>
        </div>
        <StatusPill status={application.status} />
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
        {application.assistedBy ? (
          <div>
            <dt className="text-carbon-400 text-xs">Assisted by</dt>
            <dd className="mt-1 font-medium">{application.assistedBy} · {application.assistedByRole}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-carbon-400 text-xs">Reviewed by</dt>
          <dd className="mt-1 font-medium">You</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl bg-black/3 p-4">
        <p className="text-sm leading-6">{application.note}</p>
      </div>

      {application.assistedBy && application.recommendation && application.recommendedBy === application.assistedBy ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Agent Recommendation</p>
          <p className="mt-1 text-sm font-medium">
            {application.assistedBy} — <span className="text-carbon-600 font-normal">Recommend {application.recommendation}</span>
          </p>
        </div>
      ) : null}

      {application.status === "Completed" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Rental Completed</p>
          <p className="text-carbon-600 mt-1.5 text-sm leading-6">
            The lease is signed and the deposit is paid — {application.applicant} is now a tenant.
          </p>
          {rentalSetupDraft?.rentalId ? (
            <Link
              href={`/partner-dashboard/rentals/${rentalSetupDraft.rentalId}`}
              className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              View Rental
            </Link>
          ) : null}
        </div>
      ) : application.status === "Approved" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Application Approved</p>
          {canStartRentalSetup ? (
            rentalSetupDraft ? (
              <>
                <p className="text-carbon-600 mt-1.5 text-sm leading-6">Rental setup has been sent to {application.applicant}.</p>
                <Link
                  href={`/partner-dashboard/rentals${rentalSetupDraft.rentalId ? `/${rentalSetupDraft.rentalId}` : ""}`}
                  className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
                >
                  <KeyRound aria-hidden="true" className="size-4" />
                  View Rental
                </Link>
              </>
            ) : (
              <>
                <p className="text-carbon-600 mt-1.5 text-sm leading-6">You can now begin rental setup for {application.applicant}.</p>
                <Link
                  href={`/partner-dashboard/rentals/setup/${application.id}`}
                  className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
                >
                  <KeyRound aria-hidden="true" className="size-4" />
                  Start Rental Setup
                </Link>
              </>
            )
          ) : application.source === "INDEPENDENT_AUTHORIZATION" ? (
            <p className="text-carbon-600 mt-1.5 text-sm leading-6">Rental setup for independently managed properties isn&apos;t yet available in HauxHunt.</p>
          ) : (
            <p className="text-carbon-600 mt-1.5 text-sm leading-6">Awaiting Owner Rental Setup.</p>
          )}
        </div>
      ) : application.status === "Not Selected" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Not Selected</p>
        </div>
      ) : application.status === "Decision Pending" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Sent for Decision</p>
          <p className="mt-1 text-sm font-medium">
            {application.recommendation ?? "Awaiting Owner decision"} — <span className="text-carbon-600 font-normal">sent to the Property Owner for decision</span>
          </p>
        </div>
      ) : null}

      <ApplicationStatusActions
        status={application.status}
        forwardActions={forwardActions}
        hideForward={hideForward}
        hideBackward={hideBackward}
        onTransition={handleTransition}
      />

      {!canDecideDirectly && !isTerminal && application.status !== "Decision Pending" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleRecommend("Approve")}
            className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
          >
            <Check aria-hidden="true" className="size-4" />
            Recommend Approve
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDecline(true)}
            className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
          >
            <X aria-hidden="true" className="size-4" />
            Recommend Decline
          </button>
          <p className="text-carbon-400 basis-full text-xs">The Property Owner requires their own approval on this application.</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
        <TenantHistoryButton applicantName={application.applicant} feature="agent.tenantHistory" />
      </div>

      <ApplicationStatusTimeline events={history} submittedOn={application.submitted} />

      {confirmingDecline ? (
        <StatusReasonModal
          title="Recommend declining this application?"
          description="This sends your recommendation for a final decision. The applicant isn't notified until a decision is made."
          confirmLabel="Recommend Decline"
          onCancel={() => setConfirmingDecline(false)}
          onConfirm={(reason) => {
            handleRecommend("Not Selected", reason);
            setConfirmingDecline(false);
          }}
        />
      ) : null}
    </div>
  );
}
