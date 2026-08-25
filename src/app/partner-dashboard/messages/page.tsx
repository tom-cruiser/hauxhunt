"use client";

import { AgentMessagesWorkspace, PmMessagesWorkspace } from "@/components/partner/agent-messages-workspace";
import { usePartnerRole } from "@/components/partner/use-partner-role";

// Agent Dashboard Redesign phase: Agent gets a real, property-scoped
// Messages workspace (agent-messages-workspace.tsx).
//
// Property Manager Dashboard phase: PM now gets the exact same workspace,
// generalized rather than forked, reconnected to real PM work (Rental,
// Payment, Maintenance, Application, Owner/Team, and leasing contexts --
// Section 60-62). The old EnquiriesCalendarDashboard messages view still
// exists (unmodified, un-deleted) but is no longer routed to from here.
export default function Page() {
  const role = usePartnerRole();
  if (role === "agent") return <AgentMessagesWorkspace />;
  return <PmMessagesWorkspace />;
}
