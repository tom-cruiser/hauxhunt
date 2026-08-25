"use client";

import { usePartnerRole } from "@/components/partner/use-partner-role";
import { AgentOverview } from "@/components/partner/agent-overview";
import { PmOverview } from "@/components/partner/pm-overview";

// Agent Dashboard Redesign phase: Overview branches by role. Agent gets a
// real, professional-scoped Overview (agent-overview.tsx).
//
// Property Manager Dashboard phase: PM's Overview is now real too
// (pm-overview.tsx) -- the old fictional PropertyManagerOverview (Rent
// collected $, fake listings/requests/applicant statuses, a fake mini-chart)
// has been physically deleted from this file, not just made unreachable.
export default function PartnerDashboardPage() {
  const role = usePartnerRole();
  if (role === "agent") return <AgentOverview />;
  return <PmOverview />;
}
