import { redirect } from "next/navigation";

// Foundation Cleanup phase -- the legacy edit flow resolved a listing by
// title string against PORTFOLIO_LISTINGS, which no longer exists as a
// professional inventory. Editing a real listing now happens from that
// listing's own Property Detail page (Section 31: must resolve through
// propertyId, never a title string).
export default function LegacyPartnerEditListingPage() {
  redirect("/partner-dashboard/properties");
}
