import type { ApplicationStatus } from "@/lib/owner-data";
import type { TransitionDirection } from "@/lib/application-status-machine";

/**
 * The applicant status audit trail -- a real, append-only event log, kept
 * deliberately separate from `OwnerApplication`/`IndependentApplication`
 * themselves (owner-data.ts / professional-work.ts). Those two records
 * only ever hold the CURRENT status; nothing on either one is an array, and
 * their sessionStorage "override" pattern replaces fields, it doesn't
 * accumulate them. A rollback reason has nowhere honest to live on a
 * single-status record, so this file is one small, additive store keyed by
 * `applicationId` -- valid for either source (TEAM_ASSIGNMENT or
 * INDEPENDENT_AUTHORIZATION), never duplicated per source.
 *
 * Nothing here is fake data: every event is written by
 * `application-workflow.ts` at the moment a real transition happens (manual
 * or system). An application with no recorded events yet (e.g. the seed
 * data, which starts several applications mid-lifecycle, before this
 * feature existed) simply has an empty history -- the timeline component
 * fills in a single derived "Application submitted" line for that case,
 * the same way owner-dashboard/applications/page.tsx's own `timelineFor`
 * already derives its first line from `application.submitted`.
 */

export type ApplicationStatusEvent = {
  id: string;
  applicationId: string;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  direction: TransitionDirection | "system";
  /** Display name of whoever made the change, or "System". */
  actor: string;
  actorRole: string;
  /** Required by the UI for every backward transition and every decline;
   * optional otherwise (e.g. a plain forward move needs no explanation). */
  reason?: string;
  timestamp: number;
};

const HISTORY_KEY = "hauxhunt-application-status-history";
const HISTORY_EVENT = "hauxhunt-application-history-changed";

function readAll(): ApplicationStatusEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as ApplicationStatusEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(events: ApplicationStatusEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(events));
  } catch {
    // Storage full/unavailable -- the change still applies for this render
    // via the dispatched event below, same fallback every other store here uses.
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function subscribeToApplicationHistory(callback: () => void) {
  window.addEventListener(HISTORY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(HISTORY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** All events for one application, oldest first -- ready to render top-to-bottom. */
export function getHistoryFor(applicationId: string): ApplicationStatusEvent[] {
  return readAll()
    .filter((e) => e.applicationId === applicationId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Append one event. Not exported for general use -- go through
 * `application-workflow.ts`'s `transitionApplicationStatus` /
 * `completeApplicationAutomatically`, which are what actually decide
 * whether a transition is legal before logging it. */
export function logStatusEvent(event: Omit<ApplicationStatusEvent, "id" | "timestamp">) {
  const full: ApplicationStatusEvent = {
    ...event,
    id: `evt-${event.applicationId}-${readAll().length + 1}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  writeAll([...readAll(), full]);
}
