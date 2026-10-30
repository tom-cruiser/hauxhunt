"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Send,
} from "lucide-react";

type EnquiryStatus = "New" | "Unreplied" | "Visit scheduled" | "Replied";

type Enquiry = {
  id: number;
  name: string;
  initials: string;
  email: string;
  phone: string;
  property: string;
  location: string;
  received: string;
  status: EnquiryStatus;
  message: string;
  moveIn: string;
  occupants: string;
  viewing: string | null;
};

type Conversation = {
  id: number;
  name: string;
  initials: string;
  property: string;
  time: string;
  unread: boolean;
  messages: Array<{ sender: "renter" | "partner"; text: string; time: string }>;
};

const INITIAL_ENQUIRIES: Enquiry[] = [
  {
    id: 1,
    name: "Aline Uwase",
    initials: "AU",
    email: "aline.uwase@example.com",
    phone: "+250 788 204 118",
    property: "Modern 3-bedroom house",
    location: "Kacyiru, Kigali",
    received: "12 min ago",
    status: "New",
    message:
      "Hello, is the house still available? We are relocating to Kigali and would like to view it this week if possible.",
    moveIn: "01 Sep 2026",
    occupants: "2 adults, 1 child",
    viewing: null,
  },
  {
    id: 2,
    name: "David Kimani",
    initials: "DK",
    email: "david.kimani@example.com",
    phone: "+254 712 480 306",
    property: "Bright two-bedroom apartment",
    location: "Kilimani, Nairobi",
    received: "38 min ago",
    status: "Unreplied",
    message:
      "Could you confirm whether utilities and parking are included in the monthly rent? I am available after work.",
    moveIn: "15 Aug 2026",
    occupants: "2 adults",
    viewing: null,
  },
  {
    id: 3,
    name: "Chidera Okafor",
    initials: "CO",
    email: "chidera.okafor@example.com",
    phone: "+234 803 114 7290",
    property: "Waterfront apartment",
    location: "Ikoyi, Lagos",
    received: "Yesterday",
    status: "Visit scheduled",
    message:
      "Thank you for the details. Friday afternoon works well for me and my partner. Please share the entrance instructions.",
    moveIn: "01 Oct 2026",
    occupants: "2 adults",
    viewing: "Fri, 14 Aug · 2:30 PM",
  },
  {
    id: 4,
    name: "Maya Thompson",
    initials: "MT",
    email: "maya.thompson@example.com",
    phone: "+250 783 641 920",
    property: "Lake-view residence",
    location: "Gisenyi, Rwanda",
    received: "Yesterday",
    status: "Replied",
    message:
      "Is a six-month lease possible? I am looking for a furnished home while completing a project in Rwanda.",
    moveIn: "20 Aug 2026",
    occupants: "1 adult",
    viewing: null,
  },
  {
    id: 5,
    name: "Eric Mugisha",
    initials: "EM",
    email: "eric.mugisha@example.com",
    phone: "+250 790 332 504",
    property: "Family home with garden",
    location: "Gacuriro, Kigali",
    received: "02 Aug 2026",
    status: "Visit scheduled",
    message:
      "We would like to see the garden and understand the maintenance arrangements before applying.",
    moveIn: "01 Sep 2026",
    occupants: "2 adults, 2 children",
    viewing: "Mon, 10 Aug · 10:00 AM",
  },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    name: "Keza Niyonsaba",
    initials: "KN",
    property: "Modern 3-bedroom house",
    time: "8 min ago",
    unread: true,
    messages: [
      {
        sender: "renter",
        text: "Hi, I saved this house yesterday. Could you confirm whether the garden is private?",
        time: "10:18 AM",
      },
    ],
  },
  {
    id: 2,
    name: "Samuel Adeyemi",
    initials: "SA",
    property: "Waterfront apartment",
    time: "26 min ago",
    unread: true,
    messages: [
      {
        sender: "partner",
        text: "The apartment is available from September. Would you like to arrange a visit?",
        time: "9:42 AM",
      },
      {
        sender: "renter",
        text: "Yes, Saturday morning would work well for me.",
        time: "10:00 AM",
      },
    ],
  },
  {
    id: 3,
    name: "Wanjiku Kamau",
    initials: "WK",
    property: "Bright two-bedroom apartment",
    time: "Yesterday",
    unread: false,
    messages: [
      {
        sender: "renter",
        text: "Thank you for confirming the parking space. I will review the application requirements.",
        time: "Yesterday, 4:12 PM",
      },
    ],
  },
  {
    id: 4,
    name: "Ishimwe Patrick",
    initials: "IP",
    property: "Lake-view residence",
    time: "07 Aug",
    unread: false,
    messages: [
      {
        sender: "partner",
        text: "I have shared the updated availability and lease terms with you.",
        time: "07 Aug, 2:20 PM",
      },
    ],
  },
];

const VIEWINGS = [
  {
    day: 1,
    time: "10:00",
    name: "Eric Mugisha",
    property: "Family home with garden",
    tone: "black",
  },
  {
    day: 2,
    time: "16:30",
    name: "Aline Uwase",
    property: "Modern 3-bedroom house",
    tone: "light",
  },
  {
    day: 4,
    time: "11:00",
    name: "David Kimani",
    property: "Bright two-bedroom apartment",
    tone: "light",
  },
  {
    day: 5,
    time: "14:30",
    name: "Chidera Okafor",
    property: "Waterfront apartment",
    tone: "black",
  },
  {
    day: 6,
    time: "09:30",
    name: "Maya Thompson",
    property: "Lake-view residence",
    tone: "light",
  },
] as const;

export function EnquiriesCalendarDashboard({
  initialView = "enquiries",
}: {
  initialView?: "enquiries" | "messages" | "visits";
}) {
  const [view, setView] = useState<"enquiries" | "messages" | "visits">(
    initialView,
  );
  const [enquiries, setEnquiries] = useState(INITIAL_ENQUIRIES);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState(1);
  const [selectedConversationId, setSelectedConversationId] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [reply, setReply] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const selected =
    enquiries.find((enquiry) => enquiry.id === selectedId) ?? enquiries[0];
  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ?? conversations[0];
  const filteredEnquiries = enquiries.filter((enquiry) => {
    return statusFilter === "All" || enquiry.status === statusFilter;
  });
  const weekDays = useMemo(() => {
    const start = new Date(2026, 7, 9 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [weekOffset]);

  function markReplied() {
    if (!reply.trim()) return;
    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === selected.id
          ? { ...enquiry, status: "Replied" }
          : enquiry,
      ),
    );
    setReply("");
  }

  function scheduleViewing() {
    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === selected.id
          ? {
              ...enquiry,
              status: "Visit scheduled",
              viewing: "Tue, 11 Aug · 4:30 PM",
            }
          : enquiry,
      ),
    );
    setView("visits");
  }

  function sendMessage() {
    if (!messageDraft.trim()) return;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              unread: false,
              messages: [
                ...conversation.messages,
                {
                  sender: "partner",
                  text: messageDraft.trim(),
                  time: "Just now",
                },
              ],
            }
          : conversation,
      ),
    );
    setMessageDraft("");
  }

  return (
    <section className="px-5 pt-0 pb-8 sm:px-6 lg:h-[calc(100svh-5rem)] lg:overflow-hidden lg:px-10 lg:pb-0 xl:px-12">
      <div className="mx-auto max-w-[1360px] lg:flex lg:h-full lg:flex-col">
        {initialView !== "messages" ? (
          <div className="flex shrink-0 justify-end py-3">
            <div className="flex rounded-full bg-white p-1 shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
              {(["enquiries", "visits"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={`h-9 rounded-full px-4 text-xs font-medium transition-colors ${view === item ? "bg-black text-white" : "text-black/45 hover:text-black"}`}
                >
                  {item === "enquiries" ? "Enquiries" : "Calendar"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {view === "enquiries" ? (
          <div className="grid min-h-[680px] overflow-hidden border border-black/10 bg-white lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
            <aside className="flex flex-col border-b border-black/10 lg:min-h-0 lg:overflow-hidden lg:border-r lg:border-b-0">
              <div className="border-b border-black/10 p-3">
                <div className="overflow-x-auto">
                  <div className="flex min-w-max items-center gap-1.5">
                    {[
                      "All",
                      "New",
                      "Unreplied",
                      "Visit scheduled",
                      "Replied",
                    ].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusFilter(status)}
                        aria-pressed={statusFilter === status}
                        className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${statusFilter === status ? "bg-black text-white" : "bg-black/[0.035] text-black/55 hover:text-black"}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain">
                {filteredEnquiries.map((enquiry) => (
                  <button
                    key={enquiry.id}
                    type="button"
                    onClick={() => setSelectedId(enquiry.id)}
                    className={`relative block w-full border-b border-black/8 p-5 text-left transition-colors ${selected.id === enquiry.id ? "bg-black/[0.055] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-black" : "hover:bg-black/[0.025]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
                        {enquiry.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <strong className="truncate text-sm font-medium">
                            {enquiry.name}
                          </strong>
                          <span className="shrink-0 text-[0.68rem] text-black/38">
                            {enquiry.received}
                          </span>
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
                {filteredEnquiries.length === 0 ? (
                  <p className="p-8 text-center text-sm text-black/45">
                    No enquiries match this filter.
                  </p>
                ) : null}
              </div>
            </aside>

            <EnquirySheet
              enquiry={selected}
              reply={reply}
              onReplyChange={setReply}
              onSend={markReplied}
              onSchedule={scheduleViewing}
            />
          </div>
        ) : view === "messages" ? (
          <MessagesWorkspace
            conversations={conversations}
            selected={selectedConversation}
            draft={messageDraft}
            onSelect={(id) => {
              setSelectedConversationId(id);
              setConversations((current) =>
                current.map((conversation) =>
                  conversation.id === id
                    ? { ...conversation, unread: false }
                    : conversation,
                ),
              );
            }}
            onDraftChange={setMessageDraft}
            onSend={sendMessage}
            onSchedule={() => setView("visits")}
          />
        ) : (
          <CalendarWorkspace
            days={weekDays}
            weekOffset={weekOffset}
            onBack={() =>
              setView(initialView === "messages" ? "messages" : "enquiries")
            }
            onPrevious={() => setWeekOffset((offset) => offset - 1)}
            onNext={() => setWeekOffset((offset) => offset + 1)}
            onToday={() => setWeekOffset(0)}
          />
        )}
      </div>
    </section>
  );
}

function MessagesWorkspace({
  conversations,
  selected,
  draft,
  onSelect,
  onDraftChange,
  onSend,
  onSchedule,
}: {
  conversations: Conversation[];
  selected: Conversation;
  draft: string;
  onSelect: (id: number) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSchedule: () => void;
}) {
  return (
    <div className="grid min-h-[680px] overflow-hidden border border-black/10 bg-white lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
      <aside className="flex flex-col border-b border-black/10 lg:min-h-0 lg:overflow-hidden lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between border-b border-black/10 px-5">
          <div>
            <p className="text-sm font-medium">Member conversations</p>
            <p className="mt-1 text-xs text-black/40">
              Registered RentUp users
            </p>
          </div>
          <span className="flex size-7 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
            {conversations.filter((conversation) => conversation.unread).length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain">
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages.at(-1);
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={`relative block w-full border-b border-black/8 p-5 text-left transition-colors ${selected.id === conversation.id ? "bg-black/[0.055] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-black" : "hover:bg-black/[0.025]"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
                    {conversation.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <strong className="truncate text-sm font-medium">
                        {conversation.name}
                      </strong>
                      <span className="shrink-0 text-[0.68rem] text-black/38">
                        {conversation.time}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-black/42">
                      {lastMessage?.text}
                    </span>
                  </span>
                  {conversation.unread ? (
                    <span className="size-2 shrink-0 rounded-full bg-black" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col lg:h-full">
        <div className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
              {selected.initials}
            </span>
            <div>
              <h2 className="font-bricolage text-xl font-medium">
                {selected.name}
              </h2>
              <p className="mt-0.5 text-xs text-black/42">
                Registered member · Profile verified
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSchedule}
            className="h-10 border border-black/12 px-4 text-xs font-medium hover:bg-black/[0.035]"
          >
            Schedule visit
          </button>
        </div>
        <div className="border-b border-black/10 px-6 py-3 text-sm sm:px-8">
          <span className="text-black/40">Property · </span>
          <span className="font-medium">{selected.property}</span>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto bg-black/[0.018] px-6 py-6 sm:px-8">
          {selected.messages.map((message, index) => (
            <div
              key={`${message.time}-${index}`}
              className={`flex ${message.sender === "partner" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] px-4 py-3 text-sm leading-6 ${message.sender === "partner" ? "bg-black text-white" : "border border-black/10 bg-white"}`}
              >
                <p>{message.text}</p>
                <p
                  className={`mt-2 text-[0.65rem] ${message.sender === "partner" ? "text-white/45" : "text-black/35"}`}
                >
                  {message.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-black/10 p-4 sm:px-6">
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={`Message ${selected.name.split(" ")[0]}`}
              className="min-h-12 flex-1 resize-none bg-black/[0.035] px-4 py-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="flex size-12 shrink-0 items-center justify-center bg-black text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EnquirySheet({
  enquiry,
  reply,
  onReplyChange,
  onSend,
  onSchedule,
}: {
  enquiry: Enquiry;
  reply: string;
  onReplyChange: (value: string) => void;
  onSend: () => void;
  onSchedule: () => void;
}) {
  return (
    <section className="relative min-w-0 px-6 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:px-10 lg:pt-6 lg:pb-10">
      <div className="bg-carbon-50 absolute top-0 right-0 size-12 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
      <div className="flex flex-col gap-3 border-b border-black/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-black text-[0.68rem] font-medium text-white">
            {enquiry.initials}
          </span>
          <div>
            <h2 className="font-bricolage text-xl font-medium">
              {enquiry.name}
            </h2>
            <p className="mt-1 text-sm text-black/45">
              {enquiry.email} · {enquiry.phone}
            </p>
          </div>
        </div>
      </div>

      <div className="py-8">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-black/38 uppercase">
            Enquiry message
          </p>
          <blockquote className="font-bricolage mt-4 max-w-2xl text-[clamp(1.05rem,1.5vw,1.4rem)] leading-[1.5] tracking-[-0.015em]">
            “{enquiry.message}”
          </blockquote>
        </div>
        <dl className="mt-7 grid divide-y divide-black/10 border-y border-black/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SheetFact label="Preferred move-in" value={enquiry.moveIn} />
          <SheetFact label="Household" value={enquiry.occupants} />
          <SheetFact
            label={enquiry.viewing ? "Visit scheduled" : "Visit"}
            value={enquiry.viewing ?? "Not scheduled"}
          />
        </dl>
      </div>

      <div className="border-y border-black/10 py-5">
        <p className="text-xs font-medium tracking-[0.12em] text-black/38 uppercase">
          Property
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">{enquiry.property}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-black/45">
              <MapPin className="size-3.5" />
              {enquiry.location}
            </p>
          </div>
          <button
            type="button"
            onClick={onSchedule}
            className="h-11 bg-black px-5 text-sm font-medium text-white"
          >
            Schedule visit
          </button>
        </div>
      </div>

      <div className="mt-7">
        <label
          htmlFor="enquiry-reply"
          className="text-xs font-medium tracking-[0.12em] text-black/38 uppercase"
        >
          Reply
        </label>
        <textarea
          id="enquiry-reply"
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          placeholder={`Reply to ${enquiry.name.split(" ")[0]}`}
          className="mt-3 min-h-32 w-full resize-y bg-black/[0.035] p-4 text-sm leading-6 outline-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSend}
            disabled={!reply.trim()}
            className="flex h-11 items-center gap-2 bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="size-4" />
            Send reply
          </button>
        </div>
      </div>
    </section>
  );
}

function SheetFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 sm:px-5 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-xs text-black/38">{label}</dt>
      <dd className="mt-1.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function CalendarWorkspace({
  days,
  weekOffset,
  onBack,
  onPrevious,
  onNext,
  onToday,
}: {
  days: Date[];
  weekOffset: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const label = `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return (
    <section className="flex min-h-[680px] flex-col border border-black/10 bg-white lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 p-5 sm:px-7">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to enquiries"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 hover:bg-black/[0.04]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-black/38 uppercase">
              Visit calendar
            </p>
            <h2 className="font-bricolage mt-2 text-2xl font-medium">
              {label}
            </h2>
          </div>
        </div>
        <div className="flex items-center border border-black/10">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous week"
            className="flex size-10 items-center justify-center hover:bg-black/[0.04]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-10 border-x border-black/10 px-4 text-sm font-medium"
          >
            {weekOffset === 0 ? "This week" : "Today"}
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next week"
            className="flex size-10 items-center justify-center hover:bg-black/[0.04]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-[980px] grid-cols-7">
          {days.map((day, index) => (
            <div
              key={day.toISOString()}
              className="min-h-[520px] border-r border-black/10 last:border-r-0"
            >
              <div
                className={`border-b border-black/10 p-4 ${weekOffset === 0 && index === 0 ? "bg-black text-white" : ""}`}
              >
                <p className="text-xs opacity-50">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className="font-bricolage mt-1 text-2xl font-medium">
                  {day.getDate()}
                </p>
              </div>
              <div className="space-y-3 p-3">
                {weekOffset === 0 &&
                  VIEWINGS.filter((viewing) => viewing.day === index).map(
                    (viewing) => (
                      <article
                        key={`${viewing.name}-${viewing.time}`}
                        className={`border-l-4 p-3 ${viewing.tone === "black" ? "border-black bg-black text-white" : "border-black/25 bg-black/[0.045]"}`}
                      >
                        <p className="flex items-center gap-1.5 text-[0.68rem] opacity-55">
                          <Clock3 className="size-3" />
                          {viewing.time}
                        </p>
                        <p className="mt-3 text-xs font-medium">
                          {viewing.name}
                        </p>
                        <p className="mt-1 text-[0.68rem] leading-4 opacity-55">
                          {viewing.property}
                        </p>
                      </article>
                    ),
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-6 border-t border-black/10 px-5 py-4 text-xs text-black/45 sm:px-7">
        <span className="flex items-center gap-2">
          <CalendarDays className="size-3.5" />5 confirmed visits
        </span>
        <span className="flex items-center gap-2">
          <Mail className="size-3.5" />3 awaiting confirmation
        </span>
        <span className="flex items-center gap-2">
          <Check className="size-3.5" />
          No scheduling conflicts
        </span>
        <span className="flex items-center gap-2">
          <MessageSquare className="size-3.5" />
          Reminders sent automatically
        </span>
      </div>
    </section>
  );
}
