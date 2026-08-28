"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { Check, X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { TenantHistoryButton } from "@/components/partner/tenant-history-button";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { subscribeToIndependentProperties } from "@/lib/professional-properties";
import {
  getApplicationsFor,
  recommendApplicationDecision,
  resolveAnyPropertyLocation,
  resolveAnyPropertyTitle,
  subscribeToProfessionalWork,
  type AgentApplicationView,
} from "@/lib/professional-work";
import emptyIllustration from "@/assets/images/empty.png";

// Agent Dashboard Redesign phase -- Applications, previously a placeholder,
// is now real (P0, Section 30). Team-assigned applications are the actual
// owner-data.ts records (never a second architecture); Independent ones are
// professional-work.ts's small new dataset. Agent authority is assist-only
// throughout: Recommend Approve / Recommend Not Selected, never a final
// decision, and never any control once Approved (Section 34-38).
//
// Agent UX cleanup phase -- an optional `propertyId` query param (never a
// title string) scopes the list to one property, arriving from Property
// Detail's Leasing Activity links. It composes with the status filter: both
// narrow the same underlying list, applied in sequence.

type Filter = "All" | "Under Review" | "Action Required" | "Decision Pending" | "Completed";
const FILTERS: Filter[] = ["All", "Under Review", "Action Required", "Decision Pending", "Completed"];

export function AgentApplicationsWorkspace() {
  return (
    <Suspense>
      <AgentApplicationsWorkspaceInner />
    </Suspense>
  );
}

function AgentApplicationsWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);

  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));
  const professional = useDemoProfessional("agent");

  if (!professional) {
    return (
      <DashboardShell initialSection="applications">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  // Property scope comes from propertyId alone -- never resolved or
  // compared by title string. It composes with the status filter below:
  // both are applied to the same underlying list, in sequence.
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
              Applications for the properties you represent. You assist and recommend — the Property Owner or Manager makes the final decision.
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
                {propertyId ? "Applications for this property will appear here." : "Applications for properties you're helping lease will appear here."}
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
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <StatusPill status={application.status} />
                      <span className="text-carbon-400 text-xs">{application.submitted}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="min-w-0 p-6 sm:p-8">{selected ? <ApplicationDetail key={selected.id} application={selected} agentName={professional.name} /> : <p className="text-carbon-500 text-sm">Select an application to view details.</p>}</div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

// A visible, dismissible chip naming the scoped property (resolved from
// propertyId, never a title string carried in the URL itself). Clearing it
// drops only the propertyId param -- the status filter is local component
// state, unaffected either way, and any `open` param is left untouched.
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

function ApplicationDetail({ application, agentName }: { application: AgentApplicationView; agentName: string }) {
  const isTerminal = application.status === "Approved" || application.status === "Not Selected" || application.status === "Completed";

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
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-carbon-400 text-xs">Handled by</dt>
          <dd className="mt-1 font-medium">You</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl bg-black/3 p-4">
        <p className="text-sm leading-6">{application.note}</p>
      </div>

      {application.status === "Completed" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Rental Completed</p>
          <p className="text-carbon-600 mt-1.5 text-sm leading-6">
            The lease is signed and the deposit is paid — {application.applicant} is now a tenant.
          </p>
        </div>
      ) : application.status === "Approved" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Application Approved</p>
          <p className="text-carbon-600 mt-1.5 text-sm leading-6">
            Your work on this application is complete. Rental setup will continue with the Property Owner{application.source === "TEAM_ASSIGNMENT" ? " / Property Manager" : ""}.
          </p>
        </div>
      ) : application.status === "Not Selected" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Not Selected</p>
        </div>
      ) : application.status === "Decision Pending" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">{application.recommendation ? "Recommendation" : "Sent for Decision"}</p>
          <p className="mt-1 text-sm font-medium">
            {application.recommendation ?? "Awaiting Owner decision"} — <span className="text-carbon-600 font-normal">sent to {application.source === "TEAM_ASSIGNMENT" ? "Pacifique Harerimana" : "the Property Owner"} for decision</span>
          </p>
        </div>
      ) : null}

      {!isTerminal && application.status !== "Decision Pending" ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => recommendApplicationDecision(application.id, application.source, "Approve", agentName, "agent")}
            className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
          >
            <Check aria-hidden="true" className="size-4" />
            Recommend Approve
          </button>
          <button
            type="button"
            onClick={() => recommendApplicationDecision(application.id, application.source, "Not Selected", agentName, "agent")}
            className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
          >
            <X aria-hidden="true" className="size-4" />
            Recommend Not Selected
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
        <TenantHistoryButton applicantName={application.applicant} feature="agent.tenantHistory" />
      </div>
    </div>
  );
}
