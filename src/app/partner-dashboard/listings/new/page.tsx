import { redirect } from "next/navigation";

// Foundation Cleanup phase -- listing creation is no longer a free-floating
// entry point that can invent property identity out of nothing (Section
// 24). Every listing must now belong to a property the professional
// actually has Team Assignment or Independent Authorization access to.
// Redirect to Properties with a small guidance banner rather than dropping
// straight into a form with no property behind it.
export default function LegacyPartnerNewListingPage() {
  redirect("/partner-dashboard/properties?guidance=create-listing");
}
