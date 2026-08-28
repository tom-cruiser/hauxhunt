import type { ApplicationStatus } from "@/lib/owner-data";

/**
 * The applicant lifecycle state machine, shared by every surface that shows
 * an application's status (Owner, Property Manager, Agent). `ApplicationStatus`
 * itself stays owned by owner-data.ts ("the shared status vocabulary" module,
 * reused by the renter side too) -- this file only adds the transition RULES
 * on top of it: what a partner may do next from a given status, which of
 * those moves count as a rollback (and therefore require a reason), and
 * which two statuses are system-only and never offered as a manual button.
 * No UI, no storage, no side effects -- pure functions over the graph below,
 * same style as `access-control.ts`.
 *
 * Status meanings, for reference:
 *   Submitted        -- system: set the moment a renter submits ("new").
 *   Under Review     -- manual: a partner has started actively reviewing.
 *   Action Required  -- manual: the partner is waiting on the applicant for
 *                       missing info/documents.
 *   Decision Pending -- manual: internal review is done; waiting on a final
 *                       call (a recommendation sent up, or a co-owner check).
 *   Approved         -- manual: the final positive decision.
 *   Not Selected     -- manual: the final negative decision ("decline").
 *   Completed        -- system: set once the resulting rental's lease is
 *                       signed and the deposit is paid (see
 *                       `completeApplicationAutomatically` below, called
 *                       from `completeRentalSetup` in pm-work.ts).
 */

export type TransitionActor = "system" | "partner";
export type TransitionDirection = "forward" | "backward";

/** Statuses a partner can never set by hand -- only the system flips these. */
export const SYSTEM_ONLY_STATUSES: ReadonlySet<ApplicationStatus> = new Set(["Submitted", "Completed"]);

/** True dead ends: no transition, forward or backward, ever leaves these.
 * "Not Selected" is deliberately NOT here -- a partner may reopen a declined
 * application (see `BACKWARD_TRANSITIONS`); "Completed" is the only status a
 * rollback can never reach, per the product requirement. */
export const FINAL_STATUSES: ReadonlySet<ApplicationStatus> = new Set(["Completed"]);

/**
 * Manual forward moves available from each status. Approved/Not Selected are
 * reachable directly from Under Review and Action Required (not only from
 * Decision Pending) because a reviewer with direct decision authority has
 * always been able to skip straight to a final call in this app (see
 * `canDecideDirectly` in the workspaces) -- this graph only adds vocabulary
 * for the intermediate steps, it never narrows what direct authority could
 * already do.
 */
const FORWARD_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  Submitted: ["Under Review"],
  "Under Review": ["Action Required", "Decision Pending", "Approved", "Not Selected"],
  "Action Required": ["Under Review", "Decision Pending", "Approved", "Not Selected"],
  "Decision Pending": ["Approved", "Not Selected"],
  Approved: ["Completed"],
  "Not Selected": [],
  Completed: [],
};

/**
 * Manual backward (rollback) moves. Every one of these requires a reason --
 * enforced by the UI (`StatusReasonModal`), not this module, which only
 * says whether the move is legal at all. `Completed` has none: once a lease
 * is signed and a deposit paid, there is nothing left to roll back to.
 */
const BACKWARD_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  Submitted: [],
  "Under Review": [],
  "Action Required": ["Under Review"],
  "Decision Pending": ["Under Review", "Action Required"],
  Approved: ["Under Review"],
  "Not Selected": ["Under Review"],
  Completed: [],
};

export type StatusTransition = {
  to: ApplicationStatus;
  direction: TransitionDirection;
};

/**
 * Every legal move out of `status` that a PARTNER may trigger by hand,
 * tagged with its direction -- what the contextual action bar renders, so
 * it never has to know the graph itself. System-only destinations
 * (Submitted, Completed) are never included here.
 */
export function getAvailableTransitions(status: ApplicationStatus): StatusTransition[] {
  const forward = FORWARD_TRANSITIONS[status]
    .filter((to) => !SYSTEM_ONLY_STATUSES.has(to))
    .map((to): StatusTransition => ({ to, direction: "forward" }));
  const backward = BACKWARD_TRANSITIONS[status].map((to): StatusTransition => ({ to, direction: "backward" }));
  return [...forward, ...backward];
}

/**
 * The transition guard. Every status write in this app should ask this
 * before writing -- it is the one place "can this jump happen" is decided.
 * `actor` defaults to "partner" (a human clicking a button); pass "system"
 * only from automatic code paths (submission, `completeRentalSetup`) that
 * need to reach `Submitted`/`Completed`.
 */
export function canTransition(from: ApplicationStatus, to: ApplicationStatus, actor: TransitionActor = "partner"): boolean {
  if (from === to) return false;
  if (actor === "partner" && SYSTEM_ONLY_STATUSES.has(to)) return false;
  return FORWARD_TRANSITIONS[from].includes(to) || BACKWARD_TRANSITIONS[from].includes(to);
}

/** Null when `from -> to` isn't a legal move at all (see `canTransition`). */
export function getTransitionDirection(from: ApplicationStatus, to: ApplicationStatus): TransitionDirection | null {
  if (FORWARD_TRANSITIONS[from]?.includes(to)) return "forward";
  if (BACKWARD_TRANSITIONS[from]?.includes(to)) return "backward";
  return null;
}

export function isBackwardTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return getTransitionDirection(from, to) === "backward";
}

export function isFinalStatus(status: ApplicationStatus): boolean {
  return FINAL_STATUSES.has(status);
}

/** A decided outcome -- nothing left for a partner to push forward, though a
 * rollback may still be offered (e.g. reopening a declined application).
 * Distinct from `isFinalStatus`, which additionally forbids rollback. */
export function isDecided(status: ApplicationStatus): boolean {
  return status === "Approved" || status === "Not Selected" || status === "Completed";
}
