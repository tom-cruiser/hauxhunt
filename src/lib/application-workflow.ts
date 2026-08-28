import { updateOwnerApplication, type ApplicationStatus } from "@/lib/owner-data";
import { updateIndependentApplicationStatus } from "@/lib/professional-work";
import { canTransition, isBackwardTransition } from "@/lib/application-status-machine";
import { logStatusEvent } from "@/lib/application-history";

/**
 * The one place an application's status is actually written, for either
 * source (TEAM_ASSIGNMENT -> owner-data.ts, INDEPENDENT_AUTHORIZATION ->
 * professional-work.ts) -- composing the existing per-source updaters with
 * the transition guard (`application-status-machine.ts`) and the audit
 * trail (`application-history.ts`), rather than adding a third data store.
 * `decideApplication`/`recommendApplicationDecision` in professional-work.ts
 * are untouched and still work exactly as before; this module is for the
 * additional manual steps (Under Review, Action Required, Decision Pending
 * without a recommendation attached, and every rollback) plus the one
 * automatic step (Completed).
 */

export type ApplicationSource = "TEAM_ASSIGNMENT" | "INDEPENDENT_AUTHORIZATION";

export type TransitionResult =
  | { ok: true }
  | { ok: false; error: string };

function writeStatus(applicationId: string, source: ApplicationSource, status: ApplicationStatus) {
  if (source === "TEAM_ASSIGNMENT") {
    updateOwnerApplication(applicationId, { status });
    return;
  }
  updateIndependentApplicationStatus(applicationId, status);
}

/**
 * A partner-triggered move. Rejects anything the state machine doesn't
 * allow a partner to do by hand (including the two system-only statuses),
 * and rejects a backward move or a decline ("Not Selected") with no reason
 * -- both are required by the product spec, enforced here so a caller can
 * never bypass the rule by skipping the confirmation modal.
 */
export function transitionApplicationStatus(
  applicationId: string,
  source: ApplicationSource,
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: { name: string; role: string },
  reason?: string,
): TransitionResult {
  if (!canTransition(from, to, "partner")) {
    return { ok: false, error: `Cannot move an application from "${from}" to "${to}".` };
  }

  const backward = isBackwardTransition(from, to);
  const requiresReason = backward || to === "Not Selected";
  if (requiresReason && !reason?.trim()) {
    return { ok: false, error: backward ? "A reason is required to move an application backward." : "A reason is required to decline an application." };
  }

  writeStatus(applicationId, source, to);
  logStatusEvent({
    applicationId,
    from,
    to,
    direction: backward ? "backward" : "forward",
    actor: actor.name,
    actorRole: actor.role,
    reason: reason?.trim() || undefined,
  });

  return { ok: true };
}

/**
 * The system-triggered move into `Completed` -- called from
 * `completeRentalSetup` (pm-work.ts) the moment a rental's agreement is
 * signed and its deposit paid, never offered as a manual button (see
 * `SYSTEM_ONLY_STATUSES`). Silently a no-op if the application is already
 * Completed or isn't Approved (defensive: `completeRentalSetup` only ever
 * calls this for an application it just finished setting up for, but the
 * guard keeps this function safe to call from anywhere).
 */
export function completeApplicationAutomatically(applicationId: string, source: ApplicationSource, from: ApplicationStatus) {
  if (!canTransition(from, "Completed", "system")) return;
  writeStatus(applicationId, source, "Completed");
  logStatusEvent({
    applicationId,
    from,
    to: "Completed",
    direction: "system",
    actor: "System",
    actorRole: "System",
    reason: "Lease signed and deposit paid.",
  });
}
