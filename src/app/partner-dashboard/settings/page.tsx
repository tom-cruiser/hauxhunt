import type { Metadata } from "next";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { PartnerSettingsContent } from "@/components/partner/partner-settings-content";

export const metadata: Metadata = {
  title: "My Account | Partner dashboard | HauxHunt",
  description: "Manage your HauxHunt partner profile and business details.",
};

export default function PartnerSettingsPage() {
  return (
    <DashboardShell initialSection="settings">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[980px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">
              My Account
            </h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Keep your personal and business information current. HauxHunt uses
              these details when you create listings and contact clients.
            </p>
          </header>

          <PartnerSettingsContent />
        </div>
      </section>
    </DashboardShell>
  );
}
