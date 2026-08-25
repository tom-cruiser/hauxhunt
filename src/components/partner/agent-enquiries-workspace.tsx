"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { CalendarClock, Check, MessageSquare, Send, X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam, type ProfessionalRole } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import {
  getEnquiriesFor,
  getViewingsFor,
  replyToEnquiry,
  scheduleViewingFromEnquiry,
  subscribeToProfessionalWork,
  updateViewingStatus,
  type Enquiry,
  type Viewing,
  type ViewingStatus,
} from "@/lib/professional-work";
import emptyIllustration from "@/assets/images/empty.png";

// Agent Dashboard Redesign phase -- Enquiries is the property-scoped task
// surface Section 19 asks for: Enquiries and Calendar (Viewings) as tabs of
// ONE page, not two nav items. Every row resolves to a real propertyId
// (Section 20/52) via professional-properties.ts; nothing here is the old
// PORTFOLIO_LISTINGS-keyed EnquiriesCalendarDashboard data.
//
// Agent UX cleanup phase -- a `propertyId` query param (never a title
// string) optionally scopes both tabs to one property, arriving from
// Property Detail's Leasing Activity links. It's read straight off
// useSearchParams() on every render, so it survives switching between the
// Enquiries and Calendar tabs (a local state change, not a navigation) for
// free -- no separate persistence mechanism needed.

type Tab = "enquiries" | "calendar";

export function AgentEnquiriesWorkspace() {
  return (
    <Suspense>
      <EnquiriesWorkspaceInner role="agent" />
    </Suspense>
  );
}

// Property Manager Dashboard phase -- Section 19: PM reaches this exact
// workspace ONLY contextually (a "View Leasing Activity" link from Property
// Detail, always carrying ?propertyId=), never from a permanent top-level
// nav item. Reusing the component rather than forking a second Leasing
// surface for PM.
export function PmEnquiriesWorkspace() {
  return (
    <Suspense>
      <EnquiriesWorkspaceInner role="property_manager" />
    </Suspense>
  );
}

function EnquiriesWorkspaceInner({ role }: { role: ProfessionalRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);

  const [tab, setTab] = useState<Tab>(searchParams.get("view") === "calendar" ? "calendar" : "enquiries");
  const professional = useDemoProfessional(role);

  if (!professional) {
    return (
      <DashboardShell initialSection="enquiries">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  // Property scope comes from propertyId alone -- never resolved or
  // compared by title string. An unrecognized propertyId simply filters
  // both lists down to empty, which is a safe, correct outcome.
  const propertyId = searchParams.get("propertyId");
  const allEnquiries = getEnquiriesFor(professional.id);
  const allViewings = getViewingsFor(professional.id);
  const enquiries = propertyId ? allEnquiries.filter((e) => e.propertyId === propertyId) : allEnquiries;
  const viewings = propertyId ? allViewings.filter((v) => v.propertyId === propertyId) : allViewings;
  const openEnquiryId = searchParams.get("open");
  const openViewingId = tab === "calendar" ? searchParams.get("open") : null;

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/enquiries${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="enquiries">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Enquiries</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Reply to renter enquiries and organize upcoming property viewings.
            </p>
            {propertyId ? <PropertyFilterChip propertyId={propertyId} onClear={clearPropertyFilter} /> : null}
          </header>

          <div className="mt-7 flex gap-1.5">
            <TabButton active={tab === "enquiries"} onClick={() => setTab("enquiries")}>
              Enquiries <span className="ml-1 opacity-60">{enquiries.length}</span>
            </TabButton>
            <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
              Calendar <span className="ml-1 opacity-60">{viewings.length}</span>
            </TabButton>
          </div>

          {tab === "enquiries" ? (
            <EnquiriesTab enquiries={enquiries} initialOpenId={openEnquiryId} propertyScoped={Boolean(propertyId)} onScheduled={() => setTab("calendar")} />
          ) : (
            <CalendarTab viewings={viewings} initialOpenId={openViewingId} propertyScoped={Boolean(propertyId)} />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

// A visible, dismissible chip naming the scoped property (resolved from
// propertyId, never a title string carried in the URL itself). Clearing it
// drops only the propertyId param, preserving the current tab (`view`) and
// any `open` target.
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
      <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
      <h3 className="font-bricolage mt-5 text-xl font-medium">{title}</h3>
      <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">{body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

function EnquiriesTab({
  enquiries,
  initialOpenId,
  propertyScoped,
  onScheduled,
}: {
  enquiries: Enquiry[];
  initialOpenId: string | null;
  propertyScoped: boolean;
  onScheduled: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId ?? enquiries[0]?.id ?? null);
  const selected = enquiries.find((e) => e.id === selectedId) ?? null;

  if (enquiries.length === 0) {
    return propertyScoped ? (
      <EmptyState title="No enquiries for this property yet" body="New renter enquiries for this property will appear here." />
    ) : (
      <EmptyState title="No enquiries yet" body="New renter enquiries for the properties you represent will appear here." />
    );
  }

  return (
    <div className="mt-6 grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
      <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
        {enquiries.map((enquiry) => (
          <button
            key={enquiry.id}
            type="button"
            onClick={() => setSelectedId(enquiry.id)}
            className={`block w-full p-5 text-left transition-colors ${selectedId === enquiry.id ? "bg-black/4.5" : "hover:bg-black/2"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{enquiry.renterName}</p>
                <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(enquiry.propertyId)}</p>
              </div>
              {enquiry.status === "New" ? <span className="mt-0.5 size-2 shrink-0 rounded-full bg-black" aria-label="New" /> : null}
            </div>
            <p className="text-carbon-500 mt-2 line-clamp-2 text-sm leading-5">{enquiry.message}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <StatusPill status={enquiry.status} />
              <span className="text-carbon-400 text-xs">{enquiry.receivedAt}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="min-w-0 p-6 sm:p-8">
        {selected ? <EnquiryDetail key={selected.id} enquiry={selected} onScheduled={onScheduled} /> : <p className="text-carbon-500 text-sm">Select an enquiry to view details.</p>}
      </div>
    </div>
  );
}

function EnquiryDetail({ enquiry, onScheduled }: { enquiry: Enquiry; onScheduled: () => void }) {
  const [replyText, setReplyText] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sent, setSent] = useState(false);

  function submitReply() {
    if (!replyText.trim()) return;
    replyToEnquiry(enquiry.id, replyText.trim());
    setReplyText("");
    setSent(true);
  }

  function submitSchedule() {
    if (!date || !time) return;
    scheduleViewingFromEnquiry(enquiry.id, date, time);
    setShowSchedule(false);
    onScheduled();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h2 className="font-bricolage text-xl font-medium">{enquiry.renterName}</h2>
          <p className="text-carbon-500 mt-1 text-sm">{resolveAnyPropertyTitle(enquiry.propertyId)}</p>
        </div>
        <StatusPill status={enquiry.status} />
      </div>

      <div className="mt-6 rounded-2xl bg-black/3 p-4">
        <p className="text-carbon-400 text-xs">{enquiry.receivedAt}</p>
        <p className="mt-1.5 text-sm leading-6">{enquiry.message}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {enquiry.conversationId ? (
          <Link
            href={`/partner-dashboard/messages?open=${enquiry.conversationId}`}
            className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
          >
            <MessageSquare aria-hidden="true" className="size-4" />
            View Conversation
          </Link>
        ) : null}
        {enquiry.status !== "Viewing Scheduled" ? (
          <button type="button" onClick={() => setShowSchedule((v) => !v)} className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black">
            <CalendarClock aria-hidden="true" className="size-4" />
            Schedule Viewing
          </button>
        ) : null}
      </div>

      {showSchedule ? (
        <div className="mt-4 rounded-2xl bg-black/3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-carbon-600 text-xs font-medium">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border-0 bg-white px-4 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="text-carbon-600 text-xs font-medium">Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border-0 bg-white px-4 text-sm outline-none" />
            </label>
          </div>
          <button
            type="button"
            onClick={submitSchedule}
            disabled={!date || !time}
            className="font-bricolage mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Check aria-hidden="true" className="size-4" />
            Confirm Viewing
          </button>
        </div>
      ) : null}

      <div className="mt-6 border-t border-black/8 pt-6">
        <label className="block">
          <span className="text-carbon-600 text-xs font-medium">{enquiry.status === "New" ? "Reply" : "Send a message"}</span>
          <textarea
            value={replyText}
            onChange={(e) => {
              setReplyText(e.target.value);
              setSent(false);
            }}
            rows={3}
            placeholder="Write a reply..."
            className="mt-1.5 w-full resize-y rounded-xl bg-black/3 px-4 py-3 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={submitReply}
          disabled={!replyText.trim()}
          className="font-bricolage mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Send aria-hidden="true" className="size-4" />
          {enquiry.status === "New" ? "Reply" : "Send"}
        </button>
        {sent ? <p className="text-carbon-500 mt-2 text-xs">Sent.</p> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar (Viewings)
// ---------------------------------------------------------------------------

const VIEWING_ACTIONS: Partial<Record<ViewingStatus, { label: string; next: ViewingStatus }[]>> = {
  "Awaiting Confirmation": [{ label: "Confirm", next: "Confirmed" }, { label: "Cancel", next: "Cancelled" }],
  "New Time Suggested": [{ label: "Confirm New Time", next: "Confirmed" }, { label: "Cancel", next: "Cancelled" }],
  "Reschedule Requested": [{ label: "Suggest New Time", next: "New Time Suggested" }, { label: "Cancel", next: "Cancelled" }],
  Confirmed: [{ label: "Mark Completed", next: "Completed" }, { label: "Mark No-show", next: "No-show" }, { label: "Cancel", next: "Cancelled" }],
};

function CalendarTab({ viewings, initialOpenId, propertyScoped }: { viewings: Viewing[]; initialOpenId: string | null; propertyScoped: boolean }) {
  if (viewings.length === 0) {
    return propertyScoped ? (
      <EmptyState title="No upcoming viewings for this property" body="Scheduled viewings for this property will appear here." />
    ) : (
      <EmptyState title="No upcoming viewings" body="Scheduled property viewings will appear here." />
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="divide-y divide-black/8">
        {viewings.map((viewing) => (
          <ViewingRow key={viewing.id} viewing={viewing} highlighted={viewing.id === initialOpenId} />
        ))}
      </div>
    </div>
  );
}

function ViewingRow({ viewing, highlighted }: { viewing: Viewing; highlighted: boolean }) {
  const actions = VIEWING_ACTIONS[viewing.status] ?? [];
  return (
    <div className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${highlighted ? "bg-black/4.5" : ""}`}>
      <div className="min-w-0">
        <p className="font-medium">{resolveAnyPropertyTitle(viewing.propertyId)}</p>
        <p className="text-carbon-500 mt-1 text-sm">{viewing.renterName}</p>
        <p className="text-carbon-400 mt-0.5 text-xs">{viewing.date} · {viewing.time}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={viewing.status} />
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => updateViewingStatus(viewing.id, action.next)}
            className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-3.5 text-xs font-medium hover:border-black"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
