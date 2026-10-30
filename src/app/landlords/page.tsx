import type { Metadata } from "next";

import { Navbar } from "@/components/layout/navbar";
import { PublicListingGate } from "@/components/properties/public-listing-gate";

export const metadata: Metadata = {
  title: "List a property | RentUp",
  description:
    "List a rental property on RentUp as a property manager, agent, or agency.",
};

export default function LandlordsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-carbon-50 min-h-svh pt-16">
        <PublicListingGate />
      </main>
    </>
  );
}
