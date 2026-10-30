// Shared, session-persisted store for messages the renter sends from ANY
// entry point in the app — a property enquiry form, "Message Property
// Manager" on a rental, a maintenance update, a flatmate chat, etc. The
// central Messages inbox (renter-dashboard/messages) reads this on load and
// merges it with its built-in demo threads, so wherever a message is sent
// from, it shows up there too.

export type ThreadType = "flatmate" | "landlord" | "manager" | "support";

// What the renter and this person are actually talking about. Kept flat and
// small on purpose — this is a prototype, not a production data model — but
// rich enough that pages don't have to discard the context they already
// have when they hand off into Messages.
export type ConversationContextType =
  | "property-enquiry"
  | "viewing"
  | "application"
  | "rental-setup"
  | "active-rental"
  | "maintenance"
  | "flatmate"
  | "support";

export type ConversationContext = {
  type: ConversationContextType;
  title?: string; // e.g. a maintenance request's own title — overrides propertyName as the card's headline
  propertyName?: string;
  propertyId?: string;
  status?: string; // "Confirmed", "Under Review", "Agreement Awaiting Signature", ...
  detail?: string; // "Saturday, 22 August · 10:30 AM", "RWF 850,000 / month", ...
  refId?: string; // application/rental/maintenance id — used to build the CTA link
};

export type StoredMessage = {
  sender: "user" | "them";
  text: string;
  timestamp: string;
  ts: number;
  kind?: "chat" | "system";
};

export type ThreadMeta = {
  id: string;
  name: string;
  role: string; // "Property Manager", "Agent", "Maintenance Technician", "Flatmate", "RentUp Support"
  verified?: boolean;
  showPhone: boolean;
  subtitle: string; // short line shown in the conversation list only
  metaContext: string; // short list-row badge
  type: ThreadType;
  context: ConversationContext;
};

export type StoredThread = ThreadMeta & { messages: StoredMessage[] };

// Bumped to "-v3" for the context-object shape — older entries from before
// this model existed are abandoned rather than read back malformed.
const STORAGE_KEY = "hauxhunt-message-threads-v3";

function readThreads(): StoredThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeThreads(threads: StoredThread[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // the message still shows for the rest of this page view.
  }
}

export function getStoredThreads(): StoredThread[] {
  return readThreads();
}

// Records a message the renter just sent so it appears in the Messages
// inbox, creating the thread if this is the first message to that
// recipient, and refreshing the thread's context/meta either way — so the
// same relationship (e.g. Jean Mugisha on Kacyiru Residence) can evolve from
// "Property Enquiry" to "Active Rental" without spawning new threads.
export function recordSentMessage(meta: ThreadMeta, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const threads = readThreads();
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const message: StoredMessage = { sender: "user", text: trimmed, timestamp, ts: Date.now(), kind: "chat" };

  const existing = threads.find((t) => t.id === meta.id);
  if (existing) {
    Object.assign(existing, meta);
    existing.messages.push(message);
  } else {
    threads.push({ ...meta, messages: [message] });
  }
  writeThreads(threads);
}

// Turns a free-text name/title (a host name, a property title) into a
// stable id so the same recipient/thread is reused across visits instead of
// spawning a new one each time.
export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "conversation";
}

// Which conversations the renter has already opened this session — tracked
// independently of the Messages page's own component state, so the total
// unread count is correct anywhere in the app (the top nav included)
// without requiring a visit to Messages first.
const READ_IDS_KEY = "hauxhunt-messages-read-ids";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(READ_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function isThreadRead(id: string): boolean {
  return getReadIds().has(id);
}

export function markThreadRead(id: string) {
  if (typeof window === "undefined") return;
  const ids = getReadIds();
  if (ids.has(id)) return;
  ids.add(id);
  window.sessionStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
}

// Starting unread count for each built-in demo thread — the single source
// of truth shared by both the Messages page (per-row badges) and the total
// below, so they can never disagree.
export const SEED_THREAD_UNREAD_COUNTS: Record<string, number> = {
  "patrick-manager": 1,
  "kacyiru-owner": 2,
  "eric-maintenance": 1,
  "kevin-agent": 1,
  "hauxhunt-concierge": 1,
};

// Matched flatmates (mutual interest) each start with one unread message —
// mirrors the same sessionStorage check the Messages page and Flatmates
// pages already use.
function getMatchedFlatmateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const interests = JSON.parse(window.sessionStorage.getItem("hauxhunt-flatmate-interests") || "[]") as string[];
    const received = JSON.parse(window.sessionStorage.getItem("hauxhunt-flatmate-received-interests") || "[]") as string[];
    return interests.filter((id) => received.includes(id));
  } catch {
    return [];
  }
}

// Total unread across every conversation — computed fresh from the read-id
// set each time, so it's accurate no matter which page calls it, not just
// whichever page last mirrored a stored total.
export function getTotalUnreadCount(): number {
  const readIds = getReadIds();
  let total = 0;
  for (const [id, count] of Object.entries(SEED_THREAD_UNREAD_COUNTS)) {
    if (!readIds.has(id)) total += count;
  }
  for (const id of getMatchedFlatmateIds()) {
    if (!readIds.has(id)) total += 1;
  }
  return total;
}
