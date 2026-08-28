"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  LOCAL_BANKS,
  addDestination,
  isValidCardNumber,
  isValidExpiry,
  isValidIbanOrAccountNumber,
  isValidLocalAccountNumber,
  isValidPhoneNumber,
  isValidSwiftBic,
  type NewPayoutDestination,
  type PayoutDestinationType,
} from "@/lib/payouts";

const TYPE_OPTIONS: { value: PayoutDestinationType; label: string }[] = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "local_bank", label: "Local Bank Account" },
  { value: "swift", label: "Domiciliary Bank / SWIFT" },
  { value: "card", label: "Visa Card" },
];

type Fields = Record<string, string>;

/**
 * "+ Add New Destination" (product spec §1): one modal, four very
 * different field sets swapped in by `type`. All four shapes are kept in a
 * single flat `Fields` bag rather than four parallel `useState` calls --
 * simplest way to reset cleanly when the partner switches type mid-form.
 * Validated on submit attempt (`validate`), not disabled preemptively --
 * with this many required fields a permanently-disabled Save button before
 * the partner has typed anything reads as broken, not helpful.
 */
export function AddPayoutDestinationModal({
  professionalId,
  onClose,
  onSaved,
}: {
  professionalId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<PayoutDestinationType>("mobile_money");
  const [fields, setFields] = useState<Fields>({ network: "MTN" });
  const [touched, setTouched] = useState(false);

  function set(name: string, value: string) {
    setFields((f) => ({ ...f, [name]: value }));
  }

  function chooseType(next: PayoutDestinationType) {
    setType(next);
    setFields(next === "mobile_money" ? { network: "MTN" } : {});
    setTouched(false);
  }

  function handleSave() {
    const errors = validate(type, fields);
    if (Object.keys(errors).length > 0) {
      setTouched(true);
      return;
    }
    addDestination(professionalId, buildDestination(type, fields));
    onSaved();
  }

  const errors = touched ? validate(type, fields) : {};

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-destination-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <h2 id="add-destination-title" className="font-bricolage text-xl font-medium">
          Add payout destination
        </h2>
        <p className="text-carbon-600 mt-2 text-sm leading-6">Choose a destination type, then fill in its details.</p>

        <div className="mt-5">
          <span className="text-carbon-900 mb-2 block text-sm font-medium">Destination type</span>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => chooseType(option.value)}
                aria-pressed={type === option.value}
                className={`h-11 rounded-xl px-3 text-left text-sm font-medium transition-colors ${
                  type === option.value ? "bg-black text-white" : "bg-black/[0.035] hover:bg-black/[0.06]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4">{renderFields(type, fields, set, errors)}</div>

        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-bricolage inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-black/80"
          >
            Save Destination
          </button>
        </div>
      </div>
    </div>
  );
}

function validate(type: PayoutDestinationType, f: Fields): Record<string, string> {
  const errors: Record<string, string> = {};
  const require = (key: string, label: string) => {
    if (!f[key]?.trim()) errors[key] = `${label} is required.`;
  };

  if (type === "mobile_money") {
    require("network", "Network provider");
    require("phoneNumber", "Phone number");
    if (f.phoneNumber && !isValidPhoneNumber(f.phoneNumber)) errors.phoneNumber = "Enter a valid phone number.";
  } else if (type === "local_bank") {
    require("bankName", "Bank");
    require("accountName", "Account name");
    require("accountNumber", "Account number");
    if (f.accountNumber && !isValidLocalAccountNumber(f.accountNumber)) errors.accountNumber = "Account number must be 6-20 digits.";
  } else if (type === "swift") {
    require("bankName", "Bank name");
    require("branchAddress", "Branch address");
    require("beneficiaryAccountName", "Beneficiary account name");
    require("accountNumberOrIban", "Account number / IBAN");
    if (f.accountNumberOrIban && !isValidIbanOrAccountNumber(f.accountNumberOrIban)) errors.accountNumberOrIban = "Enter a valid account number or IBAN.";
    require("swiftBic", "SWIFT/BIC code");
    if (f.swiftBic && !isValidSwiftBic(f.swiftBic)) errors.swiftBic = "Enter a valid 8 or 11-character SWIFT/BIC code.";
  } else {
    require("cardholderName", "Cardholder name");
    require("cardNumber", "Card number");
    if (f.cardNumber && !isValidCardNumber(f.cardNumber)) errors.cardNumber = "Enter a valid 16-digit card number.";
    require("expiryMonth", "Expiration month");
    require("expiryYear", "Expiration year");
    if (f.expiryMonth && f.expiryYear && !isValidExpiry(f.expiryMonth, f.expiryYear)) errors.expiryMonth = "Enter a valid, non-expired MM/YY date.";
    require("billingAddress", "Billing address");
  }
  return errors;
}

function buildDestination(type: PayoutDestinationType, f: Fields): NewPayoutDestination {
  if (type === "mobile_money") {
    const network = f.network === "Airtel" ? "Airtel" : "MTN";
    return { type, network, phoneNumber: f.phoneNumber, label: `${network} •••• ${lastDigits(f.phoneNumber, 4)}` };
  }
  if (type === "local_bank") {
    return {
      type,
      bankName: f.bankName,
      accountNumber: f.accountNumber,
      accountName: f.accountName,
      label: `${f.bankName} •••${lastDigits(f.accountNumber, 4)}`,
    };
  }
  if (type === "swift") {
    return {
      type,
      bankName: f.bankName,
      branchAddress: f.branchAddress,
      beneficiaryAccountName: f.beneficiaryAccountName,
      accountNumberOrIban: f.accountNumberOrIban,
      swiftBic: f.swiftBic.toUpperCase(),
      intermediaryBankName: f.intermediaryBankName?.trim() || undefined,
      intermediarySwiftBic: f.intermediarySwiftBic?.trim().toUpperCase() || undefined,
      label: `${f.bankName} · SWIFT ${f.swiftBic.toUpperCase()}`,
    };
  }
  // Card -- only the brand and last 4 are ever kept; see payouts.ts's doc
  // comment on why the full PAN is validated here and then thrown away.
  const digits = f.cardNumber.replace(/\s/g, "");
  return {
    type,
    cardholderName: f.cardholderName,
    cardLast4: digits.slice(-4),
    expiryMonth: f.expiryMonth,
    expiryYear: f.expiryYear,
    billingAddress: f.billingAddress,
    label: `Visa •••• ${digits.slice(-4)}`,
  };
}

function lastDigits(value: string, count: number): string {
  return value.replace(/\D/g, "").slice(-count);
}

function formatCardNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return (digits.match(/.{1,4}/g) ?? []).join(" ");
}

function renderFields(type: PayoutDestinationType, f: Fields, set: (name: string, value: string) => void, errors: Record<string, string>) {
  if (type === "mobile_money") {
    return (
      <>
        <SelectField label="Network provider" value={f.network ?? "MTN"} onChange={(v) => set("network", v)} options={["MTN", "Airtel"]} error={errors.network} />
        <TextField label="Phone number" value={f.phoneNumber} onChange={(v) => set("phoneNumber", v)} placeholder="078X XXX XXX" inputMode="tel" error={errors.phoneNumber} />
      </>
    );
  }
  if (type === "local_bank") {
    return (
      <>
        <SelectField label="Bank" value={f.bankName} onChange={(v) => set("bankName", v)} options={[...LOCAL_BANKS]} error={errors.bankName} />
        <TextField label="Account number" value={f.accountNumber} onChange={(v) => set("accountNumber", v.replace(/[^\d\s]/g, ""))} inputMode="numeric" error={errors.accountNumber} />
        <TextField label="Account name" value={f.accountName} onChange={(v) => set("accountName", v)} error={errors.accountName} />
      </>
    );
  }
  if (type === "swift") {
    return (
      <>
        <TextField label="Bank name" value={f.bankName} onChange={(v) => set("bankName", v)} error={errors.bankName} />
        <TextField label="Branch address" value={f.branchAddress} onChange={(v) => set("branchAddress", v)} error={errors.branchAddress} />
        <TextField label="Beneficiary account name" value={f.beneficiaryAccountName} onChange={(v) => set("beneficiaryAccountName", v)} error={errors.beneficiaryAccountName} />
        <TextField label="Account number / IBAN" value={f.accountNumberOrIban} onChange={(v) => set("accountNumberOrIban", v)} error={errors.accountNumberOrIban} />
        <TextField label="SWIFT / BIC code" value={f.swiftBic} onChange={(v) => set("swiftBic", v.toUpperCase())} placeholder="e.g. BKIGRWRW" error={errors.swiftBic} />
        <div className="rounded-xl bg-black/[0.02] p-3.5">
          <p className="text-carbon-500 text-xs font-medium tracking-wider uppercase">Intermediary bank (optional)</p>
          <div className="mt-3 space-y-3">
            <TextField label="Intermediary bank name" value={f.intermediaryBankName} onChange={(v) => set("intermediaryBankName", v)} />
            <TextField label="Intermediary SWIFT / BIC" value={f.intermediarySwiftBic} onChange={(v) => set("intermediarySwiftBic", v.toUpperCase())} />
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <TextField label="Cardholder name" value={f.cardholderName} onChange={(v) => set("cardholderName", v)} error={errors.cardholderName} />
      <TextField label="Card number" value={f.cardNumber} onChange={(v) => set("cardNumber", formatCardNumberInput(v))} placeholder="XXXX XXXX XXXX XXXX" inputMode="numeric" error={errors.cardNumber} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Expiration month (MM)" value={f.expiryMonth} onChange={(v) => set("expiryMonth", v.replace(/\D/g, "").slice(0, 2))} placeholder="MM" inputMode="numeric" error={errors.expiryMonth} />
        <TextField label="Expiration year (YY)" value={f.expiryYear} onChange={(v) => set("expiryYear", v.replace(/\D/g, "").slice(0, 2))} placeholder="YY" inputMode="numeric" />
      </div>
      <TextField label="Billing address" value={f.billingAddress} onChange={(v) => set("billingAddress", v)} error={errors.billingAddress} />
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  inputMode?: "text" | "tel" | "numeric";
}) {
  return (
    <label className="block">
      <span className="text-carbon-900 mb-2 block text-sm font-medium">{label}</span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={`h-12 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none transition-colors focus:bg-black/[0.055] ${error ? "ring-1 ring-red-400" : ""}`}
      />
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle aria-hidden="true" className="size-3 shrink-0" />
          {error}
        </p>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-carbon-900 mb-2 block text-sm font-medium">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 w-full appearance-none rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none transition-colors focus:bg-black/[0.055] ${error ? "ring-1 ring-red-400" : ""}`}
      >
        <option value="" disabled>
          Select...
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
