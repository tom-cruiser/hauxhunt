"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

/**
 * The paid-tier "bank attachment" content for both Owner ("Bank attachment
 * for payments") and Agent/PM ("Bank attachment for viewing fees") — same
 * shape, different `SettingsCard` wrapper/copy at each call site
 * (`owner-account-content.tsx`, `partner-settings-content.tsx`), so the
 * read/edit form itself lives here once rather than twice.
 */
export type PayoutDetails = {
  bank: string;
  accountName: string;
  accountNumber: string;
};

export const DEFAULT_PAYOUT_DETAILS: PayoutDetails = {
  bank: "",
  accountName: "",
  accountNumber: "",
};

export function PayoutDetailsForm({
  details,
  onSave,
}: {
  details: PayoutDetails;
  onSave: (details: PayoutDetails) => void;
}) {
  const hasDetails = Boolean(details.bank && details.accountNumber);
  const [editing, setEditing] = useState(!hasDetails);
  const [draft, setDraft] = useState(details);
  const [justSaved, setJustSaved] = useState(false);
  const canSave = Boolean(
    draft.bank.trim() && draft.accountName.trim() && draft.accountNumber.trim(),
  );

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableField
            label="Bank"
            value={draft.bank}
            onChange={(v) => setDraft((d) => ({ ...d, bank: v }))}
            placeholder="e.g. Bank of Kigali"
          />
          <EditableField
            label="Account name"
            value={draft.accountName}
            onChange={(v) => setDraft((d) => ({ ...d, accountName: v }))}
          />
          <EditableField
            label="Account number"
            value={draft.accountNumber}
            onChange={(v) => setDraft((d) => ({ ...d, accountNumber: v }))}
          />
        </div>
        <div className="flex justify-end gap-2">
          {hasDetails ? (
            <button
              type="button"
              onClick={() => {
                setDraft(details);
                setEditing(false);
              }}
              className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              onSave(draft);
              setEditing(false);
              setJustSaved(true);
              window.setTimeout(() => setJustSaved(false), 2400);
            }}
            className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <ReadRow label="Bank" value={details.bank} />
        <ReadRow label="Account name" value={details.accountName} />
        <ReadRow label="Account number" value={details.accountNumber} />
      </dl>
      <div className="mt-5 flex items-center justify-end gap-3">
        {justSaved ? (
          <p role="status" className="feedback-toast flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Saved
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setDraft(details);
            setEditing(true);
          }}
          className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-carbon-900 mb-2 block text-sm font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black"
      />
    </label>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  const hasValue = value.trim().length > 0;
  return (
    <div>
      <dt className="text-carbon-400 text-xs">{label}</dt>
      <dd className={`mt-1 text-sm font-medium ${hasValue ? "" : "text-carbon-400 font-normal italic"}`}>
        {hasValue ? value : "Not added"}
      </dd>
    </div>
  );
}
