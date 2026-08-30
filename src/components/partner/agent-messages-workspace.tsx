"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useReducer, useState } from "react";
import { MessageSquare, Send, Wrench, X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyLocation, resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getMaintenanceFor, subscribeToPmWork } from "@/lib/pm-work";
import { MAINTENANCE_STATUS_ACTIONS, updateMaintenanceRequest, type MaintenanceRequest, type MaintenanceStatus } from "@/lib/maintenance-data";
import { RENTER_DEMO_NAME } from "@/lib/owner-data";
import {
  RENTER_PARTICIPANT_ID,
  getConversationsFor,
  getOrCreateConversation,
  getParticipant,
  markConversationReadFor,
  sendMessageAs,
  subscribeToMessages,
  type Conversation,
  type ConversationContext,
} from "@/lib/messages-data";
import emptyIllustration from "@/assets/images/empty.png";

// Messages Synchronization phase (Phase 5) -- Agent and PM read/write the
// exact same shared conversation store Owner and Renter now use
// (messages-data.ts), instead of professional-work.ts's old per-
// professional Conversation model (the other party there was a name/role
// STRING, never a real second participant -- so a renter or Owner reply
// could never appear here, and vice versa). Same list+thread UI as before.
//
// Messages & Maintenance Consolidation phase -- these were two separate
// top-level PM pages that already linked to each other constantly (a
// maintenance thread's "View Request", a request's "Message {renter}"):
// two tabs on one surface, not two destinations, mirrors the Finance
// Consolidation merge of Payments into Finance. Agent has no Maintenance
// responsibility (canHandleMaintenanceFor is PM-only), so
// AgentMessagesWorkspace stays exactly what it always was: Messages, no
// tab bar.

// "rental" and "rental-setup" contexts fall through to `default: null` --
// Rentals was removed as a partner-dashboard surface, so there's no page
// left for a PM/Agent to be sent to for either one (rental setup and
// tracking are Owner-side only now).
function contextInfo(context: ConversationContext | undefined): { label: string; href: string } | null {
  if (!context) return null;
  switch (context.type) {
    case "maintenance":
      return context.maintenanceRequestId ? { label: "View Request", href: `/partner-dashboard/maintenance?open=${context.maintenanceRequestId}` } : null;
    case "application":
      return context.applicationId ? { label: "View Application", href: `/partner-dashboard/applications?open=${context.applicationId}` } : null;
    case "property":
      return context.propertyId ? { label: "View Property", href: `/partner-dashboard/properties/${context.propertyId}` } : null;
    default:
      return null;
  }
}

function contextSubtitle(context: ConversationContext | undefined): string {
  if (!context) return "";
  if (context.propertyId) return `${resolveAnyPropertyTitle(context.propertyId)} · ${context.label}`;
  return context.label;
}

function hasUnread(conversation: Conversation, viewerId: string) {
  const lastRead = conversation.lastReadTs[viewerId] ?? 0;
  return conversation.messages.some((m) => m.senderId !== viewerId && m.ts > lastRead);
}

// ---------------------------------------------------------------------------
// Agent -- Messages only, no tab bar.
// ---------------------------------------------------------------------------

export function AgentMessagesWorkspace() {
  return (
    <Suspense>
      <AgentMessagesInner />
    </Suspense>
  );
}

function AgentMessagesInner() {
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToMessages(forceUpdate), []);

  const professional = useDemoProfessional("agent");
  const conversations = useMemo(() => (professional ? getConversationsFor(professional.id) : []), [professional]);

  // Section 76: an unknown ?open= never silently falls back to the first
  // conversation -- only the absence of ?open= does that.
  const openParam = searchParams.get("open");
  // Legacy compatibility (Section 12/75): ?context={name} predates stable
  // conversation ids on a few PM contextual "Message" links (Rentals,
  // Payments, Maintenance) -- resolved here by matching the OTHER
  // participant's name, never treated as canonical.
  const legacyContextParam = searchParams.get("context")?.toLowerCase() ?? "";
  const legacyMatch = legacyContextParam
    ? conversations.find((c) => {
        const other = getParticipant(c.participantIds.find((id) => id !== professional?.id) ?? "");
        return other?.name.toLowerCase().includes(legacyContextParam);
      })
    : undefined;
  const initialId = openParam ? (conversations.some((c) => c.id === openParam) ? openParam : null) : (legacyMatch?.id ?? conversations[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  if (!professional) {
    return (
      <DashboardShell initialSection="messages">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <DashboardShell initialSection="messages">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Messages</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">Keep property conversations clear, organized, and easy to follow.</p>
          </header>

          <div className="mt-6">
            <MessagesPanel conversations={conversations} selected={selected} onSelect={setSelectedId} viewerId={professional.id} />
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Property Manager -- Messages & Maintenance, one tab, toggled inside it.
// ---------------------------------------------------------------------------

type PmTab = "Messages" | "Maintenance";
const PM_TABS: PmTab[] = ["Messages", "Maintenance"];
const PM_TAB_FOR_PARAM: Record<string, PmTab> = { messages: "Messages", maintenance: "Maintenance" };
const PARAM_FOR_PM_TAB: Record<PmTab, string> = { Messages: "messages", Maintenance: "maintenance" };

type MaintenanceFilter = "All" | "New" | "In Progress" | "Waiting" | "Resolved";
const MAINTENANCE_FILTERS: MaintenanceFilter[] = ["All", "New", "In Progress", "Waiting", "Resolved"];

function matchesMaintenanceFilter(status: MaintenanceStatus, filter: MaintenanceFilter): boolean {
  if (filter === "All") return true;
  if (filter === "New") return status === "Submitted" || status === "Under Review";
  if (filter === "In Progress") return status === "Scheduled" || status === "In Progress";
  if (filter === "Waiting") return status === "Waiting for Renter";
  return status === "Resolved" || status === "Cancelled";
}

export function PmMessagesWorkspace() {
  return (
    <Suspense>
      <PmMessagesAndMaintenanceInner />
    </Suspense>
  );
}

function PmMessagesAndMaintenanceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []); // covers Maintenance (Section: subscribeToPmWork already folds in subscribeToMaintenance)
  useEffect(() => subscribeToMessages(forceUpdate), []);

  const professional = useDemoProfessional("property_manager");

  const openParam = searchParams.get("open");
  const initialTab = PM_TAB_FOR_PARAM[searchParams.get("tab") ?? ""] ?? "Messages";
  const [tab, setTab] = useState<PmTab>(initialTab);
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceFilter>("All");

  const conversations = useMemo(() => (professional ? getConversationsFor(professional.id) : []), [professional]);
  const legacyContextParam = searchParams.get("context")?.toLowerCase() ?? "";
  const legacyMatch = legacyContextParam
    ? conversations.find((c) => {
        const other = getParticipant(c.participantIds.find((id) => id !== professional?.id) ?? "");
        return other?.name.toLowerCase().includes(legacyContextParam);
      })
    : undefined;
  // ?open= only seeds the Messages selection when it actually arrived
  // pointed at Messages -- otherwise (e.g. an old /maintenance?open=HH-MNT-
  // ... link landing here with the Maintenance tab selected) it's a
  // maintenance request id, never a conversation id, and must not be
  // mistaken for one.
  const initialConversationId =
    initialTab === "Messages" && openParam
      ? conversations.some((c) => c.id === openParam)
        ? openParam
        : null
      : (legacyMatch?.id ?? conversations[0]?.id ?? null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(initialTab === "Maintenance" ? openParam : null);

  if (!professional) {
    return (
      <DashboardShell initialSection="messages">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) ?? null;

  const propertyId = searchParams.get("propertyId");
  const allMaintenance = getMaintenanceFor(professional.id);
  const scopedMaintenance = propertyId ? allMaintenance.filter((m) => m.propertyId === propertyId) : allMaintenance;
  const visibleMaintenance = scopedMaintenance.filter((m) => matchesMaintenanceFilter(m.status, maintenanceFilter));
  const selectedMaintenance = scopedMaintenance.find((m) => m.id === selectedMaintenanceId) ?? null;

  // The three ways to move between tabs: a plain tab click (drops whatever
  // ?open= was there -- it belonged to the tab being left), and the two
  // cross-links that used to be full page navigations ("View Request" from
  // a maintenance-context thread, "Message {renter}" from a request) --
  // those still take you to the other tab, but now WITH the specific
  // thread/request already selected, since it's the same page.
  function selectTab(next: PmTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", PARAM_FOR_PM_TAB[next]);
    params.delete("open");
    router.replace(`/partner-dashboard/messages?${params.toString()}`);
  }

  function openMaintenanceRequest(requestId: string) {
    setTab("Maintenance");
    setSelectedMaintenanceId(requestId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "maintenance");
    params.set("open", requestId);
    router.replace(`/partner-dashboard/messages?${params.toString()}`);
  }

  function openConversation(conversationId: string) {
    setTab("Messages");
    setSelectedConversationId(conversationId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "messages");
    params.set("open", conversationId);
    router.replace(`/partner-dashboard/messages?${params.toString()}`);
  }

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/messages${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="messages">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">{tab === "Messages" ? "Messages" : "Maintenance"}</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              {tab === "Messages"
                ? "Keep property conversations clear, organized, and easy to follow."
                : "Maintenance requests renters have submitted for the properties you manage."}
            </p>
            {tab === "Maintenance" && propertyId ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/4.5 py-1.5 pr-1.5 pl-4 text-sm font-medium">
                <span>{resolveAnyPropertyTitle(propertyId)}</span>
                <button type="button" onClick={clearPropertyFilter} aria-label="Clear property filter" className="flex size-6 items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            ) : null}
          </header>

          <div className="mt-8 flex h-11 w-fit items-center rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            {PM_TABS.map((tabOption) => (
              <button
                key={tabOption}
                type="button"
                onClick={() => selectTab(tabOption)}
                aria-pressed={tab === tabOption}
                className={`h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === tabOption ? "bg-black text-white" : "text-black/55 hover:text-black"
                }`}
              >
                {tabOption}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "Messages" ? (
              <MessagesPanel
                conversations={conversations}
                selected={selectedConversation}
                onSelect={setSelectedConversationId}
                viewerId={professional.id}
                onOpenMaintenance={openMaintenanceRequest}
              />
            ) : (
              <MaintenancePanel
                scoped={scopedMaintenance}
                visible={visibleMaintenance}
                selected={selectedMaintenance}
                filter={maintenanceFilter}
                onFilterChange={setMaintenanceFilter}
                onSelect={setSelectedMaintenanceId}
                professionalId={professional.id}
                propertyScoped={Boolean(propertyId)}
                onOpenConversation={openConversation}
              />
            )}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Messages panel -- conversation list + thread. Shared by Agent (its whole
// page) and PM (its Messages tab).
// ---------------------------------------------------------------------------

function MessagesPanel({
  conversations,
  selected,
  onSelect,
  viewerId,
  onOpenMaintenance,
}: {
  conversations: Conversation[];
  selected: Conversation | null;
  onSelect: (id: string) => void;
  viewerId: string;
  onOpenMaintenance?: (requestId: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
        <h3 className="font-bricolage mt-5 text-xl font-medium">No conversations yet</h3>
        <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Conversations with renters, applicants and your team will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
      <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
        {conversations.map((c) => {
          const other = getParticipant(c.participantIds.find((id) => id !== viewerId) ?? "");
          if (!other) return null;
          const unread = hasUnread(c, viewerId);
          const last = c.messages[c.messages.length - 1];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c.id);
                markConversationReadFor(c.id, viewerId);
              }}
              className={`block w-full p-5 text-left transition-colors ${selected?.id === c.id ? "bg-black/4.5" : "hover:bg-black/2"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="truncate font-medium">{other.name}</p>
                {unread ? <span className="mt-0.5 size-2 shrink-0 rounded-full bg-black" aria-label="Unread" /> : null}
              </div>
              <p className="text-carbon-500 mt-1 truncate text-xs">{contextSubtitle(c.context) || other.role}</p>
              <p className="text-carbon-500 mt-2 line-clamp-1 text-sm">{last?.text ?? "Start a conversation"}</p>
              <p className="text-carbon-400 mt-1 text-xs">{last ? new Date(last.ts).toLocaleDateString([], { day: "numeric", month: "short" }) : ""}</p>
            </button>
          );
        })}
      </div>
      <div className="min-w-0">
        {selected ? (
          <ConversationThread key={selected.id} conversation={selected} viewerId={viewerId} onOpenMaintenance={onOpenMaintenance} />
        ) : (
          <p className="text-carbon-500 p-6 text-sm sm:p-8">Select a conversation to view messages.</p>
        )}
      </div>
    </div>
  );
}

function ConversationThread({
  conversation,
  viewerId,
  onOpenMaintenance,
}: {
  conversation: Conversation;
  viewerId: string;
  onOpenMaintenance?: (requestId: string) => void;
}) {
  const [text, setText] = useState("");
  const other = getParticipant(conversation.participantIds.find((id) => id !== viewerId) ?? "");
  const info = contextInfo(conversation.context);

  // Messages & Maintenance Consolidation phase -- looked up through
  // getMaintenanceFor (pm-work.ts), never a raw id lookup, so this only
  // ever surfaces a request the viewer actually has property access +
  // "handle maintenance" permission for. A conversation's
  // context.maintenanceRequestId is untrusted with respect to the viewer --
  // it names a request that was true for whoever created the context, not
  // necessarily still visible to every participant on it. Agent never
  // passes onOpenMaintenance (it has no Maintenance tab to jump to), so
  // this stays undefined there regardless of context.
  const maintenanceRequestId = conversation.context?.type === "maintenance" ? conversation.context.maintenanceRequestId : undefined;
  const maintenanceRequest = onOpenMaintenance && maintenanceRequestId ? getMaintenanceFor(viewerId).find((m) => m.id === maintenanceRequestId) : undefined;

  function submit() {
    if (!text.trim()) return;
    sendMessageAs(conversation.id, viewerId, text.trim());
    setText("");
  }

  if (!other) return null;

  return (
    <div className="flex h-full min-h-105 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-black/10 p-6 sm:p-8">
        <div>
          <p className="flex items-center gap-1.5 font-medium">{other.name}</p>
          <p className="text-carbon-500 mt-1 text-sm">
            {other.role}
            {conversation.context?.propertyId ? ` · ${resolveAnyPropertyTitle(conversation.context.propertyId)}, ${resolveAnyPropertyLocation(conversation.context.propertyId)}` : ""}
          </p>
          {conversation.context ? <p className="text-carbon-400 mt-1 text-xs">{conversation.context.label}</p> : null}
        </div>
        {maintenanceRequest ? (
          <button
            type="button"
            onClick={() => onOpenMaintenance?.(maintenanceRequest.id)}
            className="font-bricolage inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black"
          >
            <Wrench aria-hidden="true" className="size-3.5" />
            View Maintenance
          </button>
        ) : info ? (
          <Link href={info.href} className="font-bricolage shrink-0 text-sm font-medium underline underline-offset-4">
            {info.label}
          </Link>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 sm:p-8">
        {conversation.messages.length === 0 ? (
          <p className="text-carbon-500 text-sm">Start a conversation with {other.name.split(" ")[0]}.</p>
        ) : (
          conversation.messages.map((message) => {
            const isSelf = message.senderId === viewerId;
            return (
              <div key={message.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${isSelf ? "bg-black text-white" : "bg-black/4.5"}`}>
                  <p>{message.text}</p>
                  <p className={`mt-1 text-[10px] ${isSelf ? "text-white/60" : "text-black/40"}`}>
                    {new Date(message.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-black/10 p-4 sm:p-6">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Write a message..."
          className="h-11 flex-1 rounded-full bg-black/3 px-4 text-sm outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Send"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Send aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maintenance panel -- request list + detail. PM's Maintenance tab only
// (Agent has no "handle maintenance" responsibility, so getMaintenanceFor
// always comes back empty for it -- there's no PM/Agent fork to build
// here, just no Agent caller).
// ---------------------------------------------------------------------------

function MaintenancePanel({
  scoped,
  visible,
  selected,
  filter,
  onFilterChange,
  onSelect,
  professionalId,
  propertyScoped,
  onOpenConversation,
}: {
  scoped: MaintenanceRequest[];
  visible: MaintenanceRequest[];
  selected: MaintenanceRequest | null;
  filter: MaintenanceFilter;
  onFilterChange: (filter: MaintenanceFilter) => void;
  onSelect: (id: string) => void;
  professionalId: string;
  propertyScoped: boolean;
  onOpenConversation: (conversationId: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {MAINTENANCE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
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
          <h3 className="font-bricolage mt-5 text-xl font-medium">{propertyScoped ? "No maintenance requests for this property" : "No maintenance requests"}</h3>
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
                onClick={() => onSelect(request.id)}
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
          <div className="min-w-0 p-6 sm:p-8">
            {selected ? (
              <MaintenanceDetail request={selected} professionalId={professionalId} onOpenConversation={onOpenConversation} />
            ) : (
              <p className="text-carbon-500 text-sm">Select a request to view details.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MaintenanceDetail({
  request,
  professionalId,
  onOpenConversation,
}: {
  request: MaintenanceRequest;
  professionalId: string;
  onOpenConversation: (conversationId: string) => void;
}) {
  const actions = MAINTENANCE_STATUS_ACTIONS[request.status] ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h2 className="font-bricolage flex items-center gap-2 text-xl font-medium">
            {request.title}
            {request.urgency === "Urgent" ? <StatusPill status="Urgent" /> : null}
          </h2>
          <p className="text-carbon-500 mt-1 text-sm">
            {resolveAnyPropertyTitle(request.propertyId)} · {request.location}
          </p>
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
              // name-matched link. Messages & Maintenance Consolidation
              // phase -- switches this same page to its Messages tab
              // instead of navigating to a separate route.
              const conversation = getOrCreateConversation(professionalId, RENTER_PARTICIPANT_ID, {
                type: "maintenance",
                propertyId: request.propertyId,
                maintenanceRequestId: request.id,
                label: "Maintenance",
              });
              if (!conversation) return null;
              return (
                <button
                  type="button"
                  onClick={() => onOpenConversation(conversation.id)}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                >
                  <MessageSquare aria-hidden="true" className="size-4" />
                  Message {request.reportedBy}
                </button>
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
