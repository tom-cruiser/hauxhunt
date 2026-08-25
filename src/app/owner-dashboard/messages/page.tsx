"use client";

import { Suspense, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, ChevronDown, ChevronLeft, MessageCircle, MoreVertical, Search, Send } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { propertyTitle } from "@/lib/owner-data";
import {
  OWNER_PARTICIPANT_ID,
  getConversationsFor,
  getParticipant,
  markConversationReadFor,
  sendMessageAs,
  subscribeToMessages,
  type Conversation,
  type ConversationContext,
  type Participant,
} from "@/lib/messages-data";

// Messages Synchronization phase (Phase 5) -- same visual system as before
// (list + thread, search, Inbox tabs, phone link, date separators,
// composer), now reading/writing the ONE shared conversation store instead
// of a component-local, never-persisted INITIAL_CONVERSATIONS array. Photo/
// document attachments from the old implementation were not carried over --
// see the Phase 5 report for why (a message now has to render meaningfully
// on up to three different dashboards, not just this one).

const INBOX_TABS = [
  { key: "inbox", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
] as const;
type InboxTab = (typeof INBOX_TABS)[number]["key"];

function contextInfo(context: ConversationContext | undefined): { label: string; href: string } | null {
  if (!context) return null;
  switch (context.type) {
    case "maintenance":
      return context.maintenanceRequestId
        ? { label: "View Request", href: `/owner-dashboard/maintenance?open=${context.maintenanceRequestId}` }
        : context.propertyId
          ? { label: "View Maintenance", href: `/owner-dashboard/properties/${context.propertyId}?tab=maintenance` }
          : null;
    case "application":
      return context.applicationId
        ? { label: "View Application", href: `/owner-dashboard/applications?open=${context.applicationId}` }
        : context.propertyId
          ? { label: "View Applications", href: `/owner-dashboard/applications?propertyId=${context.propertyId}` }
          : null;
    case "rental":
      return context.rentalId ? { label: "View Rental", href: `/owner-dashboard/rentals?open=${context.rentalId}` } : null;
    case "rental-setup":
      return context.propertyId ? { label: "View Rental Setup", href: `/owner-dashboard/properties/${context.propertyId}?tab=rental` } : null;
    case "property":
      return context.propertyId ? { label: "View Property", href: `/owner-dashboard/properties/${context.propertyId}` } : null;
    default:
      return null;
  }
}

function contextSubtitle(context: ConversationContext | undefined): string {
  if (!context) return "";
  if (context.propertyId) return `${propertyTitle(context.propertyId)} · ${context.label}`;
  return context.label;
}

function lastMessage(conversation: Conversation) {
  return conversation.messages[conversation.messages.length - 1];
}

function lastActivity(conversation: Conversation) {
  return conversation.messages.reduce((latest, m) => Math.max(latest, m.ts), 0);
}

function dateLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function relativeLabel(ts: number) {
  const diff = Date.now() - ts;
  const hour = 3_600_000;
  if (diff < hour) return "Just now";
  if (diff < 24 * hour) return `${Math.round(diff / hour)} hr ago`;
  return dateLabel(ts);
}

function ConversationAvatar({ participant, className }: { participant: Participant; className: string }) {
  if (participant.avatar) {
    return (
      <div className={`relative overflow-hidden rounded-full bg-black ${className}`}>
        <Image src={participant.avatar} alt={participant.name} fill className="object-cover" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`flex items-center justify-center rounded-full bg-black font-bricolage font-bold text-white ${className}`}>
      {participant.name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export default function OwnerMessagesPage() {
  return (
    <Suspense>
      <OwnerMessagesPageInner />
    </Suspense>
  );
}

function OwnerMessagesPageInner() {
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToMessages(forceUpdate), []);

  // Legacy compatibility (Section 12): ?context={name-or-property-substring}
  // was the old, name-matching resolver. New links use ?open={conversationId}
  // directly (Phase 1/2/2.5/3's contextual Message actions were migrated to
  // it -- see the Phase 5 report). This stays only as a fallback for
  // anything not yet migrated; it is never the canonical lookup.
  const openParam = searchParams.get("open");
  const legacyContextParam = searchParams.get("context")?.toLowerCase() ?? "";

  const conversations = getConversationsFor(OWNER_PARTICIPANT_ID);

  const legacyMatch = useMemo(() => {
    if (!legacyContextParam) return undefined;
    return conversations.find((c) => {
      const other = getParticipant(c.participantIds.find((id) => id !== OWNER_PARTICIPANT_ID) ?? "");
      return other?.name.toLowerCase().includes(legacyContextParam) || contextSubtitle(c.context).toLowerCase().includes(legacyContextParam);
    });
  }, [conversations, legacyContextParam]);

  // Section 76: an unknown ?open= id never crashes and never silently opens
  // something else -- it just resolves to no selection.
  const initialId = (openParam && conversations.some((c) => c.id === openParam) ? openParam : undefined) ?? legacyMatch?.id ?? null;

  const [activeChatId, setActiveChatId] = useState<string | null>(initialId);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<InboxTab>("inbox");
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">(initialId ? "thread" : "list");

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!chatMenuRef.current?.contains(event.target as Node)) setChatMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const activeChat = conversations.find((c) => c.id === activeChatId) ?? null;
  const activeOther = activeChat ? getParticipant(activeChat.participantIds.find((id) => id !== OWNER_PARTICIPANT_ID) ?? "") : undefined;

  const selectChat = (id: string) => {
    setActiveChatId(id);
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
    setChatMenuOpen(false);
    setMobileView("thread");
    markConversationReadFor(id, OWNER_PARTICIPANT_ID);
  };

  const backToList = () => setMobileView("list");

  const searchedConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) => {
      const other = getParticipant(c.participantIds.find((id) => id !== OWNER_PARTICIPANT_ID) ?? "");
      return other?.name.toLowerCase().includes(query) || contextSubtitle(c.context).toLowerCase().includes(query);
    });
  }, [conversations, searchQuery]);

  const visibleConversations = useMemo(() => {
    return searchedConversations
      .filter((c) => {
        const unread = hasUnread(c);
        if (activeTab === "unread") return unread;
        if (activeTab === "read") return !unread;
        return true;
      })
      .sort((a, b) => lastActivity(b) - lastActivity(a));
  }, [searchedConversations, activeTab]);

  function hasUnread(conversation: Conversation) {
    const lastRead = conversation.lastReadTs[OWNER_PARTICIPANT_ID] ?? 0;
    return conversation.messages.some((m) => m.senderId !== OWNER_PARTICIPANT_ID && m.ts > lastRead);
  }

  const threadQuery = threadSearchQuery.trim();
  const threadMessages = useMemo(() => {
    if (!activeChat) return [];
    if (!threadQuery) return activeChat.messages;
    return activeChat.messages.filter((m) => m.text.toLowerCase().includes(threadQuery.toLowerCase()));
  }, [activeChat, threadQuery]);

  const threadRenderItems = useMemo(() => {
    const items: Array<{ text: string; ts: number; senderId: string; showDate: boolean; dateLabel: string }> = [];
    let lastDate: string | null = null;
    threadMessages.forEach((message) => {
      const label = dateLabel(message.ts);
      items.push({ text: message.text, ts: message.ts, senderId: message.senderId, showDate: label !== lastDate, dateLabel: label });
      lastDate = label;
    });
    return items;
  }, [threadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeChatId, threadMessages.length]);

  function send() {
    if (!newMessage.trim() || !activeChat) return;
    sendMessageAs(activeChat.id, OWNER_PARTICIPANT_ID, newMessage.trim());
    setNewMessage("");
  }

  const info = activeChat ? contextInfo(activeChat.context) : null;

  return (
    <OwnerDashboardShell>
      <section className="px-0 pb-0 lg:h-[calc(100svh-5rem)] lg:overflow-hidden">
        <div className="flex h-full min-h-160 flex-col bg-white lg:flex-1">
          <div className="flex min-h-0 flex-1">
            {/* Conversations list ------------------------------------------------ */}
            <aside className={`${mobileView === "thread" ? "hidden" : "flex"} w-full shrink-0 flex-col md:flex md:w-90`}>
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
                <Link href="/owner-dashboard" aria-label="Back to Overview" className="text-black/50 transition-colors hover:text-black">
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </Link>
                <h1 className="font-bricolage flex-1 text-2xl font-bold tracking-tight">Messages</h1>
              </div>

              <div className="px-5 pb-4">
                <label className="catalogue-location-filter flex items-center gap-2 px-4">
                  <span className="sr-only">Search messages</span>
                  <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center gap-1.5 px-5 pb-4">
                {INBOX_TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors ${
                        isActive ? "border-black bg-black text-white" : "border-black/15 bg-white text-black/70 hover:border-black/30 hover:text-black"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-black/10" />

              <div className="flex-1 overflow-y-auto p-2.5">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <h3 className="font-bricolage text-lg font-bold text-black">No messages yet</h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/50">Your conversations with renters and property professionals will appear here.</p>
                  </div>
                ) : visibleConversations.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    {searchQuery.trim() ? <Search aria-hidden="true" className="mb-3 size-8 text-black/20" /> : null}
                    <h3 className="font-bricolage text-lg font-bold text-black">
                      {searchQuery.trim() ? `No results found for "${searchQuery.trim()}"` : activeTab === "unread" ? "No Unread Messages" : "No Messages"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/50">
                      {searchQuery.trim() ? "Try a different name or property, or clear your search." : "You're all caught up."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {visibleConversations.map((convo) => {
                      const other = getParticipant(convo.participantIds.find((id) => id !== OWNER_PARTICIPANT_ID) ?? "");
                      if (!other) return null;
                      const isActive = convo.id === activeChatId;
                      const last = lastMessage(convo);
                      const unread = hasUnread(convo);
                      return (
                        <button
                          key={convo.id}
                          onClick={() => selectChat(convo.id)}
                          className={`flex w-full gap-3.5 rounded-2xl border border-transparent p-3.5 text-left transition-all duration-150 ${
                            isActive ? "bg-black/5" : "bg-transparent hover:bg-black/3"
                          }`}
                        >
                          <div className="relative size-11 shrink-0">
                            <ConversationAvatar participant={other} className="size-11 border border-neutral-100 text-base" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h3 className={`flex min-w-0 items-center gap-1 text-sm font-semibold ${unread ? "text-black" : "text-neutral-900"}`}>
                                <span className="truncate">{other.name}</span>
                                {other.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                              </h3>
                              <span className="shrink-0 text-[9px] font-medium text-neutral-400">{last ? relativeLabel(last.ts) : ""}</span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] font-medium text-neutral-500">{contextSubtitle(convo.context) || other.role}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className={`flex-1 truncate text-xs ${unread ? "text-black" : "text-neutral-600"}`}>{last?.text ?? "Start a conversation"}</p>
                              {unread ? <span className="size-2 shrink-0 rounded-full bg-black" aria-label="Unread" /> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <div className="hidden w-px shrink-0 border-r border-black/10 md:block" />

            {/* Active thread ------------------------------------------------------ */}
            <section className={`${mobileView === "list" ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}>
              {activeChat && activeOther ? (
                <div className="flex h-16 shrink-0 items-center gap-3 border-b border-black/10 px-4 md:px-6">
                  {threadSearchOpen ? (
                    <>
                      <span className="catalogue-location-filter flex min-w-0 flex-1 items-center gap-2 px-4">
                        <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                        <input
                          autoFocus
                          value={threadSearchQuery}
                          onChange={(e) => setThreadSearchQuery(e.target.value)}
                          placeholder={`Search in conversation with ${activeOther.name}`}
                          className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </span>
                      <button
                        type="button"
                        aria-label="Close search"
                        onClick={() => {
                          setThreadSearchOpen(false);
                          setThreadSearchQuery("");
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                      >
                        <ChevronDown aria-hidden="true" className="size-4.5 rotate-45" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={backToList}
                        aria-label="Back to conversations"
                        className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black md:hidden"
                      >
                        <ChevronLeft aria-hidden="true" className="size-5" />
                      </button>
                      <ConversationAvatar participant={activeOther} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-sm font-semibold text-black">
                          <span className="truncate">{activeOther.name}</span>
                          {activeOther.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                        </p>
                        <p className="truncate text-xs text-black/50">
                          {activeOther.role}
                          {activeChat.context?.propertyId ? ` · ${propertyTitle(activeChat.context.propertyId)}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Search in conversation"
                        onClick={() => setThreadSearchOpen(true)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                      >
                        <Search aria-hidden="true" className="size-4.5" />
                      </button>
                      {info ? (
                        <div ref={chatMenuRef} className="relative shrink-0">
                          <button
                            type="button"
                            aria-label="More options"
                            onClick={() => setChatMenuOpen((open) => !open)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                          >
                            <MoreVertical aria-hidden="true" className="size-4.5" />
                          </button>
                          {chatMenuOpen ? (
                            <div className="absolute top-[calc(100%+0.5rem)] right-0 z-20 w-52 rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                              <Link
                                href={info.href}
                                onClick={() => setChatMenuOpen(false)}
                                className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-black/75 transition-colors hover:bg-black/5"
                              >
                                {info.label}
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {activeChat && activeOther ? (
                threadQuery && threadMessages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <p className="font-bricolage text-lg font-bold text-black">No messages found</p>
                    <p className="text-sm text-black/50">Nothing matches &quot;{threadQuery}&quot; in this conversation.</p>
                  </div>
                ) : threadRenderItems.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <p className="font-bricolage text-lg font-bold text-black">Start a conversation</p>
                    <p className="text-sm text-black/50">Send {activeOther.name.split(" ")[0]} a message below.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto bg-neutral-100 px-4 py-3">
                    {threadRenderItems.map((item, index) => {
                      const isOwner = item.senderId === OWNER_PARTICIPANT_ID;
                      return (
                        <div key={index}>
                          {item.showDate ? (
                            <div className="flex justify-center py-2">
                              <span className="text-[10px] font-semibold tracking-wide text-black/40 uppercase">{item.dateLabel}</span>
                            </div>
                          ) : null}
                          <div className={`flex py-0.5 ${isOwner ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[65%] rounded-lg px-2.5 py-1.5 text-sm ${
                                isOwner ? "rounded-tr-none bg-black text-white" : "rounded-tl-none bg-white text-neutral-900"
                              }`}
                            >
                              <span className="leading-snug wrap-break-word">{item.text}</span>
                              <span className={`float-right mt-1 ml-2 text-[10px] font-medium ${isOwner ? "text-white/60" : "text-neutral-400"}`}>{timeLabel(item.ts)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <MessageCircle aria-hidden="true" className="size-14 text-black" strokeWidth={1.5} />
                  <h2 className="font-bricolage text-xl font-bold text-black">Select a conversation</h2>
                  <p className="text-sm text-black/50">Choose a conversation from the list to view messages.</p>
                </div>
              )}

              {activeChat && activeOther ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="flex items-center gap-3 bg-neutral-100 p-4"
                >
                  <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-black/15 bg-white px-4 transition-colors focus-within:border-black">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${activeOther.name.split(" ")[0]}`}
                      className="message-composer-control min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-black/40"
                    />
                    <VoiceInputButton onTranscript={(t) => setNewMessage((prev) => (prev ? `${prev} ${t}` : t))} />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    aria-label="Send message"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white transition-all hover:bg-neutral-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}
