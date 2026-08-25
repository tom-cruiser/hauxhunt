"use client";

import { AgentApplicationsWorkspace } from "@/components/partner/agent-applications-workspace";
import { PmApplicationsWorkspace } from "@/components/partner/pm-applications-workspace";
import { usePartnerRole } from "@/components/partner/use-partner-role";

// Agent Dashboard Redesign phase: Agent gets a real Applications screen
// (Section 30, P0 -- was a placeholder), assist-only authority.
//
// Property Manager Dashboard phase: PM now gets a real, separate
// Applications workspace (pm-applications-workspace.tsx) -- not a fork of
// Agent's file, but a distinct component because PM decision authority is
// genuinely different (direct Approve/Not Select where the Owner hasn't
// required their own approval, plus the Approved -> Start Rental Setup
// hand-off Agent never has). No more DashboardRoutePage placeholder here.
export default function Page() {
  const role = usePartnerRole();
  if (role === "agent") return <AgentApplicationsWorkspace />;
  return <PmApplicationsWorkspace />;
}
