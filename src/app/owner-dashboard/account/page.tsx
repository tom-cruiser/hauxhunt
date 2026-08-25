import type { Metadata } from "next";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { OwnerAccountContent } from "@/components/owner/owner-account-content";

export const metadata: Metadata = {
  title: "My Account | Owner dashboard | HauxHunt",
  description: "Manage your HauxHunt property owner profile, login, and notification preferences.",
};

export default function OwnerAccountPage() {
  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[720px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">My Account</h1>
            <p className="text-carbon-600 mt-5 text-base leading-7">Manage your personal information, security, and preferences.</p>
          </header>

          <OwnerAccountContent />
        </div>
      </section>
    </OwnerDashboardShell>
  );
}
