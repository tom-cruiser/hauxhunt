import type { Metadata } from "next";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { PerformanceDashboard } from "@/components/partner/performance-dashboard";

export const metadata: Metadata = {
  title: "Listing performance | Partner dashboard | RentUp",
  description:
    "Understand how property seekers discover and respond to your listings.",
};

export default function PartnerPerformancePage() {
  return (
    <DashboardShell initialSection="performance">
      <PerformanceDashboard />
    </DashboardShell>
  );
}
