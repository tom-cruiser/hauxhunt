/**
 * Free-vs-paid feature gating rules, shared by every role's UI.
 *
 * This app has no server — no API routes, no middleware.ts, no database
 * (confirmed: `find src/app -type d -name api` and `find . -iname
 * middleware*` both come up empty). Everything renders and persists
 * client-side. So this module is what "backend middleware" becomes here: a
 * set of pure, framework-agnostic predicate functions that both the
 * "middleware" role (deciding whether an action is allowed) and the "UI
 * guard" role (deciding what to render) call directly, with no network
 * round-trip in between. If this product ever gets a real backend, these
 * same functions are what a route handler would import and call server-side
 * — the logic doesn't change, only where it runs.
 *
 * Only import `Tier` from here, never redeclare it — `src/hooks/use-tier.ts`
 * owns the type since it also owns the client-side storage of the value.
 * This module has no "use client" directive and no browser API calls, so it
 * is safe to import from both client and (if this app ever gets one) server
 * code — but it is called from client components today, so it must not gain
 * a `server-only` import.
 */
import type { Tier } from "@/hooks/use-tier";

export function requirePaidTier(tier: Tier): boolean {
  return tier === "paid";
}

// --- Tenant: agent/landlord messaging cap ---------------------------------

/** Free tenants may message up to this many distinct agents/landlords per
 * calendar month (see `src/lib/tenant-messaging-limit.ts` for how "this
 * month" and "distinct" are tracked). Re-messaging an agent/landlord already
 * in that list never counts against the cap — it's a cap on new contacts,
 * not on message volume. */
export const FREE_TENANT_MONTHLY_AGENT_LIMIT = 3;

export function canMessageAgent(
  tier: Tier,
  agentId: string,
  agentsAlreadyMessagedThisMonth: readonly string[],
): boolean {
  return (
    tier === "paid" ||
    agentsAlreadyMessagedThisMonth.includes(agentId) ||
    agentsAlreadyMessagedThisMonth.length < FREE_TENANT_MONTHLY_AGENT_LIMIT
  );
}

// --- Tenant: viewing fee cap -----------------------------------------------

/** Paid tenants never pay more than this for a viewing, in RWF. Free tenants
 * pay whatever the agent/landlord sets (uncapped "market rate"). */
export const PAID_TENANT_VIEWING_FEE_CAP_RWF = 5000;

export function getViewingFeeCap(tier: Tier): number | null {
  return tier === "paid" ? PAID_TENANT_VIEWING_FEE_CAP_RWF : null;
}

export function applyViewingFeeCap(marketFeeRwf: number, tier: Tier): number {
  const cap = getViewingFeeCap(tier);
  return cap === null ? marketFeeRwf : Math.min(marketFeeRwf, cap);
}

// --- Locked-feature registry -----------------------------------------------

/**
 * Every paid-only feature this task gates, whether or not the underlying
 * feature actually exists yet (most don't — see the analysis in the task
 * that introduced this file). `LockedFeature`/`LockedPanel`
 * (`src/components/tier/locked-feature.tsx`) render from this registry so
 * copy and the upgrade destination live in exactly one place per feature.
 */
export type GatedFeature =
  | "tenant.agentMessaging"
  | "tenant.mapView"
  | "tenant.houseReviews"
  | "tenant.redAlert"
  | "tenant.maintenanceRequests"
  | "tenant.whatsappAlerts"
  | "owner.verifiedBadge"
  | "owner.tenantHistory"
  | "owner.rentCollection"
  | "owner.bankAttachment"
  | "owner.propertyBoost"
  | "owner.whatsappAlerts"
  | "agent.verifiedBadge"
  | "agent.tenantHistory"
  | "agent.rentCollection"
  | "agent.bankAttachment"
  | "agent.propertyBoost"
  | "agent.whatsappAlerts";

type FeatureCopy = {
  /** Short label for the locked control itself (button/row/badge text). */
  label: string;
  /** Modal/panel heading. */
  title: string;
  /** Modal/panel body copy. */
  description: string;
  /** Where "Upgrade to Paid" sends the user — each role's account/settings
   * page, opened on its Plan section. */
  upgradeHref: string;
};

const TENANT_UPGRADE_HREF = "/renter-dashboard/account?section=plan";
const OWNER_UPGRADE_HREF = "/owner-dashboard/account?section=plan";
const AGENT_UPGRADE_HREF = "/partner-dashboard/settings?section=plan";

export const GATED_FEATURES: Record<GatedFeature, FeatureCopy> = {
  "tenant.agentMessaging": {
    label: "Messaging limit reached",
    title: "You've reached your free messaging limit",
    description:
      "Free accounts can message up to 3 property managers or agents each month. Upgrade to Paid for unlimited messaging.",
    upgradeHref: TENANT_UPGRADE_HREF,
  },
  "tenant.mapView": {
    label: "Map view",
    title: "See listings on a map",
    description:
      "Upgrade to Paid to view every listing on a map and get the exact location link for each home.",
    upgradeHref: TENANT_UPGRADE_HREF,
  },
  "tenant.houseReviews": {
    label: "House reviews",
    title: "Read and write house reviews",
    description:
      "Upgrade to Paid to read what other renters say about a home, and to leave your own review once you've rented or visited.",
    upgradeHref: TENANT_UPGRADE_HREF,
  },
  "tenant.redAlert": {
    label: "Priority alert",
    title: "Get a priority alert on your request",
    description:
      "Upgrade to Paid so HauxHunt flags your property requests to landlords and agents with priority, so they're seen first.",
    upgradeHref: TENANT_UPGRADE_HREF,
  },
  "tenant.maintenanceRequests": {
    label: "Maintenance requests",
    title: "Submit maintenance requests in-app",
    description:
      "Upgrade to Paid to report and track maintenance issues directly in HauxHunt instead of contacting your manager separately.",
    upgradeHref: TENANT_UPGRADE_HREF,
  },
  "tenant.whatsappAlerts": {
    label: "WhatsApp alerts",
    title: "Get alerts on WhatsApp",
    description:
      "Upgrade to Paid to receive match, viewing, and rental alerts on WhatsApp in addition to in-app, email, and SMS.",
    upgradeHref: TENANT_UPGRADE_HREF,
  },
  "owner.verifiedBadge": {
    label: "Verified badge",
    title: "Show a verified listing badge",
    description:
      "Upgrade to Paid to display a verified badge on your listings, signalling extra trust to renters.",
    upgradeHref: OWNER_UPGRADE_HREF,
  },
  "owner.tenantHistory": {
    label: "Tenant history",
    title: "See this property's full tenant history",
    description:
      "Upgrade to Paid to view every past tenancy on this property, not just a summary.",
    upgradeHref: OWNER_UPGRADE_HREF,
  },
  "owner.rentCollection": {
    label: "In-app rent collection",
    title: "Collect rent in-app",
    description:
      "Upgrade to Paid to send payment requests and collect rent directly through HauxHunt.",
    upgradeHref: OWNER_UPGRADE_HREF,
  },
  "owner.bankAttachment": {
    label: "Bank attachment",
    title: "Attach a bank account for payouts",
    description:
      "Upgrade to Paid to attach a bank account and receive rent payouts directly.",
    upgradeHref: OWNER_UPGRADE_HREF,
  },
  "owner.propertyBoost": {
    label: "Property boost",
    title: "Boost this listing",
    description:
      "Upgrade to Paid to boost this listing so it's seen by more renters.",
    upgradeHref: OWNER_UPGRADE_HREF,
  },
  "owner.whatsappAlerts": {
    label: "WhatsApp alerts",
    title: "Get alerts on WhatsApp",
    description:
      "Upgrade to Paid to receive application, payment, and maintenance alerts on WhatsApp in addition to in-app.",
    upgradeHref: OWNER_UPGRADE_HREF,
  },
  "agent.verifiedBadge": {
    label: "Verified badge",
    title: "Show a verified listing badge",
    description:
      "Upgrade to Paid to display a verified badge on your listings, signalling extra trust to renters.",
    upgradeHref: AGENT_UPGRADE_HREF,
  },
  "agent.tenantHistory": {
    label: "Tenant history",
    title: "See this applicant's full tenant history",
    description:
      "Upgrade to Paid to view an applicant's previous tenancies, on-time payment reliability, and past landlord feedback before you decide.",
    upgradeHref: AGENT_UPGRADE_HREF,
  },
  "agent.rentCollection": {
    label: "In-app rent collection",
    title: "Collect rent in-app",
    description:
      "Upgrade to Paid to collect rent directly through HauxHunt, with automatic payout history and a live billing schedule for every tenant.",
    upgradeHref: AGENT_UPGRADE_HREF,
  },
  "agent.bankAttachment": {
    label: "Bank attachment",
    title: "Attach a bank account for viewing fees",
    description:
      "Free accounts collect viewing fees off-platform. Upgrade to Paid to attach a bank account and collect them directly in-app.",
    upgradeHref: AGENT_UPGRADE_HREF,
  },
  "agent.propertyBoost": {
    label: "Property boost",
    title: "Boost this listing",
    description:
      "Upgrade to Paid to boost this listing so it's seen by more renters.",
    upgradeHref: AGENT_UPGRADE_HREF,
  },
  "agent.whatsappAlerts": {
    label: "WhatsApp alerts",
    title: "Get alerts on WhatsApp",
    description:
      "Upgrade to Paid to receive enquiry, viewing, and application alerts on WhatsApp in addition to in-app.",
    upgradeHref: AGENT_UPGRADE_HREF,
  },
};
