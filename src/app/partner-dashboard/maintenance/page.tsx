"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { MessageSquare, X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getMaintenanceFor, subscribeToPmWork } from "@/lib/pm-work";
import { updateMaintenanceRequest, type MaintenanceRequest, type MaintenanceStatus } from "@/lib/maintenance-data";
import { RENTER_DEMO_NAME } from "@/lib/owner-data";
import { RENTER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";
import emptyIllustration from "@/assets/images/empty.png";

// Property Manager Dashboard phase -- Section 48-54. Maintenance is a new
// top-level PM surface using the CANONICAL, renter-authored lifecycle from
// maintenance-data.ts (Submitted/Under Review/Scheduled/In Progress/
// Waiting for Renter/Resolved/Cancelled) -- never a second, PM-only
// vocabulary. Scoped via pm-work.ts's getMaintenanceFor ("Handle
// maintenance" responsibility + property access).

type Filter = "All" | "New" | "In Progress" | "Waiting" | "Resolved";
const FILTERS: Filter[] = ["All", "New", "In Progress", "Waiting", "Resolved"];

function matchesFilter(status: MaintenanceStatus, filter: Filter): boolean {
  if (filter === "All") return true;
  if (filter === "New") return status === "Submitted" || status === "Under Review";
  if (filter === "In Progress") return status === "Scheduled" || status === "In Progress";
  if (filter === "Waiting") return status === "Waiting for Renter";
  return status === "Resolved" || status === "Cancelled";
}

const MAINTENANCE_ACTIONS: Partial<Record<MaintenanceStatus, { label: string; next: MaintenanceStatus }[]>> = {
  Submitted: [{ label: "Review Request", next: "Under Review" }],
  "Under Review": [
    { label: "Schedule Visit", next: "Scheduled" },
    { label: "Request Information", next: "Waiting for Renter" },
  ],
  Scheduled: [
    { label: "Mark In Progress", next: "In Progress" },
    { label: "Cancel", next: "Cancelled" },
  ],
  "In Progress": [
    { label: "Resolve", next: "Resolved" },
    { label: "Cancel", next: "Cancelled" },
  ],
  "Waiting for Renter": [
    { label: "Mark In Progress", next: "In Progress" },
    { label: "Cancel", next: "Cancelled" },
  ],
};

export default function Page() {
  return (
    <Suspense>
      <PmMaintenancePage />
    </Suspense>
  );
}

function PmMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));
  const professional = useDemoProfessional("property_manager");

  if (!professional) {
    return (
      <DashboardShell initialSection="maintenance">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const propertyId = searchParams.get("propertyId");
  const all = getMaintenanceFor(professional.id);
  const scoped = propertyId ? all.filter((m) => m.propertyId === propertyId) : all;
  const visible = scoped.filter((m) => matchesFilter(m.status, filter));

  const selected = scoped.find((m) => m.id === selectedId) ?? null;

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/maintenance${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="maintenance">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Maintenance</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">Maintenance requests renters have submitted for the properties you manage.</p>
            {propertyId ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/4.5 py-1.5 pr-1.5 pl-4 text-sm font-medium">
                <span>{resolveAnyPropertyTitle(propertyId)}</span>
                <button type="button" onClick={clearPropertyFilter} aria-label="Clear property filter" className="flex size-6 items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            ) : null}
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

          {scoped.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
              <h3 className="font-bricolage mt-5 text-xl font-medium">{propertyId ? "No maintenance requests for this property" : "No maintenance requests"}</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Maintenance requests from renters will appear here.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No requests match this filter</h3>
            </div>
          ) : (
            <div className="mt-6 grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
              <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
                {visible.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={`block w-full p-5 text-left transition-colors ${selected?.id === request.id ? "bg-black/4.5" : "hover:bg-black/2"}`}
                  >
                    <p className="flex items-center gap-2 font-medium">
                      {request.title}
                      {request.urgency === "Urgent" ? <StatusPill status="Urgent" /> : null}
                    </p>
                    <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(request.propertyId)}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <StatusPill status={request.status} />
                      <span className="text-carbon-400 text-xs">{request.submitted}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="min-w-0 p-6 sm:p-8">{selected ? <MaintenanceDetail request={selected} professionalId={professional.id} /> : <p className="text-carbon-500 text-sm">Select a request to view details.</p>}</div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function MaintenanceDetail({ request, professionalId }: { request: MaintenanceRequest; professionalId: string }) {
  const actions = MAINTENANCE_ACTIONS[request.status] ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h2 className="font-bricolage flex items-center gap-2 text-xl font-medium">
            {request.title}
            {request.urgency === "Urgent" ? <StatusPill status="Urgent" /> : null}
          </h2>
          <p className="text-carbon-500 mt-1 text-sm">{resolveAnyPropertyTitle(request.propertyId)} · {request.location}</p>
        </div>
        <StatusPill status={request.status} />
      </div>

      <p className="text-carbon-700 mt-5 text-sm leading-6">{request.description}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-carbon-400 text-xs">Category</dt>
          <dd className="mt-1 font-medium">{request.category}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Reported by</dt>
          <dd className="mt-1 font-medium">{request.reportedBy}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Submitted</dt>
          <dd className="mt-1 font-medium">{request.submitted}</dd>
        </div>
        {request.scheduledVisit ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-carbon-400 text-xs">Scheduled visit</dt>
            <dd className="mt-1 font-medium">
              {request.scheduledVisit.date} · {request.scheduledVisit.time} · {request.scheduledVisit.contact}
            </dd>
          </div>
        ) : null}
        {request.informationNeeded ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-carbon-400 text-xs">Information needed</dt>
            <dd className="mt-1 font-medium">{request.informationNeeded}</dd>
          </div>
        ) : null}
        {request.resolution ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-carbon-400 text-xs">Resolution</dt>
            <dd className="mt-1 font-medium">{request.resolution}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
        {request.reportedBy === RENTER_DEMO_NAME
          ? (() => {
              // Messages Synchronization phase -- Section 28/40: resolves
              // the real shared conversation with the renter instead of a
              // name-matched link.
              const conversation = getOrCreateConversation(professionalId, RENTER_PARTICIPANT_ID, {
                type: "maintenance",
                propertyId: request.propertyId,
                maintenanceRequestId: request.id,
                label: "Maintenance",
              });
              if (!conversation) return null;
              return (
                <a
                  href={`/partner-dashboard/messages?open=${conversation.id}`}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                >
                  <MessageSquare aria-hidden="true" className="size-4" />
                  Message {request.reportedBy}
                </a>
              );
            })()
          : null}
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => updateMaintenanceRequest(request.id, { status: action.next })}
            className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
