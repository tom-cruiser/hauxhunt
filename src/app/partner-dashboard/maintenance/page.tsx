"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// Messages & Maintenance Consolidation phase -- Maintenance is now the
// "Maintenance" tab inside Messages (agent-messages-workspace.tsx's
// PmMessagesWorkspace); this route stays alive as a redirect rather than
// being deleted, so the several existing `?open=`/`?propertyId=` links
// elsewhere in the app (renter-dashboard/maintenance, pm-overview.tsx,
// professional-work.ts's notifications, the property detail page) keep
// working without every one of those call sites needing to change --
// exactly the shape Finance Consolidation's own payments/page.tsx redirect
// already established for this codebase.
export default function Page() {
  return (
    <Suspense>
      <RedirectToMessages />
    </Suspense>
  );
}

function RedirectToMessages() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "maintenance");
    router.replace(`/partner-dashboard/messages?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}
