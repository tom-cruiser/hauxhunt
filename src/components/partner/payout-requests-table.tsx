import { AlertTriangle } from "lucide-react";

import { StatusPill } from "@/components/owner/status-pill";
import type { PayoutDestination, PayoutRequest } from "@/lib/payouts";

/**
 * Payout lifecycle tracking (product spec §3): every request this
 * professional has made, newest first, with the four statuses the spec
 * calls for. A Failed row is actionable, not a dead end -- it names the
 * problem and offers exactly the two things that can fix it: add a
 * corrected destination, or retry once one exists.
 */
export function PayoutRequestsTable({
  requests,
  destinations,
  onAddDestination,
  onRetry,
}: {
  requests: PayoutRequest[];
  destinations: PayoutDestination[];
  onAddDestination: () => void;
  onRetry: (request: PayoutRequest) => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-14 text-center">
        <p className="text-carbon-500 text-sm">No payout requests yet. Request a payout to see it tracked here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <div className="divide-y divide-black/8">
        {requests.map((request) => {
          const destination = destinations.find((d) => d.id === request.destinationId);
          return (
            <div key={request.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{request.net}</p>
                  <p className="text-carbon-500 mt-1 text-xs">
                    {request.amount} requested · {request.fee} fee · to {destination?.label ?? "a removed destination"}
                  </p>
                  <p className="text-carbon-400 mt-1 text-xs">{formatDate(request.requestedAt)}</p>
                </div>
                <StatusPill status={request.status} />
              </div>

              {request.status === "Failed" ? (
                <div className="mt-4 rounded-xl bg-black/[0.03] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-black/50" />
                    <p className="text-carbon-600 text-xs leading-5">{request.failureReason ?? "This payout couldn't be completed."}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onAddDestination}
                      className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-xs font-medium hover:border-black"
                    >
                      Add New Destination
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetry(request)}
                      disabled={destinations.length === 0}
                      className="font-bricolage inline-flex h-9 items-center rounded-full bg-black px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Retry Payout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
