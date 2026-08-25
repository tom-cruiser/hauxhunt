"use client";

import { AgentEnquiriesWorkspace, PmEnquiriesWorkspace } from "@/components/partner/agent-enquiries-workspace";
import { usePartnerRole } from "@/components/partner/use-partner-role";

// Agent Dashboard Redesign phase: Agent gets a real, property-scoped
// Enquiries + Calendar workspace (agent-enquiries-workspace.tsx).
//
// Property Manager Dashboard phase: PM reaches the exact same workspace,
// generalized rather than forked -- but only ever contextually, via a
// propertyId-carrying link from Property Detail's Leasing Activity section
// (Section 6/19). This route has no top-level PM nav entry pointing to it
// anymore; the old EnquiriesCalendarDashboard component still exists
// (unmodified, un-deleted) but is no longer routed to from here.
export default function Page() {
  const role = usePartnerRole();
  if (role === "agent") return <AgentEnquiriesWorkspace />;
  return <PmEnquiriesWorkspace />;
}
