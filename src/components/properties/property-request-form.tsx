"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

export function PropertyRequestForm({
  onSubmitted,
}: {
  onSubmitted?: (data: Record<string, string>) => void;
}) {
  const [propertyType, setPropertyType] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    const fd = new FormData(event.currentTarget);
    const data = Object.fromEntries(
      [...fd.entries()].map(([k, v]) => [k, String(v)]),
    );
    onSubmitted?.(data);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.08)]"
    >
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-black p-7 text-white sm:p-10 lg:p-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:18px_18px] opacity-20"
          />
          <div className="relative z-10 flex h-full flex-col">
            <h2 className="font-bricolage text-3xl leading-tight font-medium tracking-[-0.035em]">
              Tell us what would feel like home.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              Be specific about the place, price, and property you need. Clear
              requests help property partners respond with relevant options.
            </p>

            <ol className="mt-10 space-y-5 text-sm text-white/75 lg:mt-auto">
              {[
                "Your request is shared only with verified partners.",
                "You decide which property representative to contact.",
                "Never pay before viewing and confirming the property.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
            <SelectField
              label="I want to"
              name="purpose"
              placeholder="Choose your rental need"
              options={["Rent a house"]}
              required
            />
            <SelectField
              label="Country"
              name="country"
              placeholder="Choose country"
              options={["Rwanda", "Nigeria", "Kenya"]}
              required
            />
            <Field
              label="City or district"
              name="city"
              placeholder="Kigali, Lagos, Abuja…"
              required
            />
            <Field
              label="Preferred neighbourhood"
              name="neighbourhood"
              placeholder="Optional"
            />
            <div>
              <SelectField
                label="Property type"
                name="propertyType"
                placeholder="Any property type"
                options={[
                  "House",
                  "Apartment",
                  "Duplex",
                  "Single room",
                  "Penthouse",
                  "Shared apartment",
                  "Studio apartment",
                  "Mansion",
                  "Villa",
                  "Hotel",
                  "Other",
                ]}
                value={propertyType}
                onChange={setPropertyType}
                required
              />
              {propertyType === "Other" ? (
                <div className="mt-4">
                  <Field
                    label="Specify property type"
                    name="otherPropertyType"
                    placeholder="Enter the property type you need"
                    required
                  />
                </div>
              ) : null}
            </div>
            <SelectField
              label="Bedrooms"
              name="bedrooms"
              placeholder="Choose bedrooms"
              options={["1", "2", "3", "4", "5+"]}
              required
            />
            <Field
              label="Minimum budget (USD)"
              name="minimumBudget"
              type="number"
              min="0"
              placeholder="500"
              required
            />
            <Field
              label="Maximum budget (USD)"
              name="maximumBudget"
              type="number"
              min="1"
              placeholder="1,000"
              required
            />
            <Field
              label="Move-in date"
              name="moveInDate"
              type="date"
              icon={CalendarDays}
              required
            />
            <SelectField
              label="Furnishing"
              name="furnishing"
              placeholder="Any furnishing"
              options={["Furnished", "Unfurnished", "Partly furnished"]}
            />

            <div className="border-black/10 pt-2 sm:col-span-2 sm:border-t sm:pt-7">
              <h3 className="font-bricolage text-carbon-900 text-xl font-medium">
                Contact information
              </h3>
              <p className="text-carbon-500 mt-1 text-sm">
                Verified property partners will use these details to reach you.
              </p>
            </div>

            <Field
              label="Full name"
              name="fullName"
              icon={UserRound}
              required
            />
            <Field
              label="Phone number"
              name="phone"
              type="tel"
              icon={Phone}
              required
            />
            <Field
              label="Email address"
              name="email"
              type="email"
              icon={Mail}
              className="sm:col-span-2"
              required
            />

            <label className="sm:col-span-2">
              <span className="text-carbon-900 mb-2 block text-sm font-medium">
                Anything else we should know?
              </span>
              <textarea
                name="notes"
                rows={4}
                placeholder="Parking, pets, accessibility, security, or other important preferences…"
                className="contact-field-control w-full resize-y rounded-xl border border-black/20 px-4 py-3 transition-colors outline-none focus:border-black"
              />
            </label>
          </div>

          <label className="mt-7 flex items-start gap-3 rounded-xl bg-black/[0.035] p-4 text-sm leading-6">
            <input
              type="checkbox"
              required
              name="consent"
              className="mt-1 size-4 accent-black"
            />
            <span>
              I agree that verified RentUp property partners may contact me
              about houses matching this request.
            </span>
          </label>

          <button
            type="submit"
            className="font-bricolage mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-7 font-medium text-white transition-colors hover:bg-black/80 sm:w-auto"
          >
            Submit property request
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string;
  required?: boolean;
  className?: string;
  icon?: typeof UserRound;
};

function Field({
  label,
  name,
  type = "text",
  placeholder,
  min,
  required,
  className,
  icon: Icon,
}: FieldProps) {
  return (
    <label className={className}>
      <span className="text-carbon-900 mb-2 block text-sm font-medium">
        {label}
      </span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-black/20 px-4 transition-colors focus-within:border-black">
        {Icon && <Icon aria-hidden="true" className="text-carbon-500 size-4" />}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          min={min}
          required={required}
          className="contact-field-control min-w-0 flex-1 bg-transparent outline-none"
        />
      </span>
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  options: string[];
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

function SelectField({
  label,
  name,
  placeholder,
  options,
  required,
  value,
  onChange,
}: SelectFieldProps) {
  return (
    <label>
      <span className="text-carbon-900 mb-2 block text-sm font-medium">
        {label}
      </span>
      <span className="relative block">
        <select
          name={name}
          required={required}
          value={value}
          defaultValue={value === undefined ? "" : undefined}
          onChange={(event) => onChange?.(event.target.value)}
          className="contact-field-control h-12 w-full appearance-none rounded-xl border border-black/20 bg-white pr-11 pl-4 transition-colors outline-none focus:border-black"
        >
          <option value="" disabled={required}>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
        />
      </span>
    </label>
  );
}
