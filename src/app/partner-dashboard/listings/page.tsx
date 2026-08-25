import { redirect } from "next/navigation";

// Foundation Cleanup phase -- "Portfolio & Listings" (PORTFOLIO_LISTINGS, a
// fictional shared dataset unrelated to any real professional identity) is
// no longer a second professional property inventory. Properties
// (/partner-dashboard/properties, backed by team-data.ts + professional-
// properties.ts) is now the single source of truth. This route stays only
// as a compatibility redirect for anything that still links here.
export default function LegacyPartnerListingsPage() {
  redirect("/partner-dashboard/properties");
}
