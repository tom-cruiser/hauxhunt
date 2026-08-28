import type { ApplicationStatusEvent } from "@/lib/application-history";

/**
 * The applicant profile's internal audit trail (product spec §3): every
 * real transition recorded by `application-workflow.ts`, oldest first,
 * with the actor, direction, and -- for every backward move and decline --
 * the required reason. An application with no recorded events yet (the
 * seed data starts several mid-lifecycle, before this feature existed)
 * still gets a first line derived from its own `submitted` date, the same
 * way owner-dashboard/applications/page.tsx's own `timelineFor` already
 * derives its first line -- so the trail never starts on an empty gap.
 */
export function ApplicationStatusTimeline({ events, submittedOn }: { events: ApplicationStatusEvent[]; submittedOn: string }) {
  return (
    <div className="mt-6">
      <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Status history</p>
      <ul className="mt-3 space-y-3">
        <li className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-black/25" />
          <span className="text-carbon-600">Application submitted — {submittedOn}</span>
        </li>
        {events.map((event) => (
          <li key={event.id} className="flex gap-3 text-sm">
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                event.direction === "backward" ? "bg-amber-500" : event.direction === "system" ? "bg-black/25" : "bg-black"
              }`}
            />
            <div className="min-w-0">
              <p className="text-carbon-600">
                <span className="text-carbon-900 font-medium">{event.actor}</span>
                {event.direction === "backward" ? " rolled this back from " : " moved this from "}
                <span className="font-medium">{event.from ?? "the start"}</span> to <span className="font-medium">{event.to}</span>
                {event.actorRole && event.actorRole !== "System" ? <span className="text-carbon-400"> · {event.actorRole}</span> : null}
              </p>
              {event.reason ? (
                <p className="text-carbon-600 mt-1.5 rounded-lg bg-black/[0.035] px-3 py-2 text-xs leading-5">&ldquo;{event.reason}&rdquo;</p>
              ) : null}
              <p className="text-carbon-400 mt-1 text-xs">{formatTimestamp(event.timestamp)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
