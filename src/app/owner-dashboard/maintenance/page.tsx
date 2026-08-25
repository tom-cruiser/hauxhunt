"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { MessageSquare, X } from "lucide-react";

import Link from "next/link";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { propertyLocation, propertyTitle } from "@/lib/owner-data";
import { getMaintenanceRequests, subscribeToMaintenance, type MaintenanceRequest, type MaintenanceStatus } from "@/lib/maintenance-data";
import { getProfessionalByName } from "@/lib/team-data";
import { OWNER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";

// Cross-Role Lifecycle Synchronization phase -- Section 26-28. Owner
// Maintenance now reads the SAME canonical, renter-authored
// MaintenanceRequest records (maintenance-data.ts) that Renter and PM
// already read, instead of the older, narrower, disconnected
// OWNER_MAINTENANCE array (kept in owner-data.ts for now, unused here).
// The page's own 4-tab shape is preserved -- each tab now maps to the
// canonical 7-status lifecycle rather than being redesigned.

type Tab = "Open" | "Scheduled" | "In Progress" | "Resolved";
const TABS: Tab[] = ["Open", "Scheduled", "In Progress", "Resolved"];

function matchesTab(status: MaintenanceStatus, tab: Tab): boolean {
  if (tab === "Open") return status === "Submitted" || status === "Under Review";
  if (tab === "Scheduled") return status === "Scheduled";
  if (tab === "In Progress") return status === "In Progress" || status === "Waiting for Renter";
  return status === "Resolved" || status === "Cancelled";
}

export default function OwnerMaintenancePage() {
  return (
    <Suspense>
      <OwnerMaintenancePageInner />
    </Suspense>
  );
}

function OwnerMaintenancePageInner() {
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);

  const all = getMaintenanceRequests();
  const openParam = searchParams.get("open");
  const openRequest = openParam ? all.find((m) => m.id === openParam) : null;
  const [tab, setTab] = useState<Tab>(openRequest ? (TABS.find((t) => matchesTab(openRequest.status, t)) ?? "Open") : "Open");
  const [selectedId, setSelectedId] = useState<string | null>(openParam);

  const requests = all.filter((m) => matchesTab(m.status, tab));
  const selected = all.find((m) => m.id === selectedId) ?? null;

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Maintenance</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Visibility into issues reported across your portfolio. Your Property Manager handles the
              day-to-day work where one is assigned.
            </p>
          </header>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item);
                }}
                aria-pressed={tab === item}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${tab === item ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {item} <span className="ml-1 opacity-60">{all.filter((m) => matchesTab(m.status, item)).length}</span>
              </button>
            ))}
          </div>

          {requests.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No maintenance requests need your attention</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Nothing is currently {tab.toLowerCase()}.</p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="divide-y divide-black/8">
                {requests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-black/2 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        {request.title}
                        {request.urgency === "Urgent" ? <StatusPill status="Urgent" /> : null}
                      </p>
                      <p className="text-carbon-500 mt-1 text-sm">{propertyTitle(request.propertyId)}</p>
                      <p className="text-carbon-400 mt-0.5 text-xs">
                        Reported by {request.reportedBy} · Managed by {request.managedBy ?? "You"}
                      </p>
                    </div>
                    <StatusPill status={request.status} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {selected ? <MaintenanceDetail request={selected} onClose={() => setSelectedId(null)} /> : null}
    </OwnerDashboardShell>
  );
}

function MaintenanceDetail({ request, onClose }: { request: MaintenanceRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-5">
          <div>
            <p className="text-carbon-400 text-xs">{request.id}</p>
            <h2 className="font-bricolage mt-1 flex items-center gap-2 text-2xl font-medium">
              {request.title}
              {request.urgency === "Urgent" ? <StatusPill status="Urgent" /> : null}
            </h2>
            <p className="text-carbon-500 mt-1 text-sm">{propertyTitle(request.propertyId)} · {propertyLocation(request.propertyId)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-carbon-700 mt-5 text-sm leading-6">{request.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-carbon-400 text-xs">Status</dt>
            <dd className="mt-1"><StatusPill status={request.status} /></dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Reported by</dt>
            <dd className="mt-1 font-medium">{request.reportedBy}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Managed by</dt>
            <dd className="mt-1 font-medium">{request.managedBy ?? "You"}</dd>
          </div>
          {request.scheduledVisit ? (
            <div className="col-span-2">
              <dt className="text-carbon-400 text-xs">Scheduled visit</dt>
              <dd className="mt-1 font-medium">
                {request.scheduledVisit.date} · {request.scheduledVisit.time} · {request.scheduledVisit.contact}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
          {(() => {
            // Messages Synchronization phase -- Section 40: maintenance
            // messaging goes to whoever handles it (managedBy), resolved
            // to their real id rather than left as a name-matched link. No
            // resolvable handler (self-managed, or managedBy missing) ->
            // no link, rather than a dead "Message Property Manager".
            const handler = request.managedBy ? getProfessionalByName(request.managedBy) : undefined;
            if (!handler) return null;
            const conversation = getOrCreateConversation(OWNER_PARTICIPANT_ID, handler.id, {
              type: "maintenance",
              propertyId: request.propertyId,
              maintenanceRequestId: request.id,
              label: "Maintenance",
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
          })()}
        </div>
      </div>
    </div>
  );
}
