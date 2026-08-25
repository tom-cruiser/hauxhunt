// Renter notification system -- mock/local state only (prototype).
// No backend, no push infrastructure, no real-time events.

export type NotificationCategory =
  | "search"
  | "viewing"
  | "application"
  | "rental-setup"
  | "rental"
  | "payment"
  | "maintenance"
  | "flatmate"
  | "message"
  | "security";

export type Notification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  timestamp: number; // ms since epoch
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
  /** Shown as a small badge above the title -- e.g. "Action required" */
  urgentLabel?: string;
};

// ---------------------------------------------------------------------------
// Mock data -- 14 realistic notifications covering all renter journeys.
// Timestamps are relative to a fixed "now" so the grouping is stable.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-08-22T10:00:00").getTime();
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

export const MOCK_NOTIFICATIONS: Notification[] = [
  // -- Today ----------------------------------------------------------------
  {
    id: "viewing-confirmed",
    category: "viewing",
    title: "Viewing confirmed",
    body: "Your viewing at Kacyiru Residence is confirmed for 22 Aug at 10:30 AM.",
    timestamp: NOW - 10 * MIN,
    read: false,
    actionLabel: "View Viewing",
    actionHref: "/renter-dashboard/visits?open=confirmed-kacyiru",
  },
  {
    id: "application-action-required",
    category: "application",
    title: "Action required",
    body: "Additional information is required for your Kacyiru Residence application.",
    timestamp: NOW - 1 * HR,
    read: false,
    urgentLabel: "Action required",
    actionLabel: "Continue Application",
    actionHref: "/renter-dashboard/applications/HH-APP-0248",
  },
  {
    id: "flatmate-match",
    category: "flatmate",
    title: "It's a flatmate match",
    body: "You and Aline are both interested in sharing a home. Start a conversation.",
    timestamp: NOW - 2 * HR,
    read: false,
    actionLabel: "View Match",
    actionHref: "/renter-dashboard/flatmates/matches?tab=matches&highlight=aline",
  },
  {
    id: "saved-search-match",
    category: "search",
    title: "New homes match your saved search",
    body: "4 new rentals in Kacyiru match your saved search.",
    timestamp: NOW - 3 * HR,
    read: false,
    actionLabel: "View Listings",
    actionHref: "/renter-dashboard/saved-searches",
  },
  // -- Yesterday ------------------------------------------------------------
  {
    id: "payment-received",
    category: "payment",
    title: "Payment successful",
    body: "Your rent payment of RWF 850,000 for Kacyiru Residence was received successfully.",
    timestamp: NOW - 1 * DAY - 2 * HR,
    read: true,
    actionLabel: "View Payment",
    actionHref: "/renter-dashboard/payments?receipt=HH-PAY-19842",
  },
  {
    id: "maintenance-scheduled",
    category: "maintenance",
    title: "Maintenance visit scheduled",
    body: 'A maintenance visit for "Leaking Kitchen Tap" is scheduled for 20 Aug at 10:00 AM.',
    timestamp: NOW - 1 * DAY - 4 * HR,
    read: true,
    actionLabel: "View Request",
    actionHref: "/renter-dashboard/maintenance/HH-MNT-1042",
  },
  {
    id: "application-submitted",
    category: "application",
    title: "Application submitted",
    body: "Your application for Kacyiru Residence has been submitted successfully.",
    timestamp: NOW - 1 * DAY - 6 * HR,
    read: true,
    actionLabel: "View Application",
    actionHref: "/renter-dashboard/applications/HH-APP-0241",
  },
  // -- Earlier --------------------------------------------------------------
  {
    id: "rental-invitation",
    category: "rental-setup",
    title: "Rental invitation received",
    body: "Jean Mugisha invited you to complete the rental setup for Kacyiru Residence.",
    timestamp: NOW - 3 * DAY - 1 * HR,
    read: true,
    actionLabel: "Start Rental Setup",
    actionHref: "/renter-dashboard/rental-setup/kacyiru-2br",
  },
  {
    id: "agreement-ready",
    category: "rental-setup",
    title: "Agreement ready for review",
    body: "Your rental agreement for Kacyiru Residence is ready for review.",
    timestamp: NOW - 3 * DAY - 3 * HR,
    read: true,
    urgentLabel: "Signature required",
    actionLabel: "Review & Sign",
    actionHref: "/renter-dashboard/rental-setup/kacyiru-2br",
  },
  {
    id: "rent-due",
    category: "payment",
    title: "Rent due soon",
    body: "Your rent of RWF 850,000 is due on 1 September for Kacyiru Residence.",
    timestamp: NOW - 4 * DAY,
    read: true,
    urgentLabel: "Action required",
    actionLabel: "Pay Now",
    actionHref: "/renter-dashboard/payments",
  },
  {
    id: "maintenance-resolved",
    category: "maintenance",
    title: "Maintenance resolved",
    body: '"Leaking Kitchen Tap" has been marked as resolved.',
    timestamp: NOW - 5 * DAY,
    read: true,
    actionLabel: "Review Request",
    actionHref: "/renter-dashboard/maintenance/HH-MNT-1042",
  },
  {
    id: "flatmate-interest",
    category: "flatmate",
    title: "Someone is interested in you",
    body: "Someone matching your preferences is interested in connecting as a flatmate.",
    timestamp: NOW - 5 * DAY - 2 * HR,
    read: true,
    actionLabel: "View Interest",
    actionHref: "/renter-dashboard/flatmates/matches",
  },
  {
    id: "favourite-update",
    category: "search",
    title: "Saved property update",
    body: "A property in your favourites is no longer available.",
    timestamp: NOW - 6 * DAY,
    read: true,
    actionLabel: "View Favourites",
    actionHref: "/renter-dashboard/saved",
  },
  {
    id: "new-login",
    category: "security",
    title: "New login detected",
    body: "Your HauxHunt account was signed in on a new device in Kigali, Rwanda.",
    timestamp: NOW - 7 * DAY,
    read: true,
    actionLabel: "Review Activity",
    actionHref: "/renter-dashboard/account?section=security&open=devices",
  },
];

// ---------------------------------------------------------------------------
// SessionStorage-backed read state
// ---------------------------------------------------------------------------

const READ_KEY = "hauxhunt-notification-read-ids";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // fail silently
  }
}

export function isNotificationRead(id: string): boolean {
  return getReadIds().has(id);
}

export function markNotificationRead(id: string) {
  const ids = getReadIds();
  if (ids.has(id)) return;
  ids.add(id);
  saveReadIds(ids);
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-notifications-changed"));
}

export function markAllNotificationsRead() {
  const ids = getReadIds();
  for (const n of MOCK_NOTIFICATIONS) ids.add(n.id);
  saveReadIds(ids);
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-notifications-changed"));
}

const CLEARED_KEY = "hauxhunt-notification-cleared-ids";

function getClearedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(CLEARED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function clearNotification(id: string) {
  const ids = getClearedIds();
  if (ids.has(id)) return;
  ids.add(id);
  if (typeof window !== "undefined") {
    try { window.sessionStorage.setItem(CLEARED_KEY, JSON.stringify(Array.from(ids))); } catch {}
  }
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-notifications-changed"));
}

export function clearAllNotifications() {
  const ids = getClearedIds();
  for (const n of MOCK_NOTIFICATIONS) ids.add(n.id);
  if (typeof window !== "undefined") {
    try { window.sessionStorage.setItem(CLEARED_KEY, JSON.stringify(Array.from(ids))); } catch {}
  }
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-notifications-changed"));
}

// ---------------------------------------------------------------------------
// Cross-Role Lifecycle Synchronization phase -- Section 45: cross-role
// events (PM sends Rental Setup, renter pays, etc.) need to actually
// produce a renter-side notification, not just a PM/Owner one. Mirrors
// professional-work.ts's pushProfessionalNotification: session-only
// additions, merged into getNotifications() below. No UI/design change.
// ---------------------------------------------------------------------------

const SESSION_KEY = "hauxhunt-renter-session-notifications";

function getSessionNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Notification[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushNotification(notification: Omit<Notification, "id" | "timestamp" | "read">) {
  if (typeof window === "undefined") return;
  const list = getSessionNotifications();
  list.unshift({ ...notification, id: `session-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4).toString(36)}`, timestamp: Date.now(), read: false });
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-notifications-changed"));
}

// ---------------------------------------------------------------------------
// Cached snapshots -- useSyncExternalStore requires getSnapshot to return the
// same reference between store changes, otherwise React loops infinitely.
// ---------------------------------------------------------------------------

let cachedNotifications: Notification[] | null = null;
let cachedUnreadCount: number | null = null;

function invalidateCache() {
  cachedNotifications = null;
  cachedUnreadCount = null;
}

export const EMPTY_NOTIFICATIONS: Notification[] = [];
export const EMPTY_UNREAD_COUNT = 0;

/** Returns notifications with live read state applied (stable reference). */
export function getNotifications(): Notification[] {
  if (cachedNotifications) return cachedNotifications;
  const readIds = getReadIds();
  const clearedIds = getClearedIds();
  const live = getSessionNotifications()
    .filter((n) => !clearedIds.has(n.id))
    .map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  const seeded = MOCK_NOTIFICATIONS
    .filter((n) => !clearedIds.has(n.id))
    .map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }));
  cachedNotifications = [...live, ...seeded];
  return cachedNotifications;
}

/** Total unread count -- used by the bell badge (stable reference). */
export function getUnreadNotificationCount(): number {
  if (cachedUnreadCount !== null) return cachedUnreadCount;
  cachedUnreadCount = getNotifications().filter((n) => !n.read).length;
  return cachedUnreadCount;
}

// ---------------------------------------------------------------------------
// useSyncExternalStore subscription helper
// ---------------------------------------------------------------------------

export function subscribeToNotifications(callback: () => void) {
  window.addEventListener("hauxhunt-notifications-changed", callback);
  return () =>
    window.removeEventListener("hauxhunt-notifications-changed", callback);
}
