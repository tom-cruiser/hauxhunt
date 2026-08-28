"use client";

import { useState } from "react";
import { Building2, CreditCard, Globe2, Plus, Smartphone, Trash2, type LucideIcon } from "lucide-react";

import { DESTINATION_TYPE_LABEL, removeDestination, type PayoutDestination, type PayoutDestinationType } from "@/lib/payouts";
import { AddPayoutDestinationModal } from "@/components/partner/add-payout-destination-modal";
import { StatusReasonModal } from "@/components/partner/status-reason-modal";

const TYPE_ICON: Record<PayoutDestinationType, LucideIcon> = {
  mobile_money: Smartphone,
  local_bank: Building2,
  swift: Globe2,
  card: CreditCard,
};

function destinationDetail(destination: PayoutDestination): string {
  switch (destination.type) {
    case "mobile_money":
      return `${destination.network} · ${destination.phoneNumber}`;
    case "local_bank":
      return `${destination.bankName} · ${destination.accountName}`;
    case "swift":
      return `${destination.bankName} · SWIFT ${destination.swiftBic}`;
    case "card":
      return `${destination.cardholderName} · expires ${destination.expiryMonth}/${destination.expiryYear}`;
  }
}

/**
 * The saved-destinations dashboard (product spec §1): a badge/icon per
 * destination type, and the "+ Add New Destination" entry point. Owns its
 * own add/remove modal state; the parent only needs `onChange` to
 * re-render wherever else reads destinations (e.g. the payout request
 * modal's destination selector).
 */
export function PayoutDestinationsPanel({
  professionalId,
  destinations,
  onChange,
}: {
  professionalId: string;
  destinations: PayoutDestination[];
  onChange: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<PayoutDestination | null>(null);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 p-5 sm:p-6">
        <div>
          <h2 className="font-bricolage text-carbon-900 text-xl font-medium">Payout destinations</h2>
          <p className="text-carbon-500 mt-1 text-sm">Where your rent payouts can be sent.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="font-bricolage inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black px-4 text-sm font-medium text-white hover:bg-black/80"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add New Destination
        </button>
      </div>

      {destinations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <p className="text-carbon-500 text-sm">No payout destinations yet. Add one to request a payout.</p>
        </div>
      ) : (
        <ul className="divide-y divide-black/8">
          {destinations.map((destination) => {
            const Icon = TYPE_ICON[destination.type];
            return (
              <li key={destination.id} className="flex items-center justify-between gap-4 p-5 sm:p-6">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{destination.label}</p>
                      <span className="rounded-full bg-black/6 px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap">{DESTINATION_TYPE_LABEL[destination.type]}</span>
                    </div>
                    <p className="text-carbon-500 mt-1 truncate text-xs">{destinationDetail(destination)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(destination)}
                  aria-label={`Remove ${destination.label}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {addOpen ? (
        <AddPayoutDestinationModal
          professionalId={professionalId}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            onChange();
          }}
        />
      ) : null}

      {confirmingRemove ? (
        <StatusReasonModal
          title={`Remove ${confirmingRemove.label}?`}
          description="You won't be able to send payouts to this destination until you add it again."
          confirmLabel="Remove"
          reasonRequired={false}
          onCancel={() => setConfirmingRemove(null)}
          onConfirm={() => {
            removeDestination(professionalId, confirmingRemove.id);
            setConfirmingRemove(null);
            onChange();
          }}
        />
      ) : null}
    </section>
  );
}
