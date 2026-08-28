"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { formatRwf } from "@/lib/owner-data";
import { DESTINATION_TYPE_LABEL, generateDemoOtp, quoteFee, requestPayout, type PayoutDestination } from "@/lib/payouts";

type Step = "amount" | "otp";

/**
 * The withdrawal flow (product spec §2): available balance up front, a
 * destination picked from the partner's saved list, a transparent fee
 * breakdown computed live as the amount changes, and a one-time-code
 * confirmation step before anything is actually requested. There's no
 * SMS/email gateway in this app (see `payouts.ts`'s doc comment), so the
 * code is generated and shown directly here rather than pretending it was
 * "sent" somewhere the partner can't see -- same honesty rule as
 * `PlanToggleCard`'s "This is a demo toggle" copy elsewhere in this app.
 */
export function RequestPayoutModal({
  professionalId,
  balance,
  destinations,
  initialAmountValue,
  initialDestinationId,
  onClose,
  onRequested,
}: {
  professionalId: string;
  balance: number;
  destinations: PayoutDestination[];
  /** Prefills the form -- used by the Payouts table's "Retry Payout" action
   * on a Failed request, so the partner doesn't retype the same amount. */
  initialAmountValue?: number;
  initialDestinationId?: string;
  onClose: () => void;
  onRequested: () => void;
}) {
  const [step, setStep] = useState<Step>("amount");
  const [destinationId, setDestinationId] = useState(
    (initialDestinationId && destinations.some((d) => d.id === initialDestinationId) ? initialDestinationId : destinations[0]?.id) ?? "",
  );
  const [amountInput, setAmountInput] = useState(initialAmountValue ? String(initialAmountValue) : "");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const destination = destinations.find((d) => d.id === destinationId);
  const amountValue = Number(amountInput.replace(/[^\d]/g, "")) || 0;
  const quote = destination ? quoteFee(destination.type, amountValue) : null;

  function handleContinue() {
    if (!destination) {
      setAmountError("Add a payout destination first.");
      return;
    }
    if (amountValue <= 0) {
      setAmountError("Enter an amount greater than zero.");
      return;
    }
    if (amountValue > balance) {
      setAmountError("This amount is more than your available balance.");
      return;
    }
    setAmountError(null);
    setOtp(generateDemoOtp());
    setStep("otp");
  }

  function handleConfirm() {
    if (otpInput.trim() !== otp) {
      setOtpError("That code doesn't match. Check the code above and try again.");
      return;
    }
    const result = requestPayout(professionalId, destinationId, amountValue);
    if ("error" in result) {
      setOtpError(result.error);
      return;
    }
    onRequested();
  }

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-payout-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        {step === "amount" ? (
          <>
            <h2 id="request-payout-title" className="font-bricolage text-xl font-medium">
              Request a payout
            </h2>
            <div className="mt-4 rounded-2xl bg-black/[0.035] p-4">
              <p className="text-carbon-500 text-xs">Available balance</p>
              <p className="font-bricolage mt-1 text-2xl font-medium tracking-[-0.02em]">{formatRwf(balance)}</p>
            </div>

            <label className="mt-5 block">
              <span className="text-carbon-900 mb-2 block text-sm font-medium">Send to</span>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none transition-colors focus:bg-black/[0.055]"
                disabled={destinations.length === 0}
              >
                {destinations.length === 0 ? (
                  <option>No destinations saved yet</option>
                ) : (
                  destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} · {DESTINATION_TYPE_LABEL[d.type]}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="mt-5 block">
              <span className="text-carbon-900 mb-2 block text-sm font-medium">Amount (RWF)</span>
              <input
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="h-12 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none transition-colors focus:bg-black/[0.055]"
              />
            </label>

            {quote && amountValue > 0 ? (
              <dl className="mt-4 space-y-2 rounded-xl border border-black/10 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-carbon-500">Payout amount</dt>
                  <dd className="font-medium">{formatRwf(amountValue)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-carbon-500">{quote.label}</dt>
                  <dd className="font-medium">-{quote.fee}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-2">
                  <dt className="font-medium">You&apos;ll receive</dt>
                  <dd className="font-bricolage font-medium">{quote.net}</dd>
                </div>
              </dl>
            ) : null}

            {amountError ? <p className="mt-3 text-xs text-red-600">{amountError}</p> : null}

            <div className="mt-7 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="font-bricolage inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={destinations.length === 0}
                className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-full bg-black text-white">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <h2 id="request-payout-title" className="font-bricolage mt-4 text-xl font-medium">
              Confirm this payout
            </h2>
            <p className="text-carbon-600 mt-2 text-sm leading-6">
              For your security, enter the verification code below to authorize sending {quote ? quote.net : formatRwf(amountValue)} to {destination?.label}.
            </p>
            <div className="mt-4 rounded-2xl bg-black/[0.035] p-4 text-center">
              <p className="text-carbon-500 text-xs">Demo verification code (no SMS gateway is connected)</p>
              <p className="font-bricolage mt-1 text-2xl font-medium tracking-[0.2em]">{otp}</p>
            </div>
            <label className="mt-5 block">
              <span className="text-carbon-900 mb-2 block text-sm font-medium">Enter verification code</span>
              <input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="6-digit code"
                autoFocus
                className="h-12 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-center text-lg tracking-[0.3em] outline-none transition-colors focus:bg-black/[0.055]"
              />
            </label>
            {otpError ? <p className="mt-3 text-xs text-red-600">{otpError}</p> : null}
            <div className="mt-7 flex justify-end gap-2">
              <button type="button" onClick={() => setStep("amount")} className="font-bricolage inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black">
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={otpInput.length !== 6}
                className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm Payout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
