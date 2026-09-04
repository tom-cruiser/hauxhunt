"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Send,
  ChevronLeft,
  ChevronDown,
  MessageCircle,
  Search,
  Phone,
  Plus,
  X,
  ImagePlus,
  FileText,
  Camera,
  BadgeCheck,
  MoreVertical,
} from "lucide-react";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { useTranslation } from "@/components/language/use-translation";
import { PUBLIC_FLATMATES, formatRwf } from "@/data/public-flatmates";
import {
  getStoredThreads,
  isThreadRead,
  markThreadRead,
  recordSentMessage,
  SEED_THREAD_UNREAD_COUNTS,
  slugify,
  type ConversationContext,
  type ConversationContextType,
} from "@/lib/message-threads";
import patrickManagerPortrait from "@/assets/images/flatmate-patrick.png";
import jeanOwnerPortrait from "@/assets/images/flatmate-joseph.jpg";
import hauxhuntWhiteLogo from "@/assets/images/HauxHunt_white.png";
import { resolveAnyPropertyTitle } from "@/lib/professional-properties";
import { OWNER } from "@/lib/owner-data";
import { getProfessionalByName } from "@/lib/team-data";
import {
  OWNER_PARTICIPANT_ID,
  RENTER_PARTICIPANT_ID,
  getConversationsFor as getSharedConversationsFor,
  getOrCreateConversation as getOrCreateSharedConversation,
  getParticipant,
  hasUnreadFor,
  markConversationReadFor,
  sendMessageAs,
  subscribeToMessages,
  type Conversation as SharedConversation,
  type ConversationContextType as SharedContextType,
} from "@/lib/messages-data";

// Shape of useTranslation()'s `t` — threaded as a plain parameter into the
// several module-level (non-hook) helper functions below that need it.
type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Attachment = {
  kind: "image" | "document";
  name: string;
  url: string;
};

type Message = {
  sender: "user" | "them";
  text: string;
  timestamp: string;
  // Real epoch time — used to sort the conversation list and to group
  // messages under date separators. `timestamp` above is just the display
  // label ("Yesterday", "2:40 PM").
  ts: number;
  // "system" messages are lifecycle events ("Viewing confirmed"), rendered
  // as a centered pill instead of a chat bubble. Defaults to "chat".
  kind?: "chat" | "system";
  attachment?: Attachment;
};

type ConversationType = "flatmate" | "landlord" | "manager" | "support";

type Conversation = {
  id: string;
  name: string;
  avatar?: any;
  role: string; // "Property Manager", "Agent", "Maintenance Technician", "Flatmate", "HauxHunt Support"
  verified?: boolean;
  showPhone: boolean;
  type: ConversationType; // filter bucket for the "More…" dropdown
  subtitle: string; // short line shown in the conversation list row only
  metaContext: string; // short list-row badge
  context: ConversationContext; // what this thread is actually about, right now
  // How many messages in this thread haven't been seen yet — shown as a
  // number badge on the list row instead of the old static context label.
  unreadCount: number;
  phone: string;
  messages: Message[];
  flatmateDetails?: {
    budget: string;
    areas: string;
    situation: string;
  };
  // Renter Messages Integration phase (Phase 5.5) -- Section 39: explicit
  // discriminant so send/read logic knows which store owns this thread.
  // Absent (undefined) means "legacy", exactly like every Conversation
  // literal already in this file before this phase -- none of them needed
  // to change. Only adaptSharedConversation() below ever sets "shared".
  source?: "shared";
};

const COUNTRY_CALLING_CODES: Record<string, string> = {
  Rwanda: "+250",
  Kenya: "+254",
  Nigeria: "+234",
  Uganda: "+256",
};

// Demo data has no real phone numbers on file, so derive a stable, plausible-looking
// one per conversation (same id always produces the same number).
function demoPhoneNumber(seed: string, countryCode: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const local = String(700000000 + (hash % 99999999)).padStart(9, "0").slice(0, 9);
  return `${countryCode} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`;
}

const INBOX_TABS = ["inbox", "unread", "read"] as const;

type InboxTab = (typeof INBOX_TABS)[number];

// Translation-KEY map (not resolved text) — this sits at module scope,
// outside the component, so it can't call useTranslation() itself; the key
// is resolved with t() wherever a tab is actually rendered.
const INBOX_TAB_LABEL_KEYS: Record<InboxTab, string> = {
  inbox: "renterDashboard.messages.sidebar.tabs.all",
  unread: "renterDashboard.messages.sidebar.tabs.unread",
  read: "renterDashboard.messages.sidebar.tabs.read",
};

const MORE_FILTERS: ConversationType[] = ["flatmate", "manager", "landlord", "support"];

// Same translation-key-map pattern as INBOX_TAB_LABEL_KEYS above.
const MORE_FILTER_LABEL_KEYS: Record<ConversationType, string> = {
  flatmate: "renterDashboard.messages.sidebar.filters.flatmateMatches",
  manager: "renterDashboard.messages.sidebar.filters.listingEnquiries",
  landlord: "renterDashboard.messages.sidebar.filters.myRental",
  support: "renterDashboard.messages.sidebar.filters.propertySearch",
};

// Short, restrained badge label per context type — shown on the conversation
// list row and used to build the fuller "Viewing · Confirmed" status line in
// the context card.
const CONTEXT_BADGE: Record<ConversationContextType, string> = {
  "property-enquiry": "Listing Enquiry",
  viewing: "Viewing",
  application: "Application",
  "rental-setup": "Rental Setup",
  "active-rental": "Active Rental",
  maintenance: "Maintenance",
  flatmate: "Flatmate Match",
  support: "Support",
};

// Which filter bucket a context type belongs under in the "More…" dropdown.
function bucketForContext(type: ConversationContextType): ConversationType {
  if (type === "flatmate") return "flatmate";
  if (type === "support") return "support";
  if (type === "property-enquiry") return "manager";
  return "landlord";
}

// Renter Messages Integration phase (Phase 5.5) -- Section 12/39: the one
// place a messages-data.ts Conversation becomes this page's own row shape,
// so every existing list/search/sort/thread/composer/context-card function
// below keeps working unmodified on the result. The shared Conversation
// itself is never mutated or converted back into a name-keyed record --
// this only ever produces a read-oriented view of it.
function toLocalContextType(type: SharedContextType | undefined): ConversationContextType {
  switch (type) {
    case "application":
      return "application";
    case "rental":
      return "active-rental";
    case "rental-setup":
      return "rental-setup";
    case "maintenance":
      return "maintenance";
    default:
      return "property-enquiry";
  }
}

// No real epoch-to-"2:40 PM"-style display string exists on a fresh shared
// message beyond its own `ts` -- this mirrors the exact style
// (Today/Yesterday/relative) the rest of this file's demo data already
// uses, computed once here rather than inventing a second time-formatting
// convention.
function relativeTimestamp(ts: number, t: Translate): string {
  const diff = Date.now() - ts;
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;
  if (diff < HOUR) return t("renterDashboard.messages.time.justNow");
  // A same-day clock time already follows the browser locale via
  // toLocaleTimeString — left alone, unrelated to this app's language switcher.
  if (diff < DAY) return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 2 * DAY) return t("renterDashboard.notificationsDrawer.groupYesterday");
  return t("renterDashboard.messages.time.daysAgo", { count: Math.floor(diff / DAY) });
}

function adaptSharedConversation(conversation: SharedConversation, t: Translate): Conversation {
  const other = getParticipant(conversation.participantIds.find((id) => id !== RENTER_PARTICIPANT_ID) ?? "");
  const name = other?.name ?? "Unknown";
  const role = other?.role ?? "";
  const localType = toLocalContextType(conversation.context?.type);
  const propertyName = conversation.context?.propertyId ? resolveAnyPropertyTitle(conversation.context.propertyId) : undefined;
  const context: ConversationContext = {
    type: localType,
    propertyName,
    propertyId: conversation.context?.propertyId,
    refId: conversation.context?.applicationId ?? conversation.context?.rentalId ?? conversation.context?.maintenanceRequestId,
  };
  const headline = propertyName ?? conversation.context?.label;
  return {
    id: conversation.id,
    name,
    avatar: other?.avatar,
    role,
    verified: other?.verified,
    // No phone number exists on a shared Participant (Section 38) -- never
    // fabricated, the call action just doesn't render for these rows.
    showPhone: false,
    type: bucketForContext(localType),
    subtitle: headline ? `${headline} · ${role}` : role,
    metaContext: conversation.context?.label ?? role,
    context,
    unreadCount: hasUnreadFor(conversation, RENTER_PARTICIPANT_ID) ? 1 : 0,
    phone: "",
    messages: conversation.messages.map((m) => ({
      sender: m.senderId === RENTER_PARTICIPANT_ID ? "user" : "them",
      text: m.text,
      timestamp: relativeTimestamp(m.ts, t),
      ts: m.ts,
      kind: "chat",
    })),
    source: "shared",
  };
}

// The one contextual action a conversation offers — at most one primary CTA,
// intentionally not a toolbar of actions. Returns a translation key rather
// than resolved text (this function sits outside the component, so it can't
// call useTranslation() itself) — resolved with t() at the render site.
function contextCta(context: ConversationContext): { labelKey: string; href: string } | null {
  switch (context.type) {
    case "property-enquiry":
      return context.propertyId
        ? { labelKey: "renterDashboard.messages.contextActions.viewProperty", href: `/properties/${context.propertyId}?from=renter` }
        : null;
    case "viewing":
      return { labelKey: "renterDashboard.messages.contextActions.viewViewing", href: "/renter-dashboard/visits" };
    case "application":
      return {
        labelKey: "renterDashboard.messages.contextActions.viewApplication",
        href: context.refId ? `/renter-dashboard/applications/${context.refId}` : "/renter-dashboard/applications",
      };
    case "rental-setup":
      return {
        labelKey: "renterDashboard.messages.contextActions.continueSetup",
        href: context.refId ? `/renter-dashboard/rental-setup/${context.refId}` : "/renter-dashboard/rentals",
      };
    case "active-rental":
      return {
        labelKey: "renterDashboard.messages.contextActions.viewRental",
        href: context.refId ? `/renter-dashboard/rentals/${context.refId}` : "/renter-dashboard/rentals",
      };
    case "maintenance":
      return {
        labelKey: "renterDashboard.messages.contextActions.viewRequest",
        href: context.refId ? `/renter-dashboard/maintenance/${context.refId}` : "/renter-dashboard/maintenance",
      };
    case "flatmate":
      return context.refId
        ? { labelKey: "renterDashboard.messages.contextActions.viewProfile", href: `/flatmates/${context.refId}?from=renter` }
        : null;
    default:
      return null;
  }
}

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 560;
const SIDEBAR_DEFAULT_WIDTH = 400;

function ConversationAvatar({
  avatar,
  name,
  className,
}: {
  avatar?: any;
  name: string;
  className: string;
}) {
  if (avatar) {
    return (
      <div className={`relative overflow-hidden rounded-full bg-black ${className}`}>
        <Image src={avatar} alt={name} fill className="object-cover" />
      </div>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full bg-black font-bricolage font-bold text-white ${className}`}
    >
      {initial}
    </div>
  );
}

function messagePreview(message: Message | undefined, t: Translate) {
  if (!message) return t("renterDashboard.messages.sidebar.noMessagesYet");
  if (message.text) return message.text;
  if (message.attachment?.kind === "image") return t("renterDashboard.messages.sidebar.photoPreview");
  if (message.attachment?.kind === "document")
    return t("renterDashboard.messages.sidebar.documentPreview", { name: message.attachment.name });
  return t("renterDashboard.messages.sidebar.noMessagesYet");
}

// Most recent message in the thread, sent or received — used to sort the
// conversation list so active conversations rise to the top.
function lastActivity(conversation: Conversation) {
  // `|| 0` guards against messages persisted before `ts` existed (older
  // sessionStorage data) — without it, one legacy message with a missing/NaN
  // `ts` would poison Math.max for the whole conversation, silently freezing
  // its position instead of letting it jump to the top after a new send.
  return conversation.messages.reduce((latest, m) => Math.max(latest, m.ts || 0), 0);
}

// "Today" / "Yesterday" / "15 Aug" — used for the thread's date separators.
function dateLabel(ts: number, t: Translate) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return t("renterDashboard.notificationsDrawer.groupToday");
  if (sameDay(d, yesterday)) return t("renterDashboard.notificationsDrawer.groupYesterday");
  // A plain calendar date already follows the browser locale via
  // toLocaleDateString — left alone, unrelated to this app's language switcher.
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

// The day is already carried by the date separator above each message
// group, so each bubble's own timestamp always shows a clock time (e.g.
// "10:24 AM") rather than repeating "Today"/"Yesterday"/"13 days ago".
function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// System events are stored as one line, e.g. "Viewing confirmed · Saturday ·
// 10:30 AM" — split on the first " · " into a title and an optional detail.
function splitSystemMessage(text: string) {
  const separatorIndex = text.indexOf(" · ");
  if (separatorIndex === -1) return { title: text, detail: undefined as string | undefined };
  return { title: text.slice(0, separatorIndex), detail: text.slice(separatorIndex + 3) };
}

// A run of consecutive lifecycle events (viewing confirmed, application
// approved, agreement signed, …) shown as one small timeline card instead of
// a pill per event with a date label wedged between each — the dates live
// inside the card instead.
function SystemEventCard({ messages, query }: { messages: Message[]; query: string }) {
  return (
    <div className="flex justify-center py-2">
      <div className="w-full max-w-75 rounded-2xl border border-black/10 bg-white p-3.5 shadow-sm">
        <div className="space-y-3">
          {messages.map((msg, index) => {
            const { title, detail } = splitSystemMessage(msg.text);
            return (
              <div key={index} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-black/60" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-black">
                    {query ? highlightMatch(title, query) : title}
                  </p>
                  <p className="text-[10px] text-black/45">{detail ?? msg.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Wraps every case-insensitive occurrence of `query` in `text` with an underlined,
// bolded span — kept monochrome (no highlight color) so it reads on both bubble colors.
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-transparent font-bold underline decoration-2 underline-offset-2">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

export default function RenterDashboardMessagesPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<InboxTab>("inbox");
  const [typeFilter, setTypeFilter] = useState<ConversationType | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  // Mobile shows one pane at a time — the list, or an open thread. Desktop
  // (md: and up) ignores this and always shows both side by side.
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  // Live-stream the device camera into the <video> element while the camera
  // dialog is open, and always release it again on close/unmount.
  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(t("renterDashboard.messages.camera.permissionError"));
        }
      });

    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraOpen, t]);

  // Load and sync co-living matches
  useEffect(() => {
    if (typeof window !== "undefined") {
      const interestsStr = window.sessionStorage.getItem("hauxhunt-flatmate-interests") || "[]";
      const receivedStr = window.sessionStorage.getItem("hauxhunt-flatmate-received-interests") || "[]";
      try {
        const interests = JSON.parse(interestsStr) as string[];
        const received = JSON.parse(receivedStr) as string[];
        const matchesIds = interests.filter(id => received.includes(id));

        // Build list of matched flatmates
        const matchedProfiles = PUBLIC_FLATMATES.filter(f => matchesIds.includes(f.id));

        // Real epoch offsets behind each display timestamp below, purely so
        // the sidebar can be sorted by most-recent activity and the thread
        // can be grouped under date separators.
        const now = Date.now();
        const HOUR = 3_600_000;
        const DAY = 24 * HOUR;

        // Create mock conversations
        const chats: Conversation[] = [];

        // Renter Messages Integration phase (Phase 5.5) -- Section 8/9/45:
        // a professional who already has a real shared conversation
        // (messages-data.ts) is never ALSO shown via the hardcoded entries
        // below -- checked by real participant id, not display name.
        const sharedConversationsForRenter = getSharedConversationsFor(RENTER_PARTICIPANT_ID);
        const sharedProfessionalIds = new Set(
          sharedConversationsForRenter.flatMap((c) => c.participantIds).filter((id) => id !== RENTER_PARTICIPANT_ID),
        );

        // 1. Add matched flatmates first
        matchedProfiles.forEach((flatmate, index) => {
          chats.push({
            id: flatmate.id,
            name: flatmate.firstName,
            avatar: flatmate.portrait,
            role: "Flatmate",
            showPhone: false,
            type: "flatmate",
            subtitle: `${flatmate.age} · ${flatmate.occupation}`,
            metaContext: "Flatmate Match",
            context: { type: "flatmate", refId: flatmate.id },
            unreadCount: isThreadRead(flatmate.id) ? 0 : 1,
            phone: demoPhoneNumber(flatmate.id, COUNTRY_CALLING_CODES[flatmate.country] ?? "+250"),
            flatmateDetails: {
              budget: flatmate.situation === "looking"
                ? `${formatRwf(flatmate.budgetMin)}–${formatRwf(flatmate.budgetMax)}`
                : `${formatRwf(flatmate.budgetMin)} / month`,
              areas: flatmate.areas.join(", "),
              situation: flatmate.situation === "looking" ? "Looking for a place" : "Already has a place"
            },
            messages: [
              {
                sender: "them",
                text: `Hi Julien! I saw you expressed interest in being flatmates. I think our routines and budget align perfectly. Let me know when you'd love to chat!`,
                timestamp: "2:40 PM",
                ts: now - 2 * HOUR - index * 300_000
              }
            ]
          });
        });

        // 2. Patrick — a plain, unverified listing enquiry: no history beyond
        // the initial contact, deliberately kept simple as a contrast to
        // Jean's evolved relationship below.
        // Phase 5.5: skipped once conv-patrick-julien exists in the shared
        // store (Patrick's real professionalId is "patrick") -- that thread
        // carries this exact same content now.
        if (!sharedProfessionalIds.has("patrick")) {
          chats.push({
            id: "patrick-manager",
            name: "Patrick",
            avatar: patrickManagerPortrait,
            role: "Property Manager",
            verified: false,
            showPhone: true,
            type: "manager",
            subtitle: "Modern Family Home · Property Manager",
            metaContext: "Listing Enquiry",
            context: {
              type: "property-enquiry",
              propertyName: "Modern Family Home",
              propertyId: "kibagabaga-modern-family-home",
            },
            unreadCount: isThreadRead("patrick-manager") ? 0 : SEED_THREAD_UNREAD_COUNTS["patrick-manager"],
            phone: demoPhoneNumber("patrick-manager", "+250"),
            messages: [
              {
                sender: "them",
                text: "Hello Julien, your viewing request for Saturday at 10:00 AM has been confirmed. See you there!",
                timestamp: t("renterDashboard.notificationsDrawer.groupYesterday"),
                ts: now - DAY
              }
            ]
          });
        }

        // Jean Mugisha is the property manager for Kacyiru Residence — the
        // same character referenced across My Rentals, Payments, Maintenance
        // and Rental Setup. This ONE thread carries the whole relationship,
        // evolving from enquiry through to an active tenancy, mixing system
        // lifecycle events with the odd real message from Jean.
        // Phase 5.5: skipped once conv-jean-julien exists in the shared
        // store -- Phase 5 already consolidated this exact relationship
        // (plus Jean's Remera-payment thread) into it.
        if (!sharedProfessionalIds.has("jean-mugisha")) {
          chats.push({
            id: "kacyiru-owner",
            name: "Jean Mugisha",
            avatar: jeanOwnerPortrait,
            role: "Property Manager",
            verified: true,
            showPhone: true,
            type: "landlord",
            subtitle: "Kacyiru Residence · Property Manager",
            metaContext: "Active Rental",
            context: {
              type: "active-rental",
              propertyName: "Kacyiru Residence",
              propertyId: "kacyiru-2br",
              refId: "HH-RENT-104",
              status: "Active",
              detail: "RWF 850,000 / month",
            },
            unreadCount: isThreadRead("kacyiru-owner") ? 0 : SEED_THREAD_UNREAD_COUNTS["kacyiru-owner"],
            phone: demoPhoneNumber("kacyiru-owner", "+250"),
            messages: [
              {
                sender: "them",
                text: "Hi Julien, thanks for submitting your application. We are currently verifying references and will get back to you by Friday.",
                timestamp: t("renterDashboard.messages.time.daysAgo", { count: 15 }),
                ts: now - 15 * DAY,
              },
              {
                sender: "them",
                text: "Just a reminder that rent for Kacyiru Residence is due on the 1st. Let me know if you have any questions about your payment.",
                timestamp: t("renterDashboard.notificationsDrawer.groupYesterday"),
                ts: now - DAY + 2 * HOUR
              }
            ]
          });
        }

        // 3. Maintenance updates come from the technician assigned to the
        // ticket, not the property manager — matches the scheduledVisit
        // contact on the leaking-tap request (HH-MNT-1042) in
        // lib/maintenance-data.ts. Tied to that one specific request, not a
        // generic "maintenance" catch-all.
        chats.push({
          id: "eric-maintenance",
          name: "Moses Habimana",
          role: "Maintenance Technician",
          showPhone: true,
          type: "landlord",
          subtitle: "Leaking Kitchen Tap · Maintenance Technician",
          metaContext: "Maintenance",
          context: {
            type: "maintenance",
            title: "Leaking Kitchen Tap",
            propertyName: "Kacyiru Residence",
            propertyId: "kacyiru-2br",
            refId: "HH-MNT-1042",
            status: "Scheduled",
            detail: "17 Aug · 10:00–11:00 AM",
          },
          unreadCount: isThreadRead("eric-maintenance") ? 0 : SEED_THREAD_UNREAD_COUNTS["eric-maintenance"],
          phone: demoPhoneNumber("eric-maintenance", "+250"),
          messages: [
            {
              sender: "them",
              text: "Hi Julien, I'm scheduled to fix the leaking kitchen tap tomorrow at 10:00–11:00 AM. See you then!",
              timestamp: t("renterDashboard.notificationsDrawer.groupToday"),
              ts: now - 3 * HOUR
            }
          ]
        });

        // 4. A verified Agent — a distinct role from "Property Manager", so
        // the role system has more than one example to show.
        // Phase 5.5: skipped once conv-kevin-julien exists in the shared
        // store -- Kevin's real relationship with Julien (an independent
        // property, not Nyarutarama) is the one Phase 5 migrated; this
        // hardcoded entry's property reference was never actually his.
        if (!sharedProfessionalIds.has("kevin-nshuti")) {
          chats.push({
            id: "kevin-agent",
            name: "Kevin Nshuti",
            role: "Agent",
            verified: true,
            showPhone: true,
            type: "manager",
            subtitle: "Nyarutarama Garden Apartment · Agent",
            metaContext: "Listing Enquiry",
            context: {
              type: "property-enquiry",
              propertyName: "Nyarutarama Garden Apartment",
              propertyId: "nyarutarama-2br",
            },
            unreadCount: isThreadRead("kevin-agent") ? 0 : SEED_THREAD_UNREAD_COUNTS["kevin-agent"],
            phone: demoPhoneNumber("kevin-agent", "+250"),
            messages: [
              {
                sender: "them",
                text: "Hi Julien, thanks for your interest in Nyarutarama Garden Apartment — it's still available. Would you like to schedule a viewing?",
                timestamp: t("renterDashboard.messages.time.daysAgo", { count: 2 }),
                ts: now - 2 * DAY,
              }
            ]
          });
        }

        // 5. The HauxHunt concierge follows up on open "Property search"
        // support requests (see renter-dashboard/requests) — kept simple,
        // no housing context card.
        chats.push({
          id: "hauxhunt-concierge",
          name: "HauxHunt",
          role: "Support",
          showPhone: false,
          type: "support",
          verified: true,
          avatar: hauxhuntWhiteLogo,
          subtitle: "Property Search",
          metaContext: "Support",
          context: { type: "support" },
          unreadCount: isThreadRead("hauxhunt-concierge") ? 0 : SEED_THREAD_UNREAD_COUNTS["hauxhunt-concierge"],
          phone: demoPhoneNumber("hauxhunt-concierge", "+250"),
          messages: [
            {
              sender: "them",
              text: "Hi Julien, we found 3 homes matching your search for a two-bedroom apartment in Kacyiru or Nyarutarama, USD 500–800/month. Check them out in your dashboard!",
              timestamp: t("renterDashboard.notificationsDrawer.groupToday"),
              ts: now - 5 * HOUR
            }
          ]
        });

        // 6. Merge in any messages the renter sent from elsewhere in the app
        // (a property enquiry, "Message Property Manager" on a rental, a
        // maintenance update, etc.) — so wherever a message was sent from,
        // it shows up here too, and keeps showing up on later visits.
        getStoredThreads().forEach((thread) => {
          const existingIndex = chats.findIndex(c => c.id === thread.id);
          if (existingIndex >= 0) {
            chats[existingIndex] = {
              ...chats[existingIndex],
              messages: [...chats[existingIndex].messages, ...thread.messages],
            };
          } else {
            chats.push({
              ...thread,
              unreadCount: 0,
              phone: demoPhoneNumber(thread.id, "+250"),
            });
          }
        });

        // 7. Shared professional conversations (Owner/PM/Agent,
        // messages-data.ts) -- adapted into this page's own Conversation
        // shape (adaptSharedConversation) so every function above and below
        // this effect keeps working unmodified. Never converted back into a
        // name-keyed record; sending/reading these still goes straight
        // through messages-data.ts (see handleSendMessage/selectChat).
        sharedConversationsForRenter.forEach((c) => {
          chats.push(adaptSharedConversation(c, t));
        });

        // Resolve which chat to open from the URL, and build a
        // ConversationContext from whatever the linking page passed in
        // (`ctx`, `status`, `detail`, `refId`, …) instead of discarding it.
        // `?chat=<id>` (flatmate links) / `?open=<id>` (shared professional
        // conversations, Section 23 -- an alias for the same lookup) takes
        // priority; `?host=` (every "Message Property Manager" / "Message
        // Technician" link across rentals, payments, maintenance,
        // applications, visits and rental setup) opens the matching thread
        // by name -- and since step 7 already pushed the deduplicated
        // shared conversations into `chats` under their real participant's
        // name, this same lookup now finds the SHARED conversation first
        // whenever one exists (Section 24), with zero change to the lookup
        // itself. Updates context to the newest stage if found, so one
        // relationship evolves in place instead of spawning a new thread
        // per lifecycle stage.
        const urlParams = new URLSearchParams(window.location.search);
        const chatParam = urlParams.get("chat") || urlParams.get("open");
        const hostParam = urlParams.get("host");
        const propertyParam = urlParams.get("property");
        const roleParam = urlParams.get("role");
        const verifiedParam = urlParams.get("verified") === "1";
        const ctxParam = urlParams.get("ctx") as ConversationContextType | null;
        const propertyIdParam = urlParams.get("propertyId") || undefined;
        const statusParam = urlParams.get("status") || undefined;
        const detailParam = urlParams.get("detail") || undefined;
        const refIdParam = urlParams.get("refId") || undefined;
        const titleParam = urlParams.get("title") || undefined;

        const incomingContext: ConversationContext | null = ctxParam
          ? {
              type: ctxParam,
              propertyName: propertyParam || undefined,
              propertyId: propertyIdParam,
              status: statusParam,
              detail: detailParam,
              refId: refIdParam,
              title: titleParam,
            }
          : null;

        let initialId = "";

        if (chatParam && chats.some(c => c.id === chatParam)) {
          initialId = chatParam;
        } else if (hostParam) {
          const existing = chats.find(c => c.name.toLowerCase() === hostParam.toLowerCase());
          if (existing) {
            initialId = existing.id;
            if (incomingContext) {
              existing.context = incomingContext;
              existing.metaContext = CONTEXT_BADGE[incomingContext.type];
              existing.type = bucketForContext(incomingContext.type);
              const headline = incomingContext.title ?? incomingContext.propertyName;
              if (headline) existing.subtitle = `${headline} · ${existing.role}`;
            }
          } else {
            // Phase 5.5 -- Section 24/49: hostParam matched no existing
            // row (shared or legacy). Before falling back to a throwaway
            // local record, check whether it's actually a real, resolvable
            // HauxHunt participant (a registered professional, or the
            // Owner) who simply doesn't have a shared conversation yet --
            // if so, create the real shared one instead of a name-keyed
            // local duplicate.
            const resolvedParticipantId =
              hostParam === OWNER.name ? OWNER_PARTICIPANT_ID : getProfessionalByName(hostParam)?.id;
            if (resolvedParticipantId) {
              const shared = getOrCreateSharedConversation(RENTER_PARTICIPANT_ID, resolvedParticipantId, {
                type: "property",
                propertyId: propertyIdParam,
                label: incomingContext?.title ?? "Property Enquiry",
              });
              if (shared) {
                const adapted = adaptSharedConversation(shared, t);
                chats.push(adapted);
                initialId = adapted.id;
              }
            }
            if (!initialId) {
              const id = `landlord-${slugify(hostParam)}`;
              const context: ConversationContext = incomingContext ?? {
                type: "property-enquiry",
                propertyName: propertyParam || undefined,
                propertyId: propertyIdParam,
              };
              const role = roleParam || "Property Manager";
              const headline = context.title ?? context.propertyName;
              chats.push({
                id,
                name: hostParam,
                role,
                verified: verifiedParam,
                showPhone: true,
                type: bucketForContext(context.type),
                subtitle: headline ? `${headline} · ${role}` : role,
                metaContext: CONTEXT_BADGE[context.type],
                context,
                unreadCount: 0,
                phone: demoPhoneNumber(id, "+250"),
                messages: [],
              });
              initialId = id;
            }
          }
        } else if (propertyParam) {
          const id = `landlord-${slugify(propertyParam)}`;
          const existing = chats.find(c => c.id === id);
          if (existing) {
            initialId = id;
          } else {
            const context: ConversationContext = incomingContext ?? {
              type: "property-enquiry",
              propertyName: propertyParam,
              propertyId: propertyIdParam,
            };
            chats.push({
              id,
              name: "Property Manager",
              role: "Property Manager",
              showPhone: true,
              type: bucketForContext(context.type),
              subtitle: propertyParam,
              metaContext: CONTEXT_BADGE[context.type],
              context,
              unreadCount: 0,
              phone: demoPhoneNumber(id, "+250"),
              messages: [],
            });
            initialId = id;
          }
        } else {
          // No chat/host/property param — e.g. arriving from the top nav's
          // plain "Messages" link — land on the inbox with nothing open,
          // instead of auto-selecting the first conversation.
          initialId = "";
        }

        // The chat we're opening on load starts out read. Section 19/41: a
        // shared conversation's read state belongs entirely to
        // messages-data.ts -- markThreadRead (the legacy renter-local
        // mechanism) is only ever called for a legacy row, never both.
        if (initialId) {
          const openedChat = chats.find((c) => c.id === initialId);
          if (openedChat?.source === "shared") {
            markConversationReadFor(initialId, RENTER_PARTICIPANT_ID);
          } else {
            markThreadRead(initialId);
          }
        }
        const chatsWithInitialRead = chats.map(c =>
          c.id === initialId ? { ...c, unreadCount: 0 } : c
        );

        setConversations(chatsWithInitialRead);
        setActiveChatId(initialId);
        if (initialId) setMobileView("thread");
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Renter Messages Integration phase (Phase 5.5) -- Section 55: live
  // updates for shared professional conversations only (Jean/Sarah/Owner
  // can send from an entirely different dashboard at any time). Legacy
  // conversations don't need this -- message-threads.ts has no cross-tab
  // writer, and this page's own sends already update local state directly.
  // Replaces only the previously-adapted "shared" rows in place; every
  // legacy row (including ones deduplicated away at mount and therefore
  // never present) is left untouched.
  useEffect(() => {
    return subscribeToMessages(() => {
      setConversations((prev) => {
        const freshShared = getSharedConversationsFor(RENTER_PARTICIPANT_ID).map((c) =>
          adaptSharedConversation(c, t),
        );
        const freshSharedIds = new Set(freshShared.map((c) => c.id));
        const legacyOnly = prev.filter((c) => c.source !== "shared" && !freshSharedIds.has(c.id));
        return [...legacyOnly, ...freshShared];
      });
    });
    // Re-subscribes on locale change so a shared message arriving after a
    // language switch is adapted with the new locale's `t`, not a stale one.
  }, [t]);

  // Close the "More..." dropdown on outside click
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  // Close the attach ("+") dropdown on outside click
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!attachMenuRef.current?.contains(event.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  // Close the chat "more options" dropdown on outside click
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!chatMenuRef.current?.contains(event.target as Node)) {
        setChatMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const activeChat = conversations.find(c => c.id === activeChatId);

  const selectChat = (id: string) => {
    setActiveChatId(id);
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
    setChatMenuOpen(false);
    setMobileView("thread");
    // Section 19/41: shared read state goes through messages-data.ts only.
    const chat = conversations.find((c) => c.id === id);
    if (chat?.source === "shared") {
      markConversationReadFor(id, RENTER_PARTICIPANT_ID);
    } else {
      markThreadRead(id);
    }
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  };

  const backToList = () => setMobileView("list");

  const searchedConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.subtitle.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const visibleConversations = useMemo(() => {
    return searchedConversations
      .filter(c => {
        if (typeFilter) return c.type === typeFilter;
        if (activeTab === "unread") return c.unreadCount > 0;
        if (activeTab === "read") return c.unreadCount === 0;
        return true;
      })
      .sort((a, b) => lastActivity(b) - lastActivity(a));
  }, [searchedConversations, activeTab, typeFilter]);

  const activeChatCta = activeChat ? contextCta(activeChat.context) : null;

  const threadQuery = threadSearchQuery.trim();
  const threadMessages = useMemo(() => {
    if (!activeChat) return [];
    if (!threadQuery) return activeChat.messages;
    return activeChat.messages.filter((m) =>
      m.text.toLowerCase().includes(threadQuery.toLowerCase())
    );
  }, [activeChat, threadQuery]);

  // Collapse consecutive system events into one timeline card, and only
  // compute date separators for chat messages — a run of same-day system
  // events would otherwise wedge a near-duplicate date pill between each one.
  type ThreadRenderItem =
    | { kind: "chat"; message: Message; showDate: boolean; dateLabel: string }
    | { kind: "system-group"; messages: Message[] };

  const threadRenderItems = useMemo(() => {
    const items: ThreadRenderItem[] = [];
    let lastDateLabel: string | null = null;
    threadMessages.forEach((msg) => {
      if (msg.kind === "system") {
        const last = items[items.length - 1];
        if (last?.kind === "system-group") {
          last.messages.push(msg);
        } else {
          items.push({ kind: "system-group", messages: [msg] });
        }
        lastDateLabel = null;
      } else {
        const label = dateLabel(msg.ts, t);
        items.push({ kind: "chat", message: msg, showDate: label !== lastDateLabel, dateLabel: label });
        lastDateLabel = label;
      }
    });
    return items;
  }, [threadMessages, t]);

  // Jump to the latest message whenever a chat is opened or a new message
  // arrives — same as WhatsApp, the most recent message sits just above the
  // composer instead of leaving the thread scrolled to the top.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeChatId, threadMessages.length]);

  const emptyStateCopy = (() => {
    const query = searchQuery.trim();
    if (query) {
      return {
        title: t("renterDashboard.messages.sidebar.emptyState.noResultsTitle", { query }),
        body: t("renterDashboard.messages.sidebar.emptyState.noResultsBody"),
      };
    }
    if (typeFilter) {
      return {
        title: t("renterDashboard.messages.sidebar.emptyState.noMessagesTitle"),
        body: t("renterDashboard.messages.sidebar.emptyState.noConversationsUnderFilter", {
          filter: t(MORE_FILTER_LABEL_KEYS[typeFilter]),
        }),
      };
    }
    if (activeTab === "unread") {
      return {
        title: t("renterDashboard.messages.sidebar.emptyState.noUnreadTitle"),
        body: t("renterDashboard.messages.sidebar.emptyState.noUnreadBody"),
      };
    }
    if (activeTab === "read") {
      return {
        title: t("renterDashboard.messages.sidebar.emptyState.noReadTitle"),
        body: t("renterDashboard.messages.sidebar.emptyState.noReadBody"),
      };
    }
    return {
      title: t("renterDashboard.messages.sidebar.emptyState.noMessagesTitle"),
      body: t("renterDashboard.messages.sidebar.emptyState.noMessagesBody"),
    };
  })();

  const appendMessage = (chatId: string, message: Omit<Message, "timestamp" | "ts">) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  ...message,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  ts: Date.now(),
                },
              ],
            }
          : c
      )
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    const text = newMessage.trim();
    // Section 17/40: a shared conversation writes into messages-data.ts
    // ONLY -- the live-subscription effect above refreshes this row from
    // the canonical store, so appendMessage/recordSentMessage (the legacy
    // local-echo + outbound log) never also run for it. One click, one
    // shared Message, never a second local copy.
    if (activeChat.source === "shared") {
      sendMessageAs(activeChat.id, RENTER_PARTICIPANT_ID, text);
      setNewMessage("");
      return;
    }
    appendMessage(activeChat.id, { sender: "user", text });
    recordSentMessage(
      {
        id: activeChat.id,
        name: activeChat.name,
        role: activeChat.role,
        verified: activeChat.verified,
        showPhone: activeChat.showPhone,
        subtitle: activeChat.subtitle,
        metaContext: activeChat.metaContext,
        type: activeChat.type,
        context: activeChat.context,
      },
      text
    );
    setNewMessage("");
  };

  const handleFileSelected =
    (kind: Attachment["kind"]) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      // Section 37: the shared Message model is text-only in this phase --
      // never silently swallow an attachment send on a shared thread. The
      // attach control itself is also hidden for shared threads (see the
      // composer render below), so this is a defensive no-op only.
      if (!file || !activeChat || activeChat.source === "shared") return;
      appendMessage(activeChat.id, {
        sender: "user",
        text: "",
        attachment: { kind, name: file.name, url: URL.createObjectURL(file) },
      });
    };

  // Drag the divider between the conversation list and the chat panel to
  // resize the sidebar, clamped to [SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH].
  const startSidebarResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const next = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next)));
    };
    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const openCamera = () => {
    setAttachMenuOpen(false);
    setCameraError(null);
    setCameraOpen(true);
  };

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !activeChat) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      appendMessage(activeChat.id, {
        sender: "user",
        text: "",
        attachment: { kind: "image", name: `Photo ${Date.now()}.jpg`, url: URL.createObjectURL(blob) },
      });
      closeCamera();
    }, "image/jpeg", 0.92);
  };

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="flex h-svh flex-col bg-white pt-16 text-black">
        <div className="flex min-h-0 flex-1">
          {/* Conversations List Panel — full width on mobile until a chat is
              opened; fixed/resizable width alongside the thread on desktop. */}
          <aside
            className={`${mobileView === "thread" ? "hidden" : "flex"} w-full shrink-0 flex-col md:flex md:w-(--sidebar-w)`}
            style={{ "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
              <Link
                href="/flatmates?from=renter"
                aria-label={t("renterDashboard.messages.backToFlatmatesAria")}
                className="text-black/50 transition-colors hover:text-black"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </Link>
              <h1 className="font-bricolage flex-1 text-2xl font-bold tracking-tight">
                {t("renterDashboard.nav.messages")}
              </h1>
            </div>

            <div className="px-5 pb-4">
              <label className="catalogue-location-filter flex items-center gap-2 px-4">
                <span className="sr-only">{t("renterDashboard.messages.sidebar.searchAriaLabel")}</span>
                <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("renterDashboard.messages.sidebar.searchPlaceholder")}
                  className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
            </div>

            <div className="flex items-center gap-1.5 px-5 pb-4">
              <div
                className="flex min-w-0 items-center gap-1.5 overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {INBOX_TABS.map((tab) => {
                  const isActive = !typeFilter && activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab);
                        setTypeFilter(null);
                      }}
                      className={`h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-black bg-black text-white"
                          : "border-black/15 bg-white text-black/70 hover:border-black/30 hover:text-black"
                      }`}
                    >
                      {t(INBOX_TAB_LABEL_KEYS[tab])}
                    </button>
                  );
                })}
              </div>
              {/* Kept outside the scrollable strip above so its dropdown never gets clipped by that container's overflow. */}
              <div ref={moreMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors ${
                    typeFilter
                      ? "border-black bg-black text-white"
                      : "border-black/15 bg-white text-black/70 hover:border-black/30 hover:text-black"
                  }`}
                >
                  {typeFilter
                    ? t(MORE_FILTER_LABEL_KEYS[typeFilter])
                    : t("renterDashboard.messages.sidebar.filters.more")}
                  <ChevronDown aria-hidden="true" className="size-3.5" />
                </button>
                {moreOpen && (
                  <div className="absolute top-[calc(100%+0.5rem)] left-0 z-20 w-56 rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                    {MORE_FILTERS.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setTypeFilter(type);
                          setMoreOpen(false);
                        }}
                        className={`block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                          typeFilter === type ? "bg-black text-white" : "text-black/75 hover:bg-black/5"
                        }`}
                      >
                        {t(MORE_FILTER_LABEL_KEYS[type])}
                      </button>
                    ))}
                    {typeFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setTypeFilter(null);
                          setMoreOpen(false);
                        }}
                        className="mt-1 block w-full rounded-xl border-t border-black/5 px-3.5 py-2.5 text-left text-sm font-medium text-black/50 hover:bg-black/5"
                      >
                        {t("renterDashboard.messages.sidebar.filters.clearFilter")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-black/10" />

            <div className="flex-1 overflow-y-auto p-2.5">
              {visibleConversations.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  {searchQuery.trim() && (
                    <Search aria-hidden="true" className="mb-3 size-8 text-black/20" />
                  )}
                  <h3 className="font-bricolage text-lg font-bold text-black">
                    {emptyStateCopy.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/50">
                    {emptyStateCopy.body}
                  </p>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-4 rounded-full border border-black/15 px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:border-black/30 hover:text-black"
                    >
                      {t("renterDashboard.messages.sidebar.emptyState.clearSearch")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {visibleConversations.map((convo) => {
                    const isActive = convo.id === activeChatId;
                    const lastMsg = convo.messages[convo.messages.length - 1];
                    return (
                      <button
                        key={convo.id}
                        onClick={() => selectChat(convo.id)}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all duration-150 flex gap-3.5 border border-transparent ${
                          isActive
                            ? "bg-black/5"
                            : "bg-transparent hover:bg-black/3"
                        }`}
                      >
                        <div className="relative size-11 shrink-0">
                          <ConversationAvatar
                            avatar={convo.avatar}
                            name={convo.name}
                            className="size-11 border border-neutral-100 text-base"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className={`flex min-w-0 items-center gap-1 text-sm font-semibold ${convo.unreadCount > 0 ? "text-black" : "text-neutral-900"}`}>
                              <span className="truncate">{convo.name}</span>
                              {convo.verified && (
                                <BadgeCheck
                                  aria-label={t("renterDashboard.messages.verifiedAria")}
                                  className="size-3.5 shrink-0 fill-black text-white"
                                />
                              )}
                            </h3>
                            <span className="text-[9px] text-neutral-400 shrink-0 font-medium">
                              {lastMsg?.timestamp || ""}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500 truncate mt-0.5 font-medium">
                            {convo.subtitle}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className={`text-xs truncate flex-1 ${convo.unreadCount > 0 ? "text-black" : "text-neutral-600"}`}>
                              {messagePreview(lastMsg, t)}
                            </p>
                            {convo.unreadCount > 0 && (
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                                {convo.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Drag to resize the conversation list, clamped between
              SIDEBAR_MIN_WIDTH and SIDEBAR_MAX_WIDTH. Desktop only — dragging
              doesn't apply to the single-pane mobile layout. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("renterDashboard.messages.sidebar.resizeAria")}
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            tabIndex={0}
            onPointerDown={startSidebarResize}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                setSidebarWidth((w) => Math.max(SIDEBAR_MIN_WIDTH, w - 16));
              } else if (e.key === "ArrowRight") {
                setSidebarWidth((w) => Math.min(SIDEBAR_MAX_WIDTH, w + 16));
              }
            }}
            className="hidden w-1.5 shrink-0 cursor-col-resize border-r border-black/10 bg-transparent transition-colors hover:border-black/25 hover:bg-black/5 focus-visible:bg-black/10 md:block"
          />

          {/* Active Chat Panel — hidden on mobile until a conversation is open. */}
          <section className={`${mobileView === "list" ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}>
            {/* Chat header */}
            {activeChat && (
              <div className="flex h-16 shrink-0 items-center gap-3 border-b border-black/10 px-4 md:px-6">
                {threadSearchOpen ? (
                  <>
                    <span className="catalogue-location-filter flex min-w-0 flex-1 items-center gap-2 px-4">
                      <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                      <input
                        autoFocus
                        value={threadSearchQuery}
                        onChange={(e) => setThreadSearchQuery(e.target.value)}
                        placeholder={t("renterDashboard.messages.thread.searchPlaceholder", {
                          name: activeChat.name,
                        })}
                        className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </span>
                    <button
                      type="button"
                      aria-label={t("renterDashboard.messages.thread.closeSearchAria")}
                      onClick={() => {
                        setThreadSearchOpen(false);
                        setThreadSearchQuery("");
                      }}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                    >
                      <X aria-hidden="true" className="size-4.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={backToList}
                      aria-label={t("renterDashboard.messages.thread.backAria")}
                      className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black md:hidden"
                    >
                      <ChevronLeft aria-hidden="true" className="size-5" />
                    </button>
                    <ConversationAvatar avatar={activeChat.avatar} name={activeChat.name} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold text-black">
                        <span className="truncate">{activeChat.name}</span>
                        {activeChat.verified && (
                          <BadgeCheck
                            aria-label={t("renterDashboard.messages.verifiedAria")}
                            className="size-3.5 shrink-0 fill-black text-white"
                          />
                        )}
                      </p>
                      <p className="truncate text-xs text-black/50">{activeChat.role}</p>
                    </div>
                    {activeChat.showPhone && (
                      <a
                        href={`tel:${activeChat.phone.replace(/\s+/g, "")}`}
                        aria-label={t("renterDashboard.messages.thread.callAria", { name: activeChat.name })}
                        title={activeChat.phone}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                      >
                        <Phone aria-hidden="true" className="size-4.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      aria-label={t("renterDashboard.messages.thread.searchAria")}
                      onClick={() => setThreadSearchOpen(true)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                    >
                      <Search aria-hidden="true" className="size-4.5" />
                    </button>
                    {activeChatCta && (
                      <div ref={chatMenuRef} className="relative shrink-0">
                        <button
                          type="button"
                          aria-label={t("renterDashboard.messages.thread.moreOptionsAria")}
                          onClick={() => setChatMenuOpen((open) => !open)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                        >
                          <MoreVertical aria-hidden="true" className="size-4.5" />
                        </button>
                        {chatMenuOpen && (
                          <div className="absolute top-[calc(100%+0.5rem)] right-0 z-20 w-52 rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                            <Link
                              href={activeChatCta.href}
                              onClick={() => setChatMenuOpen(false)}
                              className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-black/75 transition-colors hover:bg-black/5"
                            >
                              {t(activeChatCta.labelKey)}
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Messages Body */}
            {activeChat ? (
              threadQuery && threadMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <p className="font-bricolage text-lg font-bold text-black">
                    {t("renterDashboard.messages.thread.noResultsTitle")}
                  </p>
                  <p className="text-sm text-black/50">
                    {t("renterDashboard.messages.thread.noResultsBody", { query: threadQuery })}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto bg-neutral-100 px-4 py-3">
                  {threadRenderItems.map((item, index) => {
                    if (item.kind === "system-group") {
                      return <SystemEventCard key={index} messages={item.messages} query={threadQuery} />;
                    }
                    const msg = item.message;
                    const isUser = msg.sender === "user";
                    return (
                      <div key={index}>
                        {item.showDate && (
                          <div className="flex justify-center py-2">
                            <span className="text-[10px] font-semibold tracking-wide text-black/40 uppercase">
                              {item.dateLabel}
                            </span>
                          </div>
                        )}
                        <div className={`flex py-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[65%] rounded-lg px-2.5 py-1.5 text-sm ${
                            isUser
                              ? "bg-black text-white rounded-tr-none"
                              : "bg-white text-neutral-900 rounded-tl-none"
                          }`}>
                            {msg.attachment?.kind === "image" && (
                              /* eslint-disable-next-line @next/next/no-img-element -- object URL, not eligible for next/image optimization */
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.name}
                                className="mb-1 max-h-64 w-full rounded-md object-cover"
                              />
                            )}
                            {msg.attachment?.kind === "document" && (
                              <a
                                href={msg.attachment.url}
                                download={msg.attachment.name}
                                className={`mb-1 flex items-center gap-2 rounded-md p-2 transition-colors ${
                                  isUser ? "bg-white/10 hover:bg-white/15" : "bg-neutral-100 hover:bg-neutral-200"
                                }`}
                              >
                                <FileText aria-hidden="true" className="size-5 shrink-0" />
                                <span className="truncate text-xs font-medium">{msg.attachment.name}</span>
                              </a>
                            )}
                            {msg.text && (
                              <span className="leading-snug wrap-break-word">
                                {threadQuery ? highlightMatch(msg.text, threadQuery) : msg.text}
                              </span>
                            )}
                            <span className={`float-right mt-1 ml-2 text-[10px] font-medium ${
                              isUser ? "text-white/60" : "text-neutral-400"
                            }`}>
                              {timeLabel(msg.ts)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )
            ) : conversations.length > 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <MessageCircle aria-hidden="true" className="size-14 text-black" strokeWidth={1.5} />
                <h2 className="font-bricolage text-xl font-bold text-black">
                  {t("renterDashboard.messages.thread.selectConversationTitle")}
                </h2>
                <p className="text-sm text-black/50">
                  {t("renterDashboard.messages.thread.selectConversationBody")}
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <MessageCircle aria-hidden="true" className="size-14 text-black/30" strokeWidth={1.5} />
                <h2 className="font-bricolage text-xl font-bold text-black">
                  {t("renterDashboard.messages.sidebar.emptyState.noMessagesTitle")}
                </h2>
                <p className="text-sm text-black/50">
                  {t("renterDashboard.messages.sidebar.emptyState.noMessagesBody")}
                </p>
              </div>
            )}

            {/* Message Input Box — only shown once a conversation is open */}
            {activeChat && (
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-neutral-100 p-4">
              {/* Hidden file inputs, triggered from the attach dropdown below */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected("image")}
              />
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                className="hidden"
                onChange={handleFileSelected("document")}
              />
              {/* Section 37: the shared Message model is text-only in this
                  phase -- the attach control never renders for a shared
                  professional conversation, rather than offering an action
                  that would silently fail to persist anywhere. */}
              {activeChat?.source !== "shared" && (
              <div ref={attachMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label={t("renterDashboard.messages.composer.attachAria")}
                  disabled={!activeChat}
                  onClick={() => setAttachMenuOpen((open) => !open)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-black/15 text-black/60 transition-colors hover:border-black/30 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus aria-hidden="true" className="size-5" />
                </button>
                {attachMenuOpen && (
                  <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-52 rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                    <button
                      type="button"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        photoInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-black/75 transition-colors hover:bg-black/5"
                    >
                      <ImagePlus aria-hidden="true" className="size-4.5 text-black/60" />
                      {t("renterDashboard.messages.composer.photo")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        documentInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-black/75 transition-colors hover:bg-black/5"
                    >
                      <FileText aria-hidden="true" className="size-4.5 text-black/60" />
                      {t("renterDashboard.messages.composer.document")}
                    </button>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-black/75 transition-colors hover:bg-black/5"
                    >
                      <Camera aria-hidden="true" className="size-4.5 text-black/60" />
                      {t("renterDashboard.messages.composer.camera")}
                    </button>
                  </div>
                )}
              </div>
              )}
              <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-black/15 bg-white px-4 transition-colors focus-within:border-black">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("renterDashboard.messages.composer.placeholder")}
                  disabled={!activeChat}
                  className="message-composer-control min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-black/40 disabled:cursor-not-allowed"
                />
                <VoiceInputButton onTranscript={(transcript) => setNewMessage((prev) => (prev ? `${prev} ${transcript}` : transcript))} />
              </div>
              <button
                type="submit"
                disabled={!activeChat || !newMessage.trim()}
                aria-label={t("renterDashboard.messages.composer.sendAria")}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white transition-all hover:bg-neutral-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send className="size-4" />
              </button>
            </form>
            )}
          </section>
        </div>
      </main>

      {cameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("renterDashboard.messages.camera.dialogAria")}
          className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black"
        >
          <button
            type="button"
            onClick={closeCamera}
            aria-label={t("renterDashboard.messages.camera.closeAria")}
            autoFocus
            className="absolute top-4 right-4 z-20 flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <X aria-hidden="true" className="size-5" />
          </button>

          {cameraError ? (
            <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center text-white">
              <Camera aria-hidden="true" className="size-10 text-white/50" />
              <p className="text-sm text-white/80">{cameraError}</p>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium transition-colors hover:bg-white/10"
              >
                {t("common.close")}
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-full max-w-full"
              />
              <button
                type="button"
                onClick={capturePhoto}
                aria-label={t("renterDashboard.messages.camera.captureAria")}
                className="absolute bottom-8 flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/10 transition-transform active:scale-90"
              >
                <span className="size-12 rounded-full bg-white" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
