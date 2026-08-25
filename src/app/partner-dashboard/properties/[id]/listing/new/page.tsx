"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { ListPropertyForm } from "@/components/properties/list-property-form";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { canManageListingFor, getPropertyAccessDetail, saveListingForProperty } from "@/lib/professional-properties";

// Foundation Cleanup phase -- the ONE property-bound Create/Edit Listing
// route (Section 25). Reuses ListPropertyForm rather than a second listing
// form; the only thing that changed is that this form now always knows
// which property it belongs to (Section 62/63: propertyId, never a title
// string), and never lets a professional reach it without the responsibility
// or authorization to actually manage that listing (Section 19/23).
export default function PropertyBoundListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const partnerRole = usePartnerRole();
  const role = partnerRole === "agent" ? "agent" : "property_manager";

  const professional = useDemoProfessional(role);
  const card = professional ? getPropertyAccessDetail(professional.id, params.id) : null;

  // No management permission, or the listing is under HauxHunt's own
  // moderation review (a separate, moderation lock -- Section 29's "In
  // Review" example only ever offers View, never Edit): send them back to
  // Property Detail, where the Listing section explains why. Never a
  // silent dead end, never a bypass.
  const blocked = card ? !canManageListingFor(card) || card.listing?.status === "In Review" : false;

  useEffect(() => {
    if (blocked && card) router.replace(`/partner-dashboard/properties/${card.propertyId}`);
  }, [blocked, card, router]);

  if (!professional || !card) return notFound();
  if (blocked) return null;

  const [neighbourhood, ...cityParts] = card.location.split(",").map((part) => part.trim());
  const city = cityParts.join(", ") || "Kigali";
  const listingAmenities = card.listing && card.listing.amenities.length > 0 ? card.listing.amenities : card.amenities;

  return (
    <DashboardShell initialSection="properties">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[980px]">
          <header className="mx-auto max-w-[980px] border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">{card.listing ? "Edit Listing" : "Create Listing"}</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Add the public details, pricing, availability, and photos renters will see. You can review everything before submitting.
            </p>
          </header>

          <div className="mx-auto mt-8 max-w-[980px]">
            <ListPropertyForm
              authenticatedPartner
              propertyContext={{
                title: card.title,
                location: card.location,
                badge: card.source === "TEAM_ASSIGNMENT" ? `Team Assigned · ${card.teamName}` : card.role === "agent" ? "Independent Representation" : "Independent Management",
              }}
              initialValues={{
                title: card.listing?.title || card.title,
                propertyType: card.type,
                country: "Rwanda",
                city,
                neighbourhood: neighbourhood || city,
                streetAddress: card.location,
                bedrooms: String(card.bedrooms),
                bathrooms: String(card.bathrooms),
                area: String(card.size),
                furnishing: card.furnished ? "Furnished" : "Unfurnished",
                amenities: listingAmenities,
              }}
              onSaved={(values, status) => saveListingForProperty(card.propertyId, values, status)}
              onDone={() => router.push(`/partner-dashboard/properties/${card.propertyId}`)}
            />
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
