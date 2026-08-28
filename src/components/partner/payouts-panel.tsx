"use client";

import { useEffect, useReducer, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { formatRwf } from "@/lib/owner-data";
import { getAvailableBalance, getDestinationsFor, getPayoutRequestsFor, subscribeToPayouts, type PayoutRequest } from "@/lib/payouts";
import { PayoutDestinationsPanel } from "@/components/partner/payout-destinations-panel";
import { PayoutRequestsTable } from "@/components/partner/payout-requests-table";
import { RequestPayoutModal } from "@/components/partner/request-payout-modal";
import { AddPayoutDestinationModal } from "@/components/partner/add-payout-destination-modal";

/**
 * The Payouts tab (product spec, in full): the real available balance
 * (collected rent minus what's already been paid out or is in flight --
 * see `getAvailableBalance`), the saved-destinations dashboard, the
 * request flow, and lifecycle tracking -- composed here so
 * finance-workspace.tsx only needs to render one component per tab.
 */
export function PayoutsPanel({ professionalId }: { professionalId: string }) {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToPayouts(forceUpdate), []);

  const [requestOpen, setRequestOpen] = useState(false);
  const [retryPrefill, setRetryPrefill] = useState<{ amountValue: number; destinationId: string } | null>(null);
  const [addDestinationOpen, setAddDestinationOpen] = useState(false);

  const destinations = getDestinationsFor(professionalId);
  const requests = getPayoutRequestsFor(professionalId);
  const balance = getAvailableBalance(professionalId);

  function retryRequest(request: PayoutRequest) {
    setRetryPrefill({ amountValue: request.amountValue, destinationId: request.destinationId });
    setRequestOpen(true);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
        <div>
          <p className="text-carbon-500 text-sm">Available balance</p>
          <p className="font-bricolage text-carbon-900 mt-1 text-3xl font-medium tracking-[-0.02em]">{formatRwf(balance)}</p>
          <p className="text-carbon-400 mt-1 text-xs">Collected rent not yet paid out.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRetryPrefill(null);
            setRequestOpen(true);
          }}
          disabled={balance <= 0}
          className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Request Payout
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </button>
      </section>

      <PayoutDestinationsPanel professionalId={professionalId} destinations={destinations} onChange={forceUpdate} />

      <section>
        <h2 className="font-bricolage text-carbon-900 mb-3 text-xl font-medium">Payout history</h2>
        <PayoutRequestsTable
          requests={requests}
          destinations={destinations}
          onAddDestination={() => setAddDestinationOpen(true)}
          onRetry={retryRequest}
        />
      </section>

      {requestOpen ? (
        <RequestPayoutModal
          professionalId={professionalId}
          balance={balance}
          destinations={destinations}
          initialAmountValue={retryPrefill?.amountValue}
          initialDestinationId={retryPrefill?.destinationId}
          onClose={() => setRequestOpen(false)}
          onRequested={() => {
            setRequestOpen(false);
            forceUpdate();
          }}
        />
      ) : null}

      {addDestinationOpen ? (
        <AddPayoutDestinationModal
          professionalId={professionalId}
          onClose={() => setAddDestinationOpen(false)}
          onSaved={() => {
            setAddDestinationOpen(false);
            forceUpdate();
          }}
        />
      ) : null}
    </div>
  );
}
