"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  DATA_CHANGED_EVENT,
  WRITE_FAILED_EVENT,
} from "@/lib/api/client";
import { hydrateStores, refreshStores } from "@/lib/api/hydrate";
import {
  clearSessionMirror,
  dashboardFor,
  fetchMe,
  mirrorSession,
  type Me,
} from "@/lib/api/session";

const DASHBOARDS: [prefix: string, roles: Me["role"][]][] = [
  ["/renter-dashboard", ["renter"]],
  ["/owner-dashboard", ["owner"]],
  ["/partner-dashboard", ["property_manager", "agent"]],
];

/**
 * Loads the real session on every navigation and keeps people out of
 * dashboards that aren't theirs. The API enforces this on all data; this only
 * sends them somewhere useful.
 */
export function SessionSync() {
  const pathname = usePathname();
  const router = useRouter();
  const [failure, setFailure] = useState("");

  useEffect(() => {
    let cancelled = false;
    const dashboard = DASHBOARDS.find(([prefix]) => pathname.startsWith(prefix));

    fetchMe()
      .then((me) => {
        if (cancelled) return;
        mirrorSession(me);
        void hydrateStores(me).catch(() => {});
        if (dashboard && !dashboard[1].includes(me.role)) {
          router.replace(dashboardFor(me.role));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          clearSessionMirror();
          if (dashboard) {
            router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    const showFailure = (event: Event) => {
      setFailure((event as CustomEvent<string>).detail);
      window.setTimeout(() => setFailure(""), 5000);
    };
    window.addEventListener(WRITE_FAILED_EVENT, showFailure);
    return () => window.removeEventListener(WRITE_FAILED_EVENT, showFailure);
  }, []);

  useEffect(() => {
    const reload = () => void refreshStores().catch(() => {});
    window.addEventListener(DATA_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, reload);
  }, []);

  return failure ? (
    <div role="alert" className="feedback-toast">
      {failure}
    </div>
  ) : null;
}
