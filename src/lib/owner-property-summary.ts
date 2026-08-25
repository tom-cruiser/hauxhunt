// Owner Properties phase (Phase 3) -- the one place a property's live
// "what's happening here" signal is computed, for Properties cards (and
// anywhere else that later wants it). Deliberately its own small file,
// sitting above owner-data.ts, maintenance-data.ts, and professional-work.ts
// rather than inside any of them: owner-data.ts must never import
// professional-work.ts (professional-work.ts already imports owner-data.ts
// -- the opposite direction would be a real circular import), so a helper
// that needs both (ownerDecidesApplication lives in professional-work.ts)
// has to live somewhere that can depend on both without being depended on
// by either. Every field below is read straight from the exact shared
// stores every other Owner/PM/Renter surface already reads -- never a
// second property-summary dataset.

import { getOwnerApplications, getOwnerPayments, getOwnerRentals, type OwnerRental } from "@/lib/owner-data";
import { getMaintenanceRequests } from "@/lib/maintenance-data";
import { ownerDecidesApplication } from "@/lib/professional-work";

export type PropertyOperationalSummary = {
  // Section 14: "active" means non-terminal -- Submitted through Decision
  // Pending/Action Required/Under Review. Approved and Not Selected are
  // history once decided, not portfolio activity an Owner needs to track,
  // so they're excluded here (a completed application still lives on the
  // Applications screen and this property's Listing tab).
  activeApplications: number;
  needsOwnerDecision: boolean;
  currentRental: OwnerRental | null;
  openMaintenanceCount: number;
  hasUrgentMaintenance: boolean;
  hasOverduePayment: boolean;
  // Section 19: derived transparently from the three conditions above --
  // never a scored/weighted signal.
  needsAttention: boolean;
};

export function getPropertyOperationalSummary(propertyId: string): PropertyOperationalSummary {
  const applications = getOwnerApplications().filter((a) => a.propertyId === propertyId);
  const activeApplications = applications.filter((a) => a.status !== "Approved" && a.status !== "Not Selected");
  const needsOwnerDecision = activeApplications.some((a) => ownerDecidesApplication(a));

  const rentals = getOwnerRentals().filter((r) => r.propertyId === propertyId);
  const currentRental = rentals.find((r) => r.status === "Active" || r.status === "Ending Soon" || r.status === "Upcoming") ?? null;

  const maintenance = getMaintenanceRequests().filter((m) => m.propertyId === propertyId);
  const openMaintenance = maintenance.filter((m) => m.status !== "Resolved" && m.status !== "Cancelled");
  const hasUrgentMaintenance = openMaintenance.some((m) => m.urgency === "Urgent");

  const hasOverduePayment = getOwnerPayments().some((p) => p.propertyId === propertyId && p.status === "Overdue");

  return {
    activeApplications: activeApplications.length,
    needsOwnerDecision,
    currentRental,
    openMaintenanceCount: openMaintenance.length,
    hasUrgentMaintenance,
    hasOverduePayment,
    needsAttention: needsOwnerDecision || hasOverduePayment || hasUrgentMaintenance,
  };
}

// One dominant reason, not a list -- Section 20's hierarchy keeps the
// attention marker singular. Priority: a decision only the Owner can make
// blocks the tenancy pipeline outright, so it outranks a payment that's
// merely late, which in turn is more pressing than a maintenance issue
// already being tracked.
export function attentionReasonFor(summary: PropertyOperationalSummary): string | null {
  if (summary.needsOwnerDecision) return "Decision required";
  if (summary.hasOverduePayment) return "Payment overdue";
  if (summary.hasUrgentMaintenance) return "Urgent maintenance";
  return null;
}
