"use client";

import { useState } from "react";

export type StatusReasonModalProps = {
  title: string;
  description: string;
  confirmLabel: string;
  /** Defaults to true -- every backward transition and every decline
   * requires a reason. Pass false only for a plain confirmation with no
   * reason field at all. */
  reasonRequired?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

/**
 * A generic "confirm this status change, and say why" modal -- the one the
 * product spec asks for on every backward (rollback) transition, and reused
 * for declining an application ("Not Selected"), which needs the same
 * confirmation + required reason even though it isn't a rollback. Built on
 * HauxHunt's existing hand-rolled dialog pattern (see `NotSelectDialog` in
 * owner-dashboard/applications/page.tsx and `PaymentDetail` in
 * owner-dashboard/payments/page.tsx) rather than introducing a new shared
 * `Dialog` primitive -- this app doesn't have one, and every modal in it is
 * this exact `fixed inset-0` + `role="dialog"` shape.
 */
export function StatusReasonModal({
  title,
  description,
  confirmLabel,
  reasonRequired = true,
  onCancel,
  onConfirm,
}: StatusReasonModalProps) {
  const [reason, setReason] = useState("");
  const canConfirm = !reasonRequired || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-reason-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <h2 id="status-reason-title" className="font-bricolage text-xl font-medium">
          {title}
        </h2>
        <p className="text-carbon-600 mt-3 text-sm leading-6">{description}</p>

        <label className="mt-5 block">
          <span className="text-carbon-500 text-xs font-medium tracking-wider uppercase">
            Reason {reasonRequired ? "(required)" : "(optional)"}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Explain why for the record -- this is saved to the application's status history."
            className="mt-2 w-full resize-none rounded-xl border border-black/15 p-3 text-sm placeholder:text-black/35 focus:border-black focus:outline-none"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="font-bricolage inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(reason.trim())}
            className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
