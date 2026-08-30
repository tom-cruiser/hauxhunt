"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useReducer, useState } from "react";
import { Send } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { type ProfessionalRole } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyLocation, resolveAnyPropertyTitle } from "@/lib/professional-properties";
import {
  getConversationsFor,
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

export function AgentMessagesWorkspace() {
  return (
    <Suspense>
      <MessagesWorkspaceInner role="agent" />
    </Suspense>
  );
}

export function PmMessagesWorkspace() {
  return (
    <Suspense>
      <MessagesWorkspaceInner role="property_manager" />
    </Suspense>
  );
}

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

function MessagesWorkspaceInner({ role }: { role: ProfessionalRole }) {
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToMessages(forceUpdate), []);

  const professional = useDemoProfessional(role);
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

          {conversations.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
              <h3 className="font-bricolage mt-5 text-xl font-medium">No conversations yet</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Conversations with renters, applicants and your team will appear here.</p>
            </div>
          ) : (
            <div className="mt-6 grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
              <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
                {conversations.map((c) => {
                  const other = getParticipant(c.participantIds.find((id) => id !== professional.id) ?? "");
                  if (!other) return null;
                  const unread = hasUnread(c, professional.id);
                  const last = c.messages[c.messages.length - 1];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        markConversationReadFor(c.id, professional.id);
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
                  <ConversationThread key={selected.id} conversation={selected} viewerId={professional.id} />
                ) : (
                  <p className="text-carbon-500 p-6 text-sm sm:p-8">Select a conversation to view messages.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function ConversationThread({ conversation, viewerId }: { conversation: Conversation; viewerId: string }) {
  const [text, setText] = useState("");
  const other = getParticipant(conversation.participantIds.find((id) => id !== viewerId) ?? "");
  const info = contextInfo(conversation.context);

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
        {info ? (
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
