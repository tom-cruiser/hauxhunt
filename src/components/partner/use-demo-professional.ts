"use client";

import { useSyncExternalStore } from "react";
import { DEMO_AGENT_ID, DEMO_PM_ID, getProfessional, resolveDemoProfessional, type ProfessionalRole, type RegisteredProfessional } from "@/lib/team-data";

// Cross-Role Lifecycle Synchronization phase (hydration fix) -- deliberately
// its own client-only file, not part of team-data.ts. team-data.ts is
// plain data/logic with real Server Component consumers (e.g.
// owner-dashboard/account); pulling useSyncExternalStore into it would
// break every Server Component that imports it, even indirectly.
//
// resolveDemoProfessional() is impure with respect to SSR -- it reads
// localStorage (Preview As) and sessionStorage-backed team data (the "any
// pending invitation for this role" fallback), neither of which the server
// can see. The server always evaluates it against pure seed data; a client
// whose session has since diverged (e.g. a seeded pending invitation was
// accepted, or a Preview As selection is active) resolves someone else
// entirely -- a hydration mismatch in whatever text renders that name.
//
// useDemoProfessional is the hook every Agent/PM page should call instead
// of the plain function during render: before mount it returns exactly
// what the server would (the hard demo default, ignoring all browser
// storage) so the client's first render matches byte-for-byte; the real,
// possibly-different resolved professional then appears in a normal
// post-mount update, never during hydration itself.
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useDemoProfessional(role: ProfessionalRole): RegisteredProfessional | undefined {
  const mounted = useMounted();
  if (!mounted) return getProfessional(role === "agent" ? DEMO_AGENT_ID : DEMO_PM_ID);
  return resolveDemoProfessional(role);
}
