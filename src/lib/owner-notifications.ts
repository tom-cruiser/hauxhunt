// Property Owner notification system -- mock/local state only, mirroring the
// renter notification system in lib/notifications.ts (same read-state
// pattern, same useSyncExternalStore contract) but scoped to events an
// owner actually needs to see: approvals, rent, maintenance, and
// delegation -- not every operational step the people they've assigned
// perform day to day.

export type OwnerNotificationCategory =
  | "application"
  | "rental-setup"
  | "rental"
  | "payment"
  | "maintenance"
  | "management"
  | "listing";

export type OwnerNotification = {
  id: string;
  category: OwnerNotificationCategory;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
  urgentLabel?: string;
};

const NOW = new Date("2026-08-22T10:00:00").getTime();
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

export const OWNER_MOCK_NOTIFICATIONS: OwnerNotification[] = [
  {
    id: "owner-approval-required",
    category: "application",
    title: "Application requires your approval",
    body: "Sarah Uwase recommends approving Julien Mugisha's renewal application for Remera Family House.",
    timestamp: NOW - 20 * MIN,
    read: false,
    urgentLabel: "Action required",
    actionLabel: "Review Application",
    actionHref: "/owner-dashboard/applications?open=HH-APP-0250",
  },
  {
    id: "owner-rent-overdue",
    category: "payment",
    title: "Rent overdue",
    body: "August rent for Remera Family House is 5 days overdue.",
    timestamp: NOW - 1 * HR,
    read: false,
    urgentLabel: "Action required",
    actionLabel: "View Payment",
    actionHref: "/owner-dashboard/payments?open=HH-PAY-20397",
  },
  {
    id: "owner-maintenance-urgent",
    category: "maintenance",
    title: "Urgent maintenance issue",
    body: "No running water was reported at Remera Family House.",
    timestamp: NOW - 3 * HR,
    read: false,
    urgentLabel: "Urgent",
    actionLabel: "View Request",
    actionHref: "/owner-dashboard/maintenance?open=HH-MNT-1050",
  },
  {
    id: "owner-agreement-signed",
    category: "rental-setup",
    title: "Agreement signed",
    body: "Julien Mugisha signed the rental agreement for Nyarutarama Garden Apartment.",
    timestamp: NOW - 1 * DAY - 1 * HR,
    read: true,
    actionLabel: "View Rental Setup",
    actionHref: "/owner-dashboard/properties/nyarutarama-2br?tab=rental",
  },
  {
    id: "owner-rent-received",
    category: "payment",
    title: "Rent received",
    body: "RWF 850,000 received for Kacyiru Residence.",
    timestamp: NOW - 1 * DAY - 3 * HR,
    read: true,
    actionLabel: "View Payment",
    actionHref: "/owner-dashboard/payments?open=HH-PAY-20551",
  },
  {
    id: "owner-pm-assigned",
    category: "management",
    title: "Property Manager assigned",
    body: "Jean Mugisha is now managing Kacyiru Residence.",
    timestamp: NOW - 2 * DAY,
    read: true,
    actionLabel: "View Property",
    actionHref: "/owner-dashboard/properties/kacyiru-2br?tab=management",
  },
  {
    id: "owner-pm-assigned-remera",
    category: "management",
    title: "Property Manager assigned",
    body: "Jean Mugisha is now managing Remera Family House.",
    timestamp: NOW - 6 * HR,
    read: false,
    actionLabel: "View Property",
    actionHref: "/owner-dashboard/properties/remera-3br?tab=team",
  },
  {
    id: "owner-listing-published",
    category: "listing",
    title: "Listing published",
    body: "Kevin Nshuti published the Modern Family Home listing.",
    timestamp: NOW - 3 * DAY,
    read: true,
    actionLabel: "View Listing",
    actionHref: "/owner-dashboard/properties/kibagabaga-modern-family-home?tab=listing",
  },
  {
    id: "owner-maintenance-submitted",
    category: "maintenance",
    title: "Maintenance request submitted",
    body: "A leaking kitchen tap was reported at Kacyiru Residence.",
    timestamp: NOW - 6 * DAY,
    read: true,
    actionLabel: "View Request",
    actionHref: "/owner-dashboard/maintenance?open=HH-MNT-1042",
  },
  {
    id: "owner-rental-ending",
    category: "rental",
    title: "Rental ending soon",
    body: "The tenancy at Remera Family House ends in 16 days.",
    timestamp: NOW - 6 * DAY - 4 * HR,
    read: true,
    actionLabel: "View Rental",
    actionHref: "/owner-dashboard/rentals?open=HH-RENT-087",
  },
];

// ---------------------------------------------------------------------------
// SessionStorage-backed read state
// ---------------------------------------------------------------------------

const READ_KEY = "hauxhunt-owner-notification-read-ids";

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

export function isOwnerNotificationRead(id: string): boolean {
  return getReadIds().has(id);
}

export function markOwnerNotificationRead(id: string) {
  const ids = getReadIds();
  if (ids.has(id)) return;
  ids.add(id);
  saveReadIds(ids);
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-owner-notifications-changed"));
}

export function markAllOwnerNotificationsRead() {
  const ids = getReadIds();
  for (const n of OWNER_MOCK_NOTIFICATIONS) ids.add(n.id);
  for (const n of getSessionNotifications()) ids.add(n.id);
  saveReadIds(ids);
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-owner-notifications-changed"));
}

// ---------------------------------------------------------------------------
// Phase 2 -- live prototype notifications. The list above is static seed
// history; these are appended at the moment a Property Manager actually
// performs a delegated action during this session (invite/assign an Agent),
// so the Owner's feed reflects what really happened rather than a fabricated
// backstory. Same sessionStorage + event pattern as everything else here --
// still no real delivery, just prototype state (see the phase brief,
// Section 46: "Do NOT build real notification delivery").
// ---------------------------------------------------------------------------

const SESSION_KEY = "hauxhunt-owner-session-notifications";

function getSessionNotifications(): OwnerNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushOwnerNotification(notification: Omit<OwnerNotification, "id" | "timestamp" | "read"> & { id?: string }) {
  if (typeof window === "undefined") return;
  const list = getSessionNotifications();
  list.unshift({ id: notification.id ?? `session-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4).toString(36)}`, timestamp: Date.now(), read: false, ...notification });
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  invalidateCache();
  window.dispatchEvent(new Event("hauxhunt-owner-notifications-changed"));
}

let cachedNotifications: OwnerNotification[] | null = null;
let cachedUnreadCount: number | null = null;

function invalidateCache() {
  cachedNotifications = null;
  cachedUnreadCount = null;
}

export function getOwnerNotifications(): OwnerNotification[] {
  if (cachedNotifications) return cachedNotifications;
  const readIds = getReadIds();
  const seeded = OWNER_MOCK_NOTIFICATIONS.map((n) => ({
    ...n,
    read: n.read || readIds.has(n.id),
  }));
  const live = getSessionNotifications().map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  cachedNotifications = [...live, ...seeded];
  return cachedNotifications;
}

export function getOwnerUnreadNotificationCount(): number {
  if (cachedUnreadCount !== null) return cachedUnreadCount;
  cachedUnreadCount = getOwnerNotifications().filter((n) => !n.read).length;
  return cachedUnreadCount;
}

export function subscribeToOwnerNotifications(callback: () => void) {
  window.addEventListener("hauxhunt-owner-notifications-changed", callback);
  return () => window.removeEventListener("hauxhunt-owner-notifications-changed", callback);
}
