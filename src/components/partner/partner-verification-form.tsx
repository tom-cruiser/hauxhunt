"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Building2,
  FileCheck2,
  Files,
  Fingerprint,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  ScanFace,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { ALL_COUNTRIES } from "@/lib/countries";
import underReviewIllustration from "@/assets/images/under-review.png";

const STEPS = [
  { short: "Personal identity", title: "Personal identity" },
  { short: "Partner information", title: "Partner information" },
  { short: "Contact and address", title: "Contact and address" },
  { short: "Supporting documents", title: "Supporting documents" },
  { short: "Review and submit", title: "Review and submit" },
] as const;

const PARTNER_TYPES = ["Property manager", "Agent"] as const;

const COUNTRIES = [
  { name: "Rwanda", code: "+250", short: "RW" },
  { name: "Nigeria", code: "+234", short: "NG" },
  { name: "Kenya", code: "+254", short: "KE" },
] as const;

type PartnerType = (typeof PARTNER_TYPES)[number];
type WorkArrangement = "Independent" | "Agency";
type PropertyRelationship = "Owner" | "Appointed manager" | "Both";

type BeneficialOwner = {
  name: string;
  ownership: string;
  nationality: string;
  identity: string;
  phone: string;
};

export function PartnerVerificationForm() {
  const [step, setStep] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [partnerType, setPartnerType] =
    useState<PartnerType>("Property manager");
  const [workArrangement, setWorkArrangement] =
    useState<WorkArrangement>("Independent");
  const [propertyRelationship, setPropertyRelationship] =
    useState<PropertyRelationship>("Appointed manager");
  const [phoneCountry, setPhoneCountry] = useState("+250");
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const showsBusiness = workArrangement === "Agency";
  const needsCompanyRegistration = showsBusiness;

  useEffect(() => {
    const navigationEntry = window.performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    const isPageRefresh = navigationEntry?.type === "reload";
    if (isPageRefresh) {
      window.localStorage.removeItem("hauxhunt-partner-verification-step");
      window.localStorage.removeItem("hauxhunt-partner-verification-status");
    }
    const savedStep = Number(
      isPageRefresh
        ? 1
        : (window.localStorage.getItem("hauxhunt-partner-verification-step") ??
            1),
    );
    const timer = window.setTimeout(() => {
      setStep(Math.min(Math.max(savedStep - 1, 0), STEPS.length - 1));
      setSubmitted(
        !isPageRefresh &&
          window.localStorage.getItem(
            "hauxhunt-partner-verification-status",
          ) === "submitted",
      );
      setProgressLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    window.localStorage.setItem(
      "hauxhunt-partner-verification-step",
      String(step + 1),
    );
  }, [progressLoaded, step]);

  if (submitted) {
    return (
      <section className="px-5 py-12 sm:px-6 lg:px-10 lg:py-16 xl:px-12">
        <div className="mx-auto flex min-h-[calc(100svh-13rem)] max-w-[760px] items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] bg-white shadow-[0_25px_75px_rgba(0,0,0,0.1)]">
            <div className="relative flex min-h-64 items-center justify-center bg-black/[0.055] px-6 pt-7 sm:min-h-72">
              <Image
                src={underReviewIllustration}
                alt="Verification application being reviewed"
                className="h-60 w-auto max-w-full object-contain sm:h-72"
              />
            </div>
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <h1 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
                Submission received. Verification under review.
              </h1>
              <p className="text-carbon-600 mt-4 max-w-2xl leading-7">
                We will check your identity, partner details, and authority to
                list properties. You will receive a notification if anything
                else is needed or when your account is verified. In the
                meantime, you can continue managing your property drafts.
              </p>
              <div className="mt-7 flex justify-end">
                <a
                  href="/partner-dashboard?verification=submitted"
                  className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-7 font-medium text-white"
                >
                  Return to overview
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
      <VerificationToast />
      <div className="mx-auto max-w-[1120px]">
        <header className="flex flex-col gap-6 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="dashboard-page-title text-carbon-900">
              Get verified.
            </h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Confirm who you are and your authority to list properties. Your
              information is reviewed securely and is not displayed publicly.
            </p>
          </div>
        </header>

        <div className="mt-8">
          <ol className="grid grid-cols-5 overflow-x-auto py-1">
            {STEPS.map((item, index) => (
              <li key={item.short} className="relative min-w-[160px]">
                {index < STEPS.length - 1 ? (
                  <span
                    className={`absolute top-4 left-[calc(50%+1rem)] h-px w-[calc(100%-2rem)] ${index < step ? "bg-black" : "bg-black/12"}`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className="relative z-10 flex w-full flex-col items-center text-center"
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${index < step ? "border-black bg-black text-white" : index === step ? "border-black bg-white text-black ring-4 ring-black/7" : "border-black/15 bg-white text-black/35"}`}
                  >
                    {index < step ? (
                      <Check className="size-3.5" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span
                    className={`mt-2 text-xs font-medium ${index === step ? "text-black" : "text-black/40"}`}
                  >
                    {item.short}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (step < STEPS.length - 1) setStep((value) => value + 1);
              else {
                setSubmitted(true);
                window.localStorage.setItem(
                  "hauxhunt-partner-verification-status",
                  "submitted",
                );
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="min-w-0 rounded-[2rem] bg-white p-6 shadow-[0_22px_65px_rgba(0,0,0,0.06)] sm:p-8 lg:p-10"
          >
            <div hidden={step !== 0}>
              <IdentityStep />
            </div>
            <div hidden={step !== 1}>
              <PartnerStep
                partnerType={partnerType}
                setPartnerType={setPartnerType}
                workArrangement={workArrangement}
                setWorkArrangement={setWorkArrangement}
                propertyRelationship={propertyRelationship}
                setPropertyRelationship={setPropertyRelationship}
                showsBusiness={showsBusiness}
                needsCompanyRegistration={needsCompanyRegistration}
              />
            </div>
            <div hidden={step !== 2}>
              <AddressStep
                phoneCountry={phoneCountry}
                setPhoneCountry={setPhoneCountry}
              />
            </div>
            <div hidden={step !== 3}>
              <DocumentsStep
                partnerType={partnerType}
                propertyRelationship={propertyRelationship}
                needsCompanyRegistration={needsCompanyRegistration}
              />
            </div>
            <div hidden={step !== 4}>
              <ReviewStep
                partnerType={partnerType}
                showsBusiness={showsBusiness}
              />
            </div>

            <div className="mt-9 flex flex-col-reverse gap-3 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative">
                {draftSaved ? (
                  <span className="absolute -top-6 left-0 text-xs whitespace-nowrap text-black/50">
                    Draft saved
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setDraftSaved(true);
                    showVerificationMessage("Verification draft saved");
                    window.setTimeout(() => setDraftSaved(false), 1800);
                  }}
                  className="h-12 rounded-full border border-black/12 px-5 text-sm font-medium transition-colors hover:bg-black/[0.035]"
                >
                  Save draft
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                  disabled={step === 0}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-black/12 px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
                >
                  <ArrowLeft className="size-4" /> Previous
                </button>
                <button
                  type="submit"
                  className="font-bricolage inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 sm:flex-none"
                >
                  {step === STEPS.length - 1 ? "Submit" : "Next"}
                  {step < STEPS.length - 1 ? (
                    <ArrowRight className="size-4" />
                  ) : null}
                </button>
              </div>
            </div>
          </form>
          <StepSupportCards step={step} partnerType={partnerType} />
        </div>
      </div>
    </section>
  );
}

const STEP_SUPPORT = [
  {
    icon: ScanFace,
    label: "Identity check",
    title: "Use your legal details.",
    description:
      "Names, dates, and document numbers must match your government-issued ID exactly.",
    checks: ["Original document", "Valid and unexpired", "Clear and readable"],
  },
  {
    icon: Building2,
    label: "Partner check",
    title: "Tell us who you represent.",
    description:
      "Requirements adapt to property managers, agents, and agency-affiliated professionals.",
    checks: [
      "Legal business details",
      "Authority to act",
      "Ownership information",
    ],
  },
  {
    icon: MapPin,
    label: "Contact check",
    title: "Keep your account reachable.",
    description:
      "Verified contact details help us protect the account and resolve review questions.",
    checks: ["Email confirmation", "Phone confirmation", "Current address"],
  },
  {
    icon: Files,
    label: "Evidence check",
    title: "Upload complete evidence.",
    description:
      "Use clear files with all edges visible. The information must match your application.",
    checks: ["PDF, JPG, or PNG", "Maximum 10 MB", "No cropped details"],
  },
  {
    icon: ShieldCheck,
    label: "Final review",
    title: "One careful check.",
    description:
      "Review every section before submitting. You can correct requested items later.",
    checks: [
      "Details are accurate",
      "Documents are current",
      "Declarations accepted",
    ],
  },
] as const;

function StepSupportCards({
  step,
  partnerType,
}: {
  step: number;
  partnerType: PartnerType;
}) {
  const content = STEP_SUPPORT[step];
  const Icon = content.icon;

  return (
    <aside className="grid gap-4 sm:grid-cols-2 xl:sticky xl:top-28 xl:grid-cols-1">
      <section className="overflow-hidden rounded-[1.75rem] bg-[linear-gradient(145deg,#030303_0%,#151515_55%,#303030_100%)] p-6 text-white">
        <div className="flex items-center justify-between">
          <span className="flex size-11 items-center justify-center text-white">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="text-xs font-medium text-white/40">
            0{step + 1} / 0{STEPS.length}
          </span>
        </div>
        <p className="mt-8 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">
          {content.label}
        </p>
        <h3 className="font-bricolage mt-3 text-2xl leading-7 font-medium tracking-[-0.035em]">
          {content.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/55">
          {content.description}
        </p>
        <ul className="mt-6 space-y-3 border-t border-white/10 pt-5">
          {content.checks.map((check) => (
            <li
              key={check}
              className="flex items-center gap-3 text-xs text-white/75"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-black">
                <Check aria-hidden="true" className="size-3" />
              </span>
              {check}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[1.75rem] border border-black/8 bg-[linear-gradient(145deg,#ffffff_0%,#f2f2f2_52%,#dedede_100%)] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
        <span className="flex size-9 items-center justify-center">
          {step === 1 ? (
            <Fingerprint aria-hidden="true" className="size-4" />
          ) : (
            <LockKeyhole aria-hidden="true" className="size-4" />
          )}
        </span>
        <p className="font-bricolage mt-5 font-medium">
          {step === 1 ? partnerType : "Private by design"}
        </p>
        <p className="text-carbon-500 mt-2 text-xs leading-5">
          {step === 1
            ? "The fields and documents shown are tailored to this partner type."
            : "Verification information is not displayed on your public profile or property listings."}
        </p>
      </section>

      {step < 4 ? (
        <section className="rounded-[1.75rem] bg-[linear-gradient(160deg,#343434_0%,#151515_48%,#000000_100%)] p-5 text-white">
          <FileCheck2 aria-hidden="true" className="size-5" />
          <p className="font-bricolage mt-5 text-lg font-medium">
            Before uploading
          </p>
          <p className="mt-2 text-xs leading-5 text-white/55">
            Remove passwords from files and ensure every page is included in the
            correct orientation.
          </p>
        </section>
      ) : null}
    </aside>
  );
}

function StepHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="text-xs font-semibold tracking-[0.14em] text-black/40 uppercase">
        {eyebrow}
      </p>
      <h2 className="font-bricolage mt-2 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
        {title}
      </h2>
      <p className="text-carbon-500 mt-3 max-w-2xl text-sm leading-6">
        {children}
      </p>
    </header>
  );
}

function IdentityStep() {
  return (
    <div>
      <StepHeading eyebrow="Step 1" title="Confirm your identity">
        Enter your details exactly as they appear on your government-issued
        identity document.
      </StepHeading>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Legal first name"
          name="firstName"
          defaultValue="Alex"
          required
        />
        <Field
          label="Legal last name"
          name="lastName"
          defaultValue="Partner"
          required
        />
        <Field label="Date of birth" name="birthDate" type="date" required />
        <SelectField
          label="Nationality"
          name="nationality"
          defaultValue="Rwanda"
        >
          {ALL_COUNTRIES.map((country) => (
            <option key={country}>{country}</option>
          ))}
        </SelectField>
        <SelectField
          label="Identity document"
          name="identityType"
          defaultValue="National ID"
        >
          <option>National ID</option>
          <option>Passport</option>
          <option>Driving licence</option>
        </SelectField>
        <Field
          label="Document number"
          name="documentNumber"
          placeholder="Enter the document number"
          required
        />
        <SelectField
          label="Document issuing country"
          name="documentCountry"
          defaultValue="Rwanda"
        >
          {COUNTRIES.map((country) => (
            <option key={country.name}>{country.name}</option>
          ))}
          <option>Other</option>
        </SelectField>
        <Field
          label="Document issue date"
          name="documentIssueDate"
          type="date"
          required
        />
        <Field
          label="Document expiry date"
          name="documentExpiryDate"
          type="date"
          required
        />
        <Field
          label="Occupation or profession"
          name="occupation"
          placeholder="e.g. Property manager"
          required
        />
      </div>
      <p className="text-carbon-500 mt-5 text-xs leading-5">
        Your legal name must match the name on the uploaded document. Identity
        details are used only for verification and fraud prevention.
      </p>
    </div>
  );
}

function PartnerStep({
  partnerType,
  setPartnerType,
  workArrangement,
  setWorkArrangement,
  propertyRelationship,
  setPropertyRelationship,
  showsBusiness,
  needsCompanyRegistration,
}: {
  partnerType: PartnerType;
  setPartnerType: (value: PartnerType) => void;
  workArrangement: WorkArrangement;
  setWorkArrangement: (value: WorkArrangement) => void;
  propertyRelationship: PropertyRelationship;
  setPropertyRelationship: (value: PropertyRelationship) => void;
  showsBusiness: boolean;
  needsCompanyRegistration: boolean;
}) {
  const [owners, setOwners] = useState<BeneficialOwner[]>([]);
  const [ownerFormOpen, setOwnerFormOpen] = useState(true);
  const [editingOwnerIndex, setEditingOwnerIndex] = useState<number | null>(
    null,
  );
  const [ownerDraft, setOwnerDraft] = useState<BeneficialOwner>({
    name: "",
    ownership: "",
    nationality: "Rwanda",
    identity: "",
    phone: "",
  });
  const ownerComplete = Object.values(ownerDraft).every((value) =>
    value.trim(),
  );

  const addOwner = () => {
    if (!ownerComplete) return;
    const wasEditing = editingOwnerIndex !== null;
    setOwners((current) =>
      editingOwnerIndex === null
        ? [...current, ownerDraft]
        : current.map((owner, index) =>
            index === editingOwnerIndex ? ownerDraft : owner,
          ),
    );
    setOwnerDraft({
      name: "",
      ownership: "",
      nationality: "Rwanda",
      identity: "",
      phone: "",
    });
    setEditingOwnerIndex(null);
    setOwnerFormOpen(false);
    showVerificationMessage(
      wasEditing ? "Beneficial owner updated" : "Beneficial owner saved",
    );
  };

  return (
    <div>
      <StepHeading eyebrow="Step 2" title="Tell us how you list">
        This determines which business and authorization documents are required.
      </StepHeading>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Partner type"
          name="partnerType"
          value={partnerType}
          onChange={(event) =>
            setPartnerType(event.target.value as PartnerType)
          }
          className="sm:col-span-2"
        >
          {PARTNER_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </SelectField>
        <SelectField
          label="Work arrangement"
          name="workArrangement"
          value={workArrangement}
          onChange={(event) =>
            setWorkArrangement(event.target.value as WorkArrangement)
          }
        >
          <option>Independent</option>
          <option>Agency</option>
        </SelectField>
        {partnerType === "Property manager" ? (
          <SelectField
            label="Property relationship"
            name="propertyRelationship"
            value={propertyRelationship}
            onChange={(event) =>
              setPropertyRelationship(
                event.target.value as PropertyRelationship,
              )
            }
          >
            <option value="Owner">I own the properties I manage</option>
            <option value="Appointed manager">
              I manage properties for owners
            </option>
            <option value="Both">Both</option>
          </SelectField>
        ) : null}
        {showsBusiness ? (
          <>
            <Field
              label="Agency name"
              name="businessName"
              defaultValue="Kigali Homes Ltd."
              required={needsCompanyRegistration}
            />
            <Field
              label="Your role or job title"
              name="role"
              placeholder="e.g. Property manager"
              required
            />
            <SelectField
              label="Authority in the business"
              name="businessAuthority"
              defaultValue="Director"
            >
              <option>Director</option>
              <option>Owner or shareholder</option>
              <option>Authorized representative</option>
              <option>Employee</option>
            </SelectField>
            <Field
              label="Business registration number"
              name="registrationNumber"
              placeholder="Enter registration number"
              required={needsCompanyRegistration}
            />
            <Field
              label="Tax identification number"
              name="taxId"
              placeholder="Enter tax ID"
              required={needsCompanyRegistration}
            />
            <Field
              label="Business email"
              name="businessEmail"
              type="email"
              placeholder="name@business.com"
            />
            <Field
              label="Business phone number"
              name="businessPhone"
              type="tel"
              inputMode="tel"
              placeholder="e.g. +250 788 123 456"
              required={needsCompanyRegistration}
            />
            <Field
              label="Business website (optional)"
              name="website"
              type="url"
              placeholder="https://"
            />
            <Field
              label="Registered business address"
              name="businessAddress"
              placeholder="Street, district and city"
              required={needsCompanyRegistration}
              className="sm:col-span-2"
            />
            <div className="rounded-2xl border border-black/8 p-5 sm:col-span-2 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bricolage text-lg font-medium">
                    Beneficial owner
                  </p>
                  <p className="text-carbon-500 mt-1 text-xs leading-5">
                    Add every person who ultimately owns or controls the
                    business.
                  </p>
                </div>
                {!ownerFormOpen && owners.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOwnerIndex(null);
                      setOwnerFormOpen(true);
                    }}
                    className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white"
                  >
                    + Add another owner
                  </button>
                ) : null}
              </div>
              {owners.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium">
                      Added owners ({owners.length})
                    </p>
                    <p className="text-carbon-500 text-[0.68rem] sm:hidden">
                      Swipe to see more
                    </p>
                  </div>
                  <div className="touch-pan-x [scrollbar-width:thin] overflow-x-auto overscroll-x-contain border border-black/8">
                    <table className="w-full min-w-[880px] border-collapse text-left text-xs">
                      <thead className="bg-black/[0.04] text-black/45">
                        <tr>
                          <th className="px-4 py-3 font-medium">Legal name</th>
                          <th className="px-4 py-3 font-medium">Ownership</th>
                          <th className="px-4 py-3 font-medium">Nationality</th>
                          <th className="px-4 py-3 font-medium">
                            ID / passport
                          </th>
                          <th className="px-4 py-3 font-medium">
                            Phone number
                          </th>
                          <th className="w-24 px-4 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {owners.map((owner, index) => (
                          <tr
                            key={`${owner.identity}-${index}`}
                            className="border-t border-black/8"
                          >
                            <td className="px-4 py-3 font-medium">
                              {owner.name}
                            </td>
                            <td className="px-4 py-3">{owner.ownership}%</td>
                            <td className="px-4 py-3">{owner.nationality}</td>
                            <td className="px-4 py-3">{owner.identity}</td>
                            <td className="px-4 py-3">{owner.phone}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOwnerDraft(owner);
                                    setOwnerFormOpen(true);
                                    setEditingOwnerIndex(index);
                                  }}
                                  aria-label={`Edit ${owner.name}`}
                                  title="Edit owner"
                                  className="flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black"
                                >
                                  <Pencil
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOwners((current) =>
                                      current.filter(
                                        (_, ownerIndex) => ownerIndex !== index,
                                      ),
                                    );
                                    showVerificationMessage(
                                      "Beneficial owner removed",
                                    );
                                  }}
                                  aria-label={`Remove ${owner.name}`}
                                  title="Delete owner"
                                  className="flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black"
                                >
                                  <Trash2
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {ownerFormOpen ? (
                <div className="mt-5 rounded-xl bg-black/[0.025] p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Owner's full legal name"
                      name="ownerName"
                      value={ownerDraft.name}
                      onChange={(event) =>
                        setOwnerDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                    <Field
                      label="Ownership or control (%)"
                      name="ownership"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 60"
                      value={ownerDraft.ownership}
                      onChange={(event) =>
                        setOwnerDraft((current) => ({
                          ...current,
                          ownership: event.target.value,
                        }))
                      }
                      required
                    />
                    <SelectField
                      label="Owner's nationality"
                      name="ownerNationality"
                      value={ownerDraft.nationality}
                      onChange={(event) =>
                        setOwnerDraft((current) => ({
                          ...current,
                          nationality: event.target.value,
                        }))
                      }
                    >
                      {ALL_COUNTRIES.map((country) => (
                        <option key={country}>{country}</option>
                      ))}
                    </SelectField>
                    <Field
                      label="ID or passport number"
                      name="ownerIdentity"
                      value={ownerDraft.identity}
                      onChange={(event) =>
                        setOwnerDraft((current) => ({
                          ...current,
                          identity: event.target.value,
                        }))
                      }
                      required
                    />
                    <Field
                      label="Owner's phone number"
                      name="ownerPhone"
                      type="tel"
                      inputMode="tel"
                      placeholder="e.g. +250 788 123 456"
                      value={ownerDraft.phone}
                      onChange={(event) =>
                        setOwnerDraft((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/8 pt-4">
                    <p className="text-carbon-500 text-[0.68rem]">
                      Complete all five fields. Only owners shown in the table
                      are saved.
                    </p>
                    <button
                      type="button"
                      onClick={addOwner}
                      disabled={!ownerComplete}
                      className="rounded-full bg-black px-5 py-2.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {editingOwnerIndex === null
                        ? "Save owner"
                        : "Update owner"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl bg-black/[0.035] p-5 sm:col-span-2 sm:p-6">
              <p className="font-bricolage text-lg font-medium">
                Professional licence
              </p>
              <p className="text-carbon-500 mt-1 text-xs leading-5">
                Complete this when your role or operating country requires a
                real-estate or agent licence.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Licence number (if applicable)"
                  name="licenceNumber"
                />
                <Field label="Issuing authority" name="licenceAuthority" />
                <Field
                  label="Licence issue date"
                  name="licenceIssueDate"
                  type="date"
                />
                <Field
                  label="Licence expiry date"
                  name="licenceExpiryDate"
                  type="date"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-black/[0.035] p-5 text-sm leading-6 text-black/65 sm:col-span-2">
            Independent professionals must show that they own, manage, or are
            legally authorized to represent every property they list.
          </div>
        )}
      </div>
    </div>
  );
}

function AddressStep({
  phoneCountry,
  setPhoneCountry,
}: {
  phoneCountry: string;
  setPhoneCountry: (value: string) => void;
}) {
  return (
    <div>
      <StepHeading eyebrow="Step 3" title="Contact and address">
        We use these details if the verification team needs to reach you. They
        are not shown on your public listings.
      </StepHeading>
      <div className="grid gap-5 sm:grid-cols-2">
        <VerifiedField
          label="Email address"
          value="partner@gmail.com"
          type="email"
          action="Verify email"
        />
        <PhoneVerificationField
          phoneCountry={phoneCountry}
          setPhoneCountry={setPhoneCountry}
        />
        <SelectField
          label="Country of residence"
          name="country"
          defaultValue="Rwanda"
        >
          {COUNTRIES.map((country) => (
            <option key={country.name}>{country.name}</option>
          ))}
        </SelectField>
        <Field
          label="City or district"
          name="city"
          defaultValue="Kigali"
          required
        />
        <Field
          label="Residential address"
          name="address"
          placeholder="Street, neighbourhood and building"
          required
          className="sm:col-span-2"
        />
        <Field
          label="Postal code (optional)"
          name="postalCode"
          placeholder="Postal code"
        />
        <Field
          label="How long have you lived at this address?"
          name="addressDuration"
          placeholder="e.g. 3 years"
        />
        <Field
          label="Alternative contact name"
          name="alternativeName"
          placeholder="Optional"
        />
        <Field
          label="Alternative contact number"
          name="alternativePhone"
          type="tel"
          placeholder="Optional"
        />
      </div>
    </div>
  );
}

function DocumentsStep({
  partnerType,
  propertyRelationship,
  needsCompanyRegistration,
}: {
  partnerType: PartnerType;
  propertyRelationship: PropertyRelationship;
  needsCompanyRegistration: boolean;
}) {
  const authorityTitle =
    partnerType === "Agent"
      ? "Owner authorization or agent mandate"
      : propertyRelationship === "Owner"
        ? "Proof of ownership"
        : propertyRelationship === "Appointed manager"
          ? "Property management agreement"
          : "Ownership or management authority";
  return (
    <div>
      <StepHeading eyebrow="Step 4" title="Upload supporting documents">
        Upload clear, complete documents. Details must match the information
        provided in the previous steps.
      </StepHeading>
      <div className="grid gap-4 md:grid-cols-2">
        <UploadField
          title="Government ID — front"
          description="National ID, passport bio page, or driving licence."
          required
        />
        <UploadField
          title="Government ID — back"
          description="Required when the document has information on both sides."
        />
        <UploadField
          title="Selfie holding your identity document"
          description="Your face and the document must both be clearly visible."
          required
        />
        {needsCompanyRegistration ? (
          <UploadField
            title="Business registration certificate"
            description="A current certificate showing the legal business name and registration number."
            required
          />
        ) : null}
        {needsCompanyRegistration ? (
          <UploadField
            title="Beneficial ownership declaration"
            description="Current ownership declaration or official beneficial-owner record."
            required
          />
        ) : null}
        {needsCompanyRegistration ? (
          <UploadField
            title="Representative authorization"
            description="Board resolution or signed authorization if you are submitting on behalf of the business."
          />
        ) : null}
        {partnerType === "Agent" ? (
          <UploadField
            title="Professional licence"
            description="Real-estate agent licence where one is required in your operating country."
          />
        ) : null}
        <UploadField
          title={authorityTitle}
          description={
            partnerType === "Property manager" &&
            propertyRelationship === "Owner"
              ? "Title deed, purchase document, lease, or another valid ownership record."
              : "A signed document confirming you are permitted to advertise and manage the property."
          }
          required
        />
        <UploadField
          title="Proof of address"
          description="A utility bill, bank statement, tenancy agreement, or official letter issued recently."
          required
        />
      </div>
      <div className="mt-6 rounded-2xl bg-black/[0.035] p-5">
        <p className="text-sm font-medium">Property-level checks</p>
        <p className="text-carbon-500 mt-1 text-xs leading-5">
          Verification confirms your partner account. Each property will still
          need ownership evidence, an owner authorization, management agreement,
          or agent mandate whose property address and owner details match the
          listing.
        </p>
      </div>
      <p className="text-carbon-500 mt-5 text-xs">
        Accepted formats: PDF, JPG, or PNG. Maximum 10 MB per file.
      </p>
    </div>
  );
}

function ReviewStep({
  partnerType,
  showsBusiness,
}: {
  partnerType: PartnerType;
  showsBusiness: boolean;
}) {
  return (
    <div>
      <StepHeading eyebrow="Step 5" title="Review and confirm">
        Make sure everything is accurate before sending it to the RentUp
        verification team.
      </StepHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewCard
          label="Identity"
          value="Alex Partner"
          detail="Government ID and selfie added"
        />
        <ReviewCard
          label="Partner type"
          value={partnerType}
          detail={
            showsBusiness ? "Agency details added" : "Independent professional"
          }
        />
        <ReviewCard
          label="Contact"
          value="partner@gmail.com"
          detail="Kigali, Rwanda"
        />
        <ReviewCard
          label="Documents"
          value="Ready for review"
          detail="Required evidence attached"
        />
        <ReviewCard
          label="Contact checks"
          value="Email and phone confirmed"
          detail="Both contact methods verified"
        />
        <ReviewCard
          label="Registry check"
          value={showsBusiness ? "Ready to validate" : "Not applicable"}
          detail={
            showsBusiness
              ? "Agency registration, TIN, directors and ownership"
              : `Independent ${partnerType.toLowerCase()} account`
          }
        />
      </div>
      <div className="mt-7 space-y-3 rounded-2xl bg-black/[0.035] p-5">
        <CheckLabel>
          I confirm that the information and documents submitted are complete,
          current, and accurate.
        </CheckLabel>
        <CheckLabel>
          I confirm that I own, manage, or have permission to advertise the
          properties I list on RentUp.
        </CheckLabel>
        <CheckLabel>
          I agree that RentUp may verify these details and contact me if
          additional evidence is required.
        </CheckLabel>
        <CheckLabel>
          I consent to RentUp checking the submitted information against
          relevant identity, business, tax, licensing, and property records.
        </CheckLabel>
      </div>
      <div className="mt-5 rounded-2xl border border-black/8 p-5">
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">How your information is used</p>
            <p className="text-carbon-500 mt-1 text-xs leading-5">
              These details are used for identity, business, licence, and
              listing-authority checks. They are accessible only to authorized
              verification personnel, retained only as long as required, and are
              never displayed on public listings. You may request correction or
              deletion where legally permitted.
            </p>
          </div>
        </div>
      </div>
      <VerificationLifecycle />
    </div>
  );
}

function VerifiedField({
  label,
  value,
  type,
  action,
}: {
  label: string;
  value: string;
  type: string;
  action: string;
}) {
  const [status, setStatus] = useState<"idle" | "code" | "verified">("idle");
  const [code, setCode] = useState("");

  const updateCode = (value: string) => {
    const nextCode = value.replace(/\D/g, "").slice(0, 6);
    setCode(nextCode);
    if (nextCode === "000000") {
      setStatus("verified");
      showVerificationMessage("Email address verified");
    }
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="flex h-12 items-center rounded-xl bg-black/[0.04] pr-2 pl-4">
        <input
          name="email"
          type={type}
          defaultValue={value}
          className="min-w-0 flex-1 border-0 bg-transparent shadow-none ring-0 outline-none focus:border-0 focus:ring-0 focus:outline-none"
        />
        {status === "verified" ? (
          <VerifiedBadge />
        ) : (
          <button
            type="button"
            onClick={() => {
              setStatus("code");
              showVerificationMessage("Verification code sent to your email");
            }}
            className="shrink-0 rounded-full bg-black px-3 py-2 text-xs font-medium text-white"
          >
            {status === "code" ? "Code sent" : action}
          </button>
        )}
      </span>
      {status === "code" ? (
        <OtpField
          value={code}
          invalid={code.length === 6 && code !== "000000"}
          onChange={updateCode}
          destination={value}
          onResend={() => {
            setCode("");
            showVerificationMessage("A new email verification code was sent");
          }}
        />
      ) : null}
    </div>
  );
}

function PhoneVerificationField({
  phoneCountry,
  setPhoneCountry,
}: {
  phoneCountry: string;
  setPhoneCountry: (value: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "code" | "verified">("idle");
  const [code, setCode] = useState("");

  const updateCode = (value: string) => {
    const nextCode = value.replace(/\D/g, "").slice(0, 6);
    setCode(nextCode);
    if (nextCode === "000000") {
      setStatus("verified");
      showVerificationMessage("Phone number verified");
    }
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-medium">Phone number</span>
      <div className="flex gap-2">
        <span className="relative block w-24 shrink-0">
          <select
            value={phoneCountry}
            onChange={(event) => setPhoneCountry(event.target.value)}
            className={selectClass}
            aria-label="Phone country"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.short}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
        </span>
        <div className="flex h-12 min-w-0 flex-1 items-center rounded-xl bg-black/[0.04] pr-2 pl-4 focus-within:bg-black/[0.06]">
          <span className="text-carbon-500 mr-2 text-sm">{phoneCountry}</span>
          <input
            aria-label="Phone number"
            name="phone"
            type="tel"
            defaultValue="788 123 456"
            style={{ border: 0, boxShadow: "none", outline: "none" }}
            className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent shadow-none ring-0 outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
          />
          {status === "verified" ? (
            <VerifiedBadge />
          ) : (
            <button
              type="button"
              onClick={() => {
                setStatus("code");
                showVerificationMessage("Verification code sent to your phone");
              }}
              className="shrink-0 rounded-full bg-black px-3 py-2 text-xs font-medium text-white"
            >
              {status === "code" ? "Code sent" : "Verify"}
            </button>
          )}
        </div>
      </div>
      {status === "code" ? (
        <OtpField
          value={code}
          invalid={code.length === 6 && code !== "000000"}
          onChange={updateCode}
          destination={`${phoneCountry} 788 123 456`}
          onResend={() => {
            setCode("");
            showVerificationMessage("A new phone verification code was sent");
          }}
        />
      ) : null}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-black px-3 py-2 text-xs font-medium text-white">
      <Check aria-hidden="true" className="size-3" /> Verified
    </span>
  );
}

function OtpField({
  value,
  invalid,
  onChange,
  destination,
  onResend,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  destination: string;
  onResend: () => void;
}) {
  return (
    <div className="mt-3 rounded-2xl bg-black/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Enter verification code</p>
          <p className="text-carbon-500 mt-1 text-xs">Sent to {destination}</p>
        </div>
        <button
          type="button"
          onClick={onResend}
          className="text-xs font-medium"
        >
          Resend
        </button>
      </div>
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Six digit verification code"
        aria-invalid={invalid}
        placeholder="000000"
        style={{ border: 0, boxShadow: "none", outline: "none" }}
        className={`mt-3 h-12 w-full rounded-xl border-0 px-4 text-center font-mono text-lg tracking-[0.45em] shadow-none ring-0 outline-none placeholder:text-black/20 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none ${invalid ? "bg-red-50 text-red-700" : "bg-white text-black"}`}
      />
      {invalid ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          That code is incorrect. Check the code and try again.
        </p>
      ) : null}
    </div>
  );
}

function VerificationLifecycle() {
  const statuses = [
    "Submitted",
    "Under review",
    "Changes requested",
    "Verified",
  ];
  return (
    <div className="mt-6 rounded-2xl bg-black p-5 text-white sm:p-6">
      <p className="font-bricolage text-lg font-medium">What happens next</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {statuses.map((status, index) => (
          <div key={status} className="rounded-xl bg-white/8 p-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
              {index + 1}
            </span>
            <p className="mt-3 text-xs font-medium">{status}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-white/50">
        If a document is rejected, we will identify the exact issue and let you
        replace only the affected information. Verification may later require
        renewal when documents expire or account details change.
      </p>
    </div>
  );
}

function UploadField({
  title,
  description,
  required,
}: {
  title: string;
  description: string;
  required?: boolean;
}) {
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label
      className={`group relative flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-colors hover:border-black/45 ${fileName ? "border-black/25 bg-black/[0.065]" : "border-black/20 bg-white hover:bg-black/[0.015]"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        required={required}
        onChange={(event) => {
          const nextFileName = event.target.files?.[0]?.name ?? "";
          setFileName(nextFileName);
          if (nextFileName) showVerificationMessage("Document added");
        }}
        className="sr-only"
      />
      <span className="flex items-center justify-center">
        <span className="flex flex-col items-center">
          <span className="text-sm font-medium text-black/75">Add</span>
          <span className="mt-3 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#aeb3b8] text-black/65 transition-transform group-hover:scale-105">
            <Plus aria-hidden="true" className="size-6" strokeWidth={2} />
          </span>
        </span>
        <span
          className={`absolute top-4 right-4 text-[0.65rem] font-medium ${required ? "text-black" : "text-black/45"}`}
        >
          {required ? "Required" : "Optional"}
        </span>
      </span>
      <span className="mt-3 min-w-0">
        <span className="font-bricolage block text-base font-medium">
          {title}
        </span>
        <span className="text-carbon-500 mt-2 block text-xs leading-5">
          {description}
        </span>
      </span>
      <span className="mt-5 flex flex-col items-center gap-3 text-xs">
        {fileName ? (
          <span className="flex max-w-full items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <span className="min-w-0 truncate font-medium text-black">
              {fileName}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setFileName("");
                if (inputRef.current) inputRef.current.value = "";
                showVerificationMessage("Document removed");
              }}
              aria-label={`Remove ${fileName}`}
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-black/15 text-black/55 transition-colors hover:bg-black hover:text-white"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ) : null}
      </span>
    </label>
  );
}

function ReviewCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 p-5">
      <p className="text-xs font-semibold tracking-[0.1em] text-black/40 uppercase">
        {label}
      </p>
      <p className="mt-3 font-medium">{value}</p>
      <p className="text-carbon-500 mt-1 text-xs">{detail}</p>
    </div>
  );
}

function CheckLabel({ children }: { children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
      <input
        type="checkbox"
        required
        className="mt-1 size-4 shrink-0 accent-black"
      />
      <span>{children}</span>
    </label>
  );
}

function showVerificationMessage(message: string) {
  window.dispatchEvent(
    new CustomEvent("verification-message", { detail: message }),
  );
}

function VerificationToast() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const connectHost = window.setTimeout(() => setHost(document.body), 0);
    const receiveMessage = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail);
    };
    window.addEventListener("verification-message", receiveMessage);
    return () => {
      window.clearTimeout(connectHost);
      window.removeEventListener("verification-message", receiveMessage);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!host) return null;

  return createPortal(
    <AnimatePresence>
      {message ? (
        <motion.div
          key={message}
          role="status"
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="feedback-toast"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    host,
  );
}

const inputClass =
  "h-12 w-full rounded-xl border-0 bg-black/[0.04] px-4 ring-0 outline-none transition-colors placeholder:text-black/30 focus:bg-black/[0.06] focus:ring-0";
const selectClass = `${inputClass} appearance-none pr-11`;

function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium">
        {label}
        {props.required ? " *" : ""}
      </span>
      <input {...props} className={inputClass} />
    </label>
  );
}

function SelectField({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <select {...props} className={selectClass}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
      </span>
    </label>
  );
}
