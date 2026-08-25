"use client";

import { AgentNotifications, PmNotifications } from "@/components/partner/agent-notifications";
import { usePartnerRole } from "@/components/partner/use-partner-role";

// Agent Dashboard Redesign phase: Agent gets a real, property-scoped
// notification feed (agent-notifications.tsx).
//
// Property Manager Dashboard phase: PM now gets the exact same feed,
// generalized rather than forked, with real operational categories
// (rental/payment/maintenance/application/team/property/authorization).
export default function Page() {
  const role = usePartnerRole();
  if (role === "agent") return <AgentNotifications />;
  return <PmNotifications />;
}
