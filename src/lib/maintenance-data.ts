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

export const ACTIVE_RENTALS = [
  {
    id: "HH-RENT-104",
    propertyId: "kacyiru-2br",
    title: "Kacyiru Residence",
    location: "Kacyiru, Kigali",
  },
  {
    id: "HH-RENT-087",
    propertyId: "remera-3br",
    title: "Remera Family House",
    location: "Remera, Kigali",
  },
];

export const MAINTENANCE_REQUESTS: MaintenanceRequest[] = [
  {
    id: "HH-MNT-1042",
    title: "Leaking kitchen tap",
    property: "Kacyiru Residence",
    propertyId: "kacyiru-2br",
    location: "Kacyiru, Kigali",
    category: "Plumbing",
    area: "Kitchen",
    urgency: "Normal",
    status: "In Progress",
    submitted: "14 August 2026",
    description:
      "The kitchen tap has been leaking continuously since yesterday. Water is collecting under the sink.",
    latestUpdate: "Technician scheduled for tomorrow at 10:00 AM",
    scheduledVisit: {
      date: "17 August 2026",
      time: "10:00 AM – 11:00 AM",
      contact: "Moses Habimana",
      role: "Maintenance Technician",
    },
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
  },
  {
    id: "HH-MNT-1050",
    title: "No water in apartment",
    property: "Remera Family House",
    propertyId: "remera-3br",
    location: "Remera, Kigali",
    category: "Water / Leak",
    area: "Entire property",
    urgency: "Urgent",
    status: "Under Review",
    submitted: "16 August 2026",
    description: "There has been no running water in the house since noon.",
    latestUpdate: "Property manager is reviewing the request",
    reportedBy: "Julien Mugisha",
    managedBy: "Sarah Uwase",
  },
  {
    id: "HH-MNT-1048",
    title: "Loose bedroom socket",
    property: "Kacyiru Residence",
    propertyId: "kacyiru-2br",
    location: "Kacyiru, Kigali",
    category: "Electrical",
    area: "Main Bedroom",
    urgency: "Normal",
    status: "Waiting for Renter",
    submitted: "15 August 2026",
    description: "The wall socket moves when a plug is removed.",
    latestUpdate: "Property manager requested another photo",
    informationNeeded: "Please upload a clear photo of the socket and wall.",
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
  },
  {
    id: "HH-MNT-1039",
    title: "Bathroom door lock sticking",
    property: "Kacyiru Residence",
    propertyId: "kacyiru-2br",
    location: "Kacyiru, Kigali",
    category: "Doors & Locks",
    area: "Main Bathroom",
    urgency: "Normal",
    status: "Scheduled",
    submitted: "12 August 2026",
    description: "The bathroom lock is difficult to open from inside.",
    latestUpdate: "Visit scheduled for 18 August at 2:00 PM",
    scheduledVisit: {
      date: "18 August 2026",
      time: "2:00 PM – 3:00 PM",
      contact: "Claude Mutabazi",
      role: "Maintenance Technician",
    },
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
  },
  {
    id: "HH-MNT-1024",
    title: "Bedroom light not working",
    property: "Kacyiru Residence",
    propertyId: "kacyiru-2br",
    location: "Kacyiru, Kigali",
    category: "Electrical",
    area: "Bedroom",
    urgency: "Normal",
    status: "Resolved",
    submitted: "2 August 2026",
    completed: "5 August 2026",
    description: "The ceiling light stopped turning on.",
    latestUpdate: "Light fitting replaced",
    resolution: "The faulty light fitting was replaced and tested.",
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
  },
  {
    id: "HH-MNT-1017",
    title: "Loose kitchen cabinet handle",
    property: "Kacyiru Residence",
    propertyId: "kacyiru-2br",
    location: "Kacyiru, Kigali",
    category: "Kitchen",
    area: "Kitchen",
    urgency: "Normal",
    status: "Cancelled",
    submitted: "25 July 2026",
    description: "One cabinet handle became loose.",
    latestUpdate: "Request cancelled by renter",
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
  },
];

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
}

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
