import type { Metadata } from "next";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { ListPropertyForm } from "@/components/properties/list-property-form";

export const metadata: Metadata = {
  title: "Add property | Owner dashboard | HauxHunt",
  description: "Add a property you own to HauxHunt.",
};

export default function NewOwnerPropertyPage() {
  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="mx-auto max-w-[980px] border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Add a property</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Add the property details, pricing, availability, and photos. You can assign a Property
              Manager or Agent afterwards, or keep managing it yourself.
            </p>
          </header>
          <div className="mx-auto mt-8 max-w-[980px]">
            <ListPropertyForm authenticatedPartner />
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}
