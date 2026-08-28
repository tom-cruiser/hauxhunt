"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { isPaidTier, useTier } from "@/hooks/use-tier";
import { LockedFeature } from "@/components/tier/locked-feature";
import { TenantHistoryDrawer } from "@/components/partner/tenant-history-drawer";
import type { GatedFeature } from "@/lib/access-control";

/**
 * The "View Tenant History" trigger, shared by the Owner, Property Manager,
 * and Agent applications views -- one component so all three stay in sync
 * instead of re-implementing the tier check three times. `feature` lets
 * each caller pass its own registry key ("owner.tenantHistory" or
 * "agent.tenantHistory") so the upgrade destination matches that role's own
 * account/settings page.
 */
export function TenantHistoryButton({ applicantName, feature }: { applicantName: string; feature: GatedFeature }) {
  const tier = useTier();
  const [open, setOpen] = useState(false);

  if (!isPaidTier(tier)) {
    return <LockedFeature feature={feature} variant="button" label="View Tenant History" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
      >
        <History aria-hidden="true" className="size-4" />
        View Tenant History
      </button>
      <TenantHistoryDrawer open={open} onClose={() => setOpen(false)} applicantName={applicantName} />
    </>
  );
}
