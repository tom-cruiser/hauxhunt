"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// Finance Consolidation phase -- Payments is now the "Payments" tab inside
// Finance (finance-workspace.tsx); this route stays alive as a redirect
// rather than being deleted, so the several existing `?open=`/`?propertyId=`
// links elsewhere in the app (pm-overview.tsx, professional-work.ts's
// notifications, property/rental detail pages) keep working without every
// one of those call sites needing to change.
export default function Page() {
  return (
    <Suspense>
      <RedirectToFinance />
    </Suspense>
  );
}

function RedirectToFinance() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "payments");
    router.replace(`/partner-dashboard/finance?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}
