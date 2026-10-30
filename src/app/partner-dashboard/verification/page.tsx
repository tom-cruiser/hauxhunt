import type { Metadata } from "next";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { PartnerVerificationForm } from "@/components/partner/partner-verification-form";

export const metadata: Metadata = {
  title: "Verification | Partner dashboard | RentUp",
  description:
    "Submit your identity and listing authority for RentUp verification.",
};

export default function PartnerVerificationPage() {
  return (
    <DashboardShell initialSection="verification">
      <PartnerVerificationForm />
    </DashboardShell>
  );
}
