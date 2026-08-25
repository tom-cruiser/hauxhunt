"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronDown,
  ImagePlus,
  KeyRound,
  UserRound,
} from "lucide-react";

// Foundation Cleanup phase: this form is shared by the Owner's own "Add a
// property" flow (owner-dashboard/properties/new -- untouched, still calls
// it with no propertyId) and the professional's property-bound Create/Edit
// Listing flow (partner-dashboard/properties/[id]/listing/new). The new
// props below are all optional and additive -- when omitted, behavior is
// byte-for-byte what it always was (local-only "submitted"/"draftSaved" UI
// state, no persistence, redirect to /partner-dashboard/listings). When
// propertyId + onSaved are supplied, the caller owns persistence (via
// professional-properties.ts's saveListingForProperty) and navigation,
// because this component has no business knowing about the professional
// property model -- it stays a generic listing form either way.
type ListingFieldValues = {
  title: string;
  description: string;
  rent: string;
  availableFrom: string;
  amenities: string[];
};

const STEPS = [
  { label: "About you", icon: UserRound },
  { label: "Property", icon: Building2 },
  { label: "Pricing", icon: KeyRound },
  { label: "Photos", icon: ImagePlus },
  { label: "Review", icon: Check },
] as const;

const AMENITY_GROUPS = [
  {
    label: "Essentials & utilities",
    amenities: [
      "Wi-Fi",
      "Air conditioning",
      "Backup power",
      "Water tank",
      "Generator",
      "Solar power",
      "Borehole",
      "Hot water",
      "Fibre internet",
      "Satellite TV",
    ],
  },
  {
    label: "Security & safety",
    amenities: [
      "Security",
      "CCTV",
      "Gated compound",
      "Security guard",
      "Video intercom",
      "Fire alarms",
      "Fire extinguisher",
      "Sprinkler system",
      "Soundproofing",
    ],
  },
  {
    label: "Kitchen & appliances",
    amenities: [
      "Fitted kitchen",
      "Refrigerator",
      "Cooker",
      "Microwave",
      "Washing machine",
      "Dryer",
      "Dishwasher",
      "Outdoor kitchen",
    ],
  },
  {
    label: "Rooms & convenience",
    amenities: [
      "Lift",
      "Storage room",
      "Built-in wardrobes",
      "En-suite bedrooms",
      "Guest toilet",
      "Staff quarters",
      "Study room",
      "Reception",
      "Concierge",
    ],
  },
  {
    label: "Outdoor & lifestyle",
    amenities: [
      "Balcony",
      "Garden",
      "Swimming pool",
      "Gym",
      "Terrace",
      "Rooftop access",
      "Children's playground",
      "Clubhouse",
      "Beach access",
      "Pet friendly",
    ],
  },
  {
    label: "Access & transport",
    amenities: [
      "Parking",
      "Wheelchair access",
      "EV charging",
      "Bicycle storage",
    ],
  },
] as const;

export const PROPERTY_AMENITIES = AMENITY_GROUPS.flatMap(
  (group) => group.amenities,
);

export function ListPropertyForm({
  authenticatedPartner = false,
  propertyContext,
  initialValues,
  onSaved,
  onDone,
}: {
  authenticatedPartner?: boolean;
  // Rendered above the stepper so the professional always knows which
  // property they're advertising (Section 26) -- never present when this
  // form is creating a brand-new property (Owner's flow, or the legacy
  // unauthenticated public flow).
  propertyContext?: { title: string; location: string; badge: string };
  // Prefills known property facts (Section 27) so the professional never
  // re-types what HauxHunt already knows. Only the fields present are
  // prefilled; everything else (pricing, availability, photos) stays
  // listing-specific and blank.
  initialValues?: {
    title?: string;
    propertyType?: string;
    country?: string;
    city?: string;
    neighbourhood?: string;
    streetAddress?: string;
    bedrooms?: string;
    bathrooms?: string;
    area?: string;
    furnishing?: string;
    amenities?: string[];
  };
  onSaved?: (values: ListingFieldValues, status: "Draft" | "In Review") => void;
  // Replaces the post-submit screen's "List another property" reset action
  // -- for a property-bound listing, resetting the whole form to create a
  // second, unrelated one makes no sense; the caller decides where "done"
  // goes instead (Property Detail).
  onDone?: () => void;
}) {
  const router = useRouter();
  const firstStep = authenticatedPartner ? 1 : 0;
  const visibleSteps = STEPS.slice(firstStep);
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(firstStep);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>(initialValues?.amenities ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function nextStep() {
    const panel = formRef.current?.querySelector<HTMLElement>(
      `[data-step="${step}"]`,
    );
    const fields = Array.from(
      panel?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea") ?? [],
    );
    const invalid = fields.find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    setDraftSaved(false);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  // Reads what was actually typed -- the fields still use native
  // uncontrolled inputs (defaultValue-based prefill, validated via
  // checkValidity), so this is the one place values get collected, rather
  // than converting every field to controlled React state.
  function collectListingValues(): ListingFieldValues {
    const data = new FormData(formRef.current ?? undefined);
    const price = data.get("price");
    const period = data.get("paymentPeriod");
    const currency = data.get("currency");
    return {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      rent: price ? `${currency ?? "USD"} ${price}${period ? ` / ${String(period).toLowerCase().replace("per ", "")}` : ""}` : "",
      availableFrom: String(data.get("availableFrom") ?? ""),
      amenities,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    onSaved?.(collectListingValues(), "In Review");
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveDraft() {
    setDraftSaved(true);
    if (onSaved) {
      onSaved(collectListingValues(), "Draft");
      window.setTimeout(() => (onDone ? onDone() : router.push("/partner-dashboard/listings")), 900);
      return;
    }
    window.setTimeout(() => router.push("/partner-dashboard/listings"), 900);
  }

  if (submitted) {
    return (
      <div className="rounded-[2rem] border border-black/10 bg-white px-6 py-20 text-center shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:px-12">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-black text-white">
          <Check aria-hidden="true" className="size-7" />
        </span>
        <h2 className="font-bricolage text-carbon-900 mt-7 text-4xl font-medium tracking-[-0.04em]">
          {propertyContext ? "Your listing is under review" : "Your property is under review"}
        </h2>
        <p className="text-carbon-600 mx-auto mt-4 max-w-xl leading-7">
          Your listing has been submitted to the HauxHunt team and is now under
          review. We will notify you when it is approved or if any changes are
          needed.
        </p>
        <button
          type="button"
          onClick={() => {
            if (onDone) {
              onDone();
              return;
            }
            setSubmitted(false);
            setStep(firstStep);
            setPhotoNames([]);
            setAmenities([]);
            setDraftSaved(false);
            requestAnimationFrame(() => formRef.current?.reset());
          }}
          className="font-bricolage mt-8 h-12 rounded-full bg-black px-7 font-medium text-white transition-colors hover:bg-black/80"
        >
          {onDone ? "Back to Property" : "List another property"}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {propertyContext ? (
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-black/3 p-4">
          <span className="bg-black/4.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap">{propertyContext.badge}</span>
          <div className="min-w-0">
            <p className="truncate font-medium">{propertyContext.title}</p>
            <p className="text-carbon-500 truncate text-sm">{propertyContext.location}</p>
          </div>
        </div>
      ) : null}
      <ol
        aria-label="Listing progress"
        className="mb-6 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(0, 1fr))`,
        }}
      >
        {visibleSteps.map(({ label, icon: Icon }, index) => {
          const stepIndex = index + firstStep;
          const complete = stepIndex < step;
          const active = stepIndex === step;
          return (
            <li key={label} aria-current={active ? "step" : undefined}>
              <button
                type="button"
                onClick={() => stepIndex <= step && setStep(stepIndex)}
                disabled={stepIndex > step}
                className="group flex w-full flex-col items-center gap-2 text-center disabled:cursor-default"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-full border transition-colors ${
                    active || complete
                      ? "border-black bg-black text-white"
                      : "border-black/15 bg-white text-black/40"
                  }`}
                >
                  {complete ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Icon aria-hidden="true" className="size-4" />
                  )}
                </span>
                <span
                  className={`hidden text-xs sm:block ${active ? "font-medium text-black" : "text-black/45"}`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-10 lg:p-12">
        {!authenticatedPartner ? (
          <StepPanel step={0} currentStep={step} title="Tell us who is listing">
            <p className="text-carbon-600 -mt-4 mb-8 max-w-xl">
              We verify every representative before a property goes live.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" name="fullName" required />
              <SelectField
                label="I am a"
                name="representativeType"
                options={["Property manager", "Agent"]}
                required
              />
              <Field label="Email address" name="email" type="email" required />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field
                label="Agency name"
                name="agencyName"
                hint="Optional if you work independently"
                className="sm:col-span-2"
              />
            </div>
          </StepPanel>
        ) : null}

        <StepPanel
          step={1}
          currentStep={step}
          firstStep={firstStep}
          totalSteps={visibleSteps.length}
          title="Describe the property"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Listing title"
              name="title"
              placeholder="Modern 3-bedroom family home"
              className="sm:col-span-2"
              defaultValue={initialValues?.title}
              required
            />
            <PropertyTypeField defaultValue={initialValues?.propertyType} />
            <SelectField
              label="Country"
              name="country"
              options={["Rwanda", "Nigeria", "Kenya"]}
              defaultValue={initialValues?.country}
              required
            />
            <Field label="City" name="city" defaultValue={initialValues?.city} required />
            <Field label="Neighbourhood" name="neighbourhood" defaultValue={initialValues?.neighbourhood} required />
            <Field
              label="Exact street address"
              name="streetAddress"
              placeholder="Street, building or house number"
              className="sm:col-span-2"
              defaultValue={initialValues?.streetAddress}
              required
            />
            <Field
              label="Latitude"
              name="latitude"
              type="number"
              placeholder="For example, -1.9441"
              min="-90"
              max="90"
              step="any"
              required
            />
            <Field
              label="Longitude"
              name="longitude"
              type="number"
              placeholder="For example, 30.0619"
              min="-180"
              max="180"
              step="any"
              required
            />
            <p className="text-carbon-500 -mt-2 text-xs sm:col-span-2">
              Enter the map coordinates for the property entrance so viewing
              directions are accurate.
            </p>
            <Field
              label="Bedrooms"
              name="bedrooms"
              type="number"
              min="0"
              defaultValue={initialValues?.bedrooms}
              required
            />
            <Field
              label="Bathrooms"
              name="bathrooms"
              type="number"
              min="1"
              defaultValue={initialValues?.bathrooms}
              required
            />
            <Field label="Floor area (m²)" name="area" type="number" min="1" defaultValue={initialValues?.area} />
            <SelectField
              label="Furnishing"
              name="furnishing"
              options={["Furnished", "Unfurnished", "Partly furnished"]}
              defaultValue={initialValues?.furnishing}
              required
            />
            <div
              role="group"
              aria-labelledby="amenities-label"
              className="max-w-full min-w-0 overflow-hidden sm:col-span-2"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <span
                  id="amenities-label"
                  className="text-carbon-900 text-sm font-medium"
                >
                  Amenities
                </span>
                <span className="text-carbon-500 text-xs">
                  {amenities.length} selected
                </span>
              </div>
              <div className="grid w-full max-w-full min-w-0 touch-pan-x snap-x auto-cols-[210px] grid-flow-col grid-rows-3 gap-2 overflow-x-auto overscroll-x-contain pb-3 [contain:inline-size]">
                {PROPERTY_AMENITIES.map((amenity) => {
                  const selected = amenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setAmenities((current) =>
                          current.includes(amenity)
                            ? current.filter((item) => item !== amenity)
                            : [...current, amenity],
                        )
                      }
                      className={`flex min-h-12 cursor-pointer snap-start items-center gap-3 rounded-xl px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                        selected
                          ? "bg-black text-white"
                          : "bg-black/[0.035] text-black hover:bg-black/[0.07]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                          selected ? "bg-white text-black" : "bg-black/10"
                        }`}
                      >
                        {selected ? <Check className="size-3" /> : null}
                      </span>
                      {amenity}
                    </button>
                  );
                })}
              </div>
              {amenities.map((amenity) => (
                <input
                  key={amenity}
                  type="hidden"
                  name="amenities"
                  value={amenity}
                />
              ))}
              <p className="text-carbon-500 mt-2 text-xs leading-5">
                Only select amenities that are currently available and working.
                Scroll sideways to see all options.
                {amenities.length > 25 ? (
                  <strong className="ml-1 font-medium text-black">
                    You selected many amenities—please confirm each one is
                    accurate.
                  </strong>
                ) : null}
              </p>
            </div>
            <label className="sm:col-span-2">
              <span className="text-carbon-900 mb-2 block text-sm font-medium">
                Property description
              </span>
              <textarea
                name="description"
                rows={5}
                required
                placeholder="Describe the rooms, condition, surroundings, and what makes the property a good home."
                className="w-full resize-y rounded-xl border-0 bg-black/[0.035] px-4 py-3 ring-0 outline-none focus:bg-black/[0.055] focus:ring-0"
              />
            </label>
          </div>
        </StepPanel>

        <StepPanel
          step={2}
          currentStep={step}
          firstStep={firstStep}
          totalSteps={visibleSteps.length}
          title="Set pricing and availability"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Listing purpose"
              name="purpose"
              options={["For rent"]}
              required
            />
            <SelectField
              label="Currency"
              name="currency"
              options={["USD"]}
              required
            />
            <Field label="Price" name="price" type="number" min="1" required />
            <SelectField
              label="Payment period"
              name="paymentPeriod"
              options={["Per month", "Per year"]}
              required
            />
            <Field
              label="Available from"
              name="availableFrom"
              type="date"
              min={today}
              required
            />
            <Field
              label="Minimum stay (months)"
              name="minimumStay"
              type="number"
              min="1"
              hint="For rental properties"
            />
          </div>
        </StepPanel>

        <StepPanel
          step={3}
          currentStep={step}
          firstStep={firstStep}
          totalSteps={visibleSteps.length}
          title="Add property photos"
        >
          <p className="text-carbon-600 -mt-4 mb-7 max-w-xl">
            Add clear, recent photos of the exterior, living areas, bedrooms,
            bathrooms, and kitchen. You can select multiple images.
          </p>
          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/30 bg-black/[0.025] px-6 text-center transition-colors hover:border-black hover:bg-black/[0.045]">
            <ImagePlus aria-hidden="true" className="size-8" />
            <span className="font-bricolage mt-4 text-lg font-medium">
              Choose property photos
            </span>
            <span className="text-carbon-500 mt-1 text-sm">
              JPG, PNG or WebP · up to 10 images
            </span>
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required
              className="sr-only"
              onChange={(event) =>
                setPhotoNames(
                  Array.from(event.target.files ?? [])
                    .slice(0, 10)
                    .map((file) => file.name),
                )
              }
            />
          </label>
          {photoNames.length > 0 && (
            <div className="mt-5 rounded-xl border border-black/10 bg-black/[0.025] p-4">
              <p className="text-sm font-medium">
                {photoNames.length} photo{photoNames.length === 1 ? "" : "s"}{" "}
                selected
              </p>
              <ul className="text-carbon-600 mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {photoNames.map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </StepPanel>

        <StepPanel
          step={4}
          currentStep={step}
          firstStep={firstStep}
          totalSteps={visibleSteps.length}
          title="Review and submit"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Identity", "Your representative details will be reviewed."],
              ["Property", "Property information and pricing will be checked."],
              [
                "Location & amenities",
                `Exact coordinates and ${amenities.length} selected ${amenities.length === 1 ? "amenity" : "amenities"} are ready for review.`,
              ],
              ["Photos", `${photoNames.length} photos are ready for review.`],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-black/10 p-5"
              >
                <Check aria-hidden="true" className="size-5" />
                <h3 className="font-bricolage mt-5 text-lg font-medium">
                  {title}
                </h3>
                <p className="text-carbon-600 mt-2 text-sm leading-6">{body}</p>
              </div>
            ))}
          </div>
          <label className="mt-7 flex items-start gap-3 rounded-xl bg-black/[0.035] p-4 text-sm leading-6">
            <input
              type="checkbox"
              name="confirmation"
              required
              className="mt-1 size-4 accent-black"
            />
            <span>
              I confirm that the property information is accurate and that I am
              authorized to list this property on HauxHunt.
            </span>
          </label>
        </StepPanel>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/10 pt-6">
          <button
            type="button"
            onClick={() =>
              setStep((current) => Math.max(firstStep, current - 1))
            }
            disabled={step === firstStep}
            className="font-bricolage inline-flex h-12 items-center gap-2 rounded-full border border-black/20 px-6 font-medium transition-colors hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <div className="flex items-center gap-3">
              {authenticatedPartner ? (
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={draftSaved}
                  className="font-bricolage inline-flex h-12 items-center justify-center px-2 font-medium text-black/65 transition-colors hover:text-black disabled:cursor-default"
                >
                  {draftSaved ? "Draft saved" : "Save as draft"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={nextStep}
                className="font-bricolage inline-flex h-12 items-center gap-2 rounded-full bg-black px-7 font-medium text-white transition-colors hover:bg-black/80"
              >
                Continue
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="font-bricolage inline-flex h-12 items-center gap-2 rounded-full bg-black px-7 font-medium text-white transition-colors hover:bg-black/80"
            >
              Submit property
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

type StepPanelProps = {
  step: number;
  currentStep: number;
  firstStep?: number;
  totalSteps?: number;
  title: string;
  children: React.ReactNode;
};

function StepPanel({
  step,
  currentStep,
  firstStep = 0,
  totalSteps = 5,
  title,
  children,
}: StepPanelProps) {
  return (
    <section data-step={step} hidden={step !== currentStep}>
      <p className="text-carbon-500 mb-3 text-sm">
        Step {step - firstStep + 1} of {totalSteps}
      </p>
      <h2 className="font-bricolage text-carbon-900 mb-7 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  defaultValue?: string;
};

function Field({
  label,
  name,
  type = "text",
  placeholder,
  hint,
  className,
  required,
  min,
  max,
  step,
  defaultValue,
}: FieldProps) {
  return (
    <label className={className}>
      <span className="text-carbon-900 mb-2 block text-sm font-medium">
        {label}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-xl border-0 bg-black/[0.035] px-4 ring-0 transition-colors outline-none focus:bg-black/[0.055] focus:ring-0"
      />
      {hint && (
        <span className="text-carbon-500 mt-1.5 block text-xs">{hint}</span>
      )}
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
  defaultValue?: string;
};

function SelectField({ label, name, options, required, defaultValue }: SelectFieldProps) {
  return (
    <label>
      <span className="text-carbon-900 mb-2 block text-sm font-medium">
        {label}
      </span>
      <span className="relative block">
        <select
          name={name}
          required={required}
          defaultValue={defaultValue ?? ""}
          className="h-12 w-full appearance-none rounded-xl border-0 bg-black/[0.035] pr-11 pl-4 ring-0 transition-colors outline-none focus:bg-black/[0.055] focus:ring-0"
        >
          <option value="" disabled>
            Choose {label.toLowerCase()}
          </option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
        />
      </span>
    </label>
  );
}

function PropertyTypeField({ defaultValue }: { defaultValue?: string }) {
  const [propertyType, setPropertyType] = useState(defaultValue ?? "");

  return (
    <div className={propertyType === "Other" ? "sm:col-span-2" : undefined}>
      <div
        className={
          propertyType === "Other" ? "grid gap-5 sm:grid-cols-2" : undefined
        }
      >
        <label>
          <span className="text-carbon-900 mb-2 block text-sm font-medium">
            Property type
          </span>
          <span className="relative block">
            <select
              name="propertyType"
              required
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border-0 bg-black/[0.035] pr-11 pl-4 ring-0 transition-colors outline-none focus:bg-black/[0.055] focus:ring-0"
            >
              <option value="" disabled>
                Choose property type
              </option>
              {[
                "House",
                "Apartment",
                "Duplex",
                "Studio apartment",
                "Penthouse",
                "Villa",
                "Mansion",
                "Shared apartment",
                "Other",
              ].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
            />
          </span>
        </label>

        {propertyType === "Other" ? (
          <Field
            label="Describe the property type"
            name="customPropertyType"
            placeholder="For example, townhouse or serviced residence"
            required
          />
        ) : null}
      </div>
    </div>
  );
}
