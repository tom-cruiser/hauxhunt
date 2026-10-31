import { syncWrite } from "@/lib/api/client";
export type MaintenanceStatus =
  | "Submitted"
  | "Under Review"
  | "Scheduled"
  | "In Progress"
  | "Waiting for Renter"
  | "Resolved"
  | "Cancelled";

export type MaintenanceRequest = {
  id: string;
  title: string;
  property: string;
  propertyId: string;
  location: string;
  category: string;
  area: string;
  urgency: "Normal" | "Urgent";
  status: MaintenanceStatus;
  submitted: string;
  completed?: string;
  description: string;
  latestUpdate: string;
  informationNeeded?: string;
  resolution?: string;
  scheduledVisit?: {
    date: string;
    time: string;
    contact: string;
    role: string;
  };
  // Property Manager Dashboard phase -- who filed it and who's operating on
  // it, so the SAME request reads identically from the renter, Owner, and
  // PM side (Section 54/69: propertyId identity, no title-matching, no
  // second PM-only maintenance dataset).
  reportedBy: string;
  managedBy: string | null;
};

export const ACTIVE_RENTALS: {
  id: string;
  propertyId: string;
  title: string;
  location: string;
}[] = [];

export const MAINTENANCE_REQUESTS: MaintenanceRequest[] = [];

// ---------------------------------------------------------------------------
// Session overrides -- same pattern as owner-data.ts's Applications/Rentals/
// Payments. Property Manager Dashboard phase: this is what makes PM's
// Maintenance page (and Property Detail's Maintenance summary) a REAL,
// mutable workspace instead of a static read of MAINTENANCE_REQUESTS,
// without inventing a second, PM-only maintenance dataset -- the renter's
// own filed request and the PM's operational view are the exact same record.
// ---------------------------------------------------------------------------

const MAINTENANCE_OVERRIDES_KEY = "hauxhunt-maintenance-overrides";
const MAINTENANCE_EVENT = "hauxhunt-maintenance-changed";

type MaintenanceOverride = Partial<Pick<MaintenanceRequest, "status" | "latestUpdate" | "scheduledVisit" | "informationNeeded" | "resolution" | "completed">>;

function readMaintenanceOverrides(): Record<string, MaintenanceOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(MAINTENANCE_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MaintenanceOverride>) : {};
  } catch {
    return {};
  }
}

function writeMaintenanceOverrides(overrides: Record<string, MaintenanceOverride>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MAINTENANCE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(MAINTENANCE_EVENT));
}

export function subscribeToMaintenance(callback: () => void) {
  window.addEventListener(MAINTENANCE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MAINTENANCE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getMaintenanceRequests(): MaintenanceRequest[] {
  const overrides = readMaintenanceOverrides();
  const base = MAINTENANCE_REQUESTS.map((request) => ({ ...request, ...overrides[request.id] }));
  const added = readMaintenanceAdditions().map((request) => ({ ...request, ...overrides[request.id] }));
  return [...added, ...base];
}

export function getMaintenanceRequest(id: string): MaintenanceRequest | undefined {
  return getMaintenanceRequests().find((r) => r.id === id);
}

export function updateMaintenanceRequest(requestId: string, patch: MaintenanceOverride) {
  const overrides = readMaintenanceOverrides();
  overrides[requestId] = { ...overrides[requestId], ...patch };
  writeMaintenanceOverrides(overrides);
  const isRenter = window.sessionStorage.getItem("hauxhunt-authenticated-role") === "renter";
  if (isRenter && patch.status === "Cancelled") {
    syncWrite(`/maintenance-requests/${requestId}/cancel`);
  } else if (isRenter && patch.status === "Under Review") {
    syncWrite(`/maintenance-requests/${requestId}/reopen`, { message: patch.latestUpdate ?? "Reopened by renter" });
  } else if (!isRenter) {
    syncWrite(
      `/maintenance-requests/${requestId}`,
      {
        status: patch.status?.toLowerCase().replace(/ /g, "_"),
        latestUpdate: patch.latestUpdate,
        informationNeeded: patch.informationNeeded,
        resolution: patch.resolution,
        scheduledVisit: patch.scheduledVisit,
      },
      "PATCH",
    );
  }
}

// Cross-Role Lifecycle Synchronization phase -- Section 29: a renter's new
// request must become the SAME record PM/Owner see, never a local-only
// addition. Mirrors the additions store already used for Rentals/Payments
// in owner-data.ts.
const MAINTENANCE_ADDITIONS_KEY = "hauxhunt-maintenance-additions";

function readMaintenanceAdditions(): MaintenanceRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(MAINTENANCE_ADDITIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as MaintenanceRequest[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMaintenanceAdditions(requests: MaintenanceRequest[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MAINTENANCE_ADDITIONS_KEY, JSON.stringify(requests));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(MAINTENANCE_EVENT));
}

export function createMaintenanceRequest(request: MaintenanceRequest) {
  writeMaintenanceAdditions([request, ...readMaintenanceAdditions()]);
  const rental = ACTIVE_RENTALS.find((item) => item.propertyId === request.propertyId);
  syncWrite("/maintenance-requests", {
    rentalId: rental?.id,
    title: request.title,
    category: request.category,
    area: request.area,
    urgency: request.urgency.toLowerCase(),
    description: request.description,
  });
}

// Maintenance-in-Messages phase -- the one status transition map for
// maintenance requests, shared by the Maintenance workspace (full detail +
// actions) and the Messages thread's inline maintenance card (Section: never
// a second, page-local copy of what actions a status allows -- the same
// mistake maintenance-data.ts's own doc comment already calls out for a
// second maintenance vocabulary).
export const MAINTENANCE_STATUS_ACTIONS: Partial<Record<MaintenanceStatus, { label: string; next: MaintenanceStatus }[]>> = {
  Submitted: [{ label: "Review Request", next: "Under Review" }],
  "Under Review": [
    { label: "Schedule Visit", next: "Scheduled" },
    { label: "Request Information", next: "Waiting for Renter" },
  ],
  Scheduled: [
    { label: "Mark In Progress", next: "In Progress" },
    { label: "Cancel", next: "Cancelled" },
  ],
  "In Progress": [
    { label: "Resolve", next: "Resolved" },
    { label: "Cancel", next: "Cancelled" },
  ],
  "Waiting for Renter": [
    { label: "Mark In Progress", next: "In Progress" },
    { label: "Cancel", next: "Cancelled" },
  ],
};

export const ISSUE_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Heating / Cooling",
  "Appliance",
  "Doors & Locks",
  "Bathroom",
  "Kitchen",
  "Water / Leak",
  "Internet / Utilities",
  "Pest",
  "Structural",
  "Cleaning / Common Area",
  "Other",
];

export const PROPERTY_AREAS = [
  "Kitchen",
  "Main Bathroom",
  "Bedroom",
  "Living Room",
  "Balcony",
  "Entrance",
  "Common Area",
  "Other",
];
