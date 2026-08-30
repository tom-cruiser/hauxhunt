"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

/**
 * A real international phone number input -- a searchable country selector
 * (flag, name, dial code) instead of the 3-country `<select>` (RW/KE/NG)
 * used on the partner side (`partner-details-fields.tsx`,
 * `partner-verification-form.tsx`). Deliberately dependency-free: this app
 * has no phone-number library installed and no other heavy UI dependency
 * beyond Tailwind/shadcn/Framer Motion/Lucide, so this stays consistent
 * with that rather than adding one just for this. Flag emoji are derived
 * from the ISO 3166-1 alpha-2 code at render time (`flagEmoji`) instead of
 * being hand-listed per country, so `PHONE_COUNTRIES` only has to carry the
 * three facts that actually vary: code, name, dial code.
 *
 * This component only owns country SELECTION and the national-number text
 * field -- it has no opinion on OTP/verification flow, so callers (e.g.
 * the renter Account page) keep driving that themselves via
 * `onDialCodeChange`/`onNationalNumberChange`, exactly as they already
 * drive their existing `countryCode`/`phoneDraft` state.
 */

export type PhoneCountry = { iso2: string; name: string; dialCode: string };

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// HauxHunt's three launch markets (README: "Rwanda, Nigeria, and Kenya")
// pinned first, then a broad international set spanning Africa, Europe,
// the Americas, Asia, the Middle East, and Oceania -- enough for this to
// genuinely read as "international," not an exhaustive ISO-3166 list.
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso2: "RW", name: "Rwanda", dialCode: "+250" },
  { iso2: "NG", name: "Nigeria", dialCode: "+234" },
  { iso2: "KE", name: "Kenya", dialCode: "+254" },
  { iso2: "UG", name: "Uganda", dialCode: "+256" },
  { iso2: "TZ", name: "Tanzania", dialCode: "+255" },
  { iso2: "BI", name: "Burundi", dialCode: "+257" },
  { iso2: "CD", name: "DR Congo", dialCode: "+243" },
  { iso2: "ZA", name: "South Africa", dialCode: "+27" },
  { iso2: "GH", name: "Ghana", dialCode: "+233" },
  { iso2: "ET", name: "Ethiopia", dialCode: "+251" },
  { iso2: "EG", name: "Egypt", dialCode: "+20" },
  { iso2: "MA", name: "Morocco", dialCode: "+212" },
  { iso2: "DZ", name: "Algeria", dialCode: "+213" },
  { iso2: "TN", name: "Tunisia", dialCode: "+216" },
  { iso2: "SN", name: "Senegal", dialCode: "+221" },
  { iso2: "CI", name: "Côte d'Ivoire", dialCode: "+225" },
  { iso2: "CM", name: "Cameroon", dialCode: "+237" },
  { iso2: "ZM", name: "Zambia", dialCode: "+260" },
  { iso2: "ZW", name: "Zimbabwe", dialCode: "+263" },
  { iso2: "MW", name: "Malawi", dialCode: "+265" },
  { iso2: "MZ", name: "Mozambique", dialCode: "+258" },
  { iso2: "BW", name: "Botswana", dialCode: "+267" },
  { iso2: "NA", name: "Namibia", dialCode: "+264" },
  { iso2: "SS", name: "South Sudan", dialCode: "+211" },
  { iso2: "SO", name: "Somalia", dialCode: "+252" },
  { iso2: "US", name: "United States", dialCode: "+1" },
  { iso2: "CA", name: "Canada", dialCode: "+1" },
  { iso2: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso2: "IE", name: "Ireland", dialCode: "+353" },
  { iso2: "FR", name: "France", dialCode: "+33" },
  { iso2: "DE", name: "Germany", dialCode: "+49" },
  { iso2: "NL", name: "Netherlands", dialCode: "+31" },
  { iso2: "BE", name: "Belgium", dialCode: "+32" },
  { iso2: "ES", name: "Spain", dialCode: "+34" },
  { iso2: "PT", name: "Portugal", dialCode: "+351" },
  { iso2: "IT", name: "Italy", dialCode: "+39" },
  { iso2: "CH", name: "Switzerland", dialCode: "+41" },
  { iso2: "SE", name: "Sweden", dialCode: "+46" },
  { iso2: "NO", name: "Norway", dialCode: "+47" },
  { iso2: "DK", name: "Denmark", dialCode: "+45" },
  { iso2: "TR", name: "Türkiye", dialCode: "+90" },
  { iso2: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { iso2: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { iso2: "QA", name: "Qatar", dialCode: "+974" },
  { iso2: "IN", name: "India", dialCode: "+91" },
  { iso2: "PK", name: "Pakistan", dialCode: "+92" },
  { iso2: "BD", name: "Bangladesh", dialCode: "+880" },
  { iso2: "CN", name: "China", dialCode: "+86" },
  { iso2: "JP", name: "Japan", dialCode: "+81" },
  { iso2: "KR", name: "South Korea", dialCode: "+82" },
  { iso2: "PH", name: "Philippines", dialCode: "+63" },
  { iso2: "ID", name: "Indonesia", dialCode: "+62" },
  { iso2: "MY", name: "Malaysia", dialCode: "+60" },
  { iso2: "SG", name: "Singapore", dialCode: "+65" },
  { iso2: "AU", name: "Australia", dialCode: "+61" },
  { iso2: "NZ", name: "New Zealand", dialCode: "+64" },
  { iso2: "BR", name: "Brazil", dialCode: "+55" },
  { iso2: "MX", name: "Mexico", dialCode: "+52" },
  { iso2: "AR", name: "Argentina", dialCode: "+54" },
];

const DEFAULT_PLACEHOLDER: Record<string, string> = {
  "+250": "7XX XXX XXX",
  "+254": "7XX XXX XXX",
  "+234": "8XX XXX XXXX",
  "+256": "7XX XXX XXX",
  "+255": "7XX XXX XXX",
  "+27": "XX XXX XXXX",
  "+1": "XXX XXX XXXX",
  "+44": "7XXX XXXXXX",
  "+91": "XXXXX XXXXX",
};

export type InternationalPhoneInputProps = {
  /** id of the underlying national-number `<input>`, so an external
   * `<label htmlFor>` keeps working. */
  id?: string;
  dialCode: string;
  nationalNumber: string;
  onDialCodeChange: (dialCode: string) => void;
  onNationalNumberChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
};

export function InternationalPhoneInput({
  id,
  dialCode,
  nationalNumber,
  onDialCodeChange,
  onNationalNumberChange,
  placeholder,
  "aria-label": ariaLabel,
}: InternationalPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const selected = PHONE_COUNTRIES.find((c) => c.dialCode === dialCode) ?? PHONE_COUNTRIES[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? PHONE_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(normalizedQuery) ||
          c.dialCode.includes(normalizedQuery.replace(/^\+/, "")) ||
          c.iso2.toLowerCase() === normalizedQuery,
      )
    : PHONE_COUNTRIES;

  return (
    <div ref={containerRef} className="relative flex h-11 items-center rounded-xl bg-black/[0.035] pr-1.5">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose country code"
        className="flex h-full shrink-0 items-center gap-1.5 rounded-l-xl border-r border-black/10 px-3 text-sm font-medium transition-colors hover:bg-black/[0.03]"
      >
        <span aria-hidden="true">{flagEmoji(selected.iso2)}</span>
        <span>{selected.dialCode}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 text-black/40" />
      </button>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        aria-label={ariaLabel ?? "Phone number"}
        value={nationalNumber}
        placeholder={placeholder ?? DEFAULT_PLACEHOLDER[dialCode] ?? "XXX XXX XXXX"}
        onChange={(event) => onNationalNumberChange(event.target.value.replace(/[^\d\s]/g, ""))}
        className="contact-field-control h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 text-sm font-normal shadow-none ring-0 outline-none"
      />

      {open ? (
        <div
          role="listbox"
          aria-label="Country codes"
          className="absolute top-full left-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.15)]"
        >
          <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2">
            <Search aria-hidden="true" className="size-4 shrink-0 text-black/35" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or code"
              aria-label="Search country or dial code"
              className="h-8 w-full border-0 bg-transparent text-sm outline-none placeholder:text-black/35"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="text-carbon-400 px-3 py-3 text-sm">No countries match &ldquo;{query}&rdquo;</li>
            ) : (
              filtered.map((country) => (
                <li key={country.iso2}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.dialCode === dialCode}
                    onClick={() => {
                      onDialCodeChange(country.dialCode);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.04] ${
                      country.dialCode === dialCode ? "bg-black/[0.04] font-medium" : ""
                    }`}
                  >
                    <span aria-hidden="true">{flagEmoji(country.iso2)}</span>
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    <span className="text-carbon-500 shrink-0">{country.dialCode}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
