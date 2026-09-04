"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, FileUp } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import applicationReceivedIllustration from "@/assets/images/application-received.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import { DEMO_LISTINGS } from "@/data/hero-search-demo";
import { RENTER_APPLICATIONS } from "@/data/renter-applications";

// Wizard step labels stay translation keys, not literal text -- `steps` in
// the reference renter-dashboard nav groups is the same pattern (`labelKey`
// resolved via `t()` at render time). Nothing else in this file compares
// against step text, only the index, so no separate internal value is
// needed here.
const stepKeys = [
  "renterDashboard.applicationNew.steps.aboutYou",
  "renterDashboard.applicationNew.steps.rentalNeeds",
  "renterDashboard.applicationNew.steps.employment",
  "renterDashboard.applicationNew.steps.household",
  "renterDashboard.applicationNew.steps.references",
  "renterDashboard.applicationNew.steps.documents",
  "renterDashboard.applicationNew.steps.review",
] as const;

// These stay the internal `<select>` values stored in form state (and shown
// verbatim in the Review step / carried into the submission payload) --
// only the label shown in the dropdown is translated, via the parallel
// label maps below (mirrors the renter dashboard's `FilterSelect`
// `optionLabels`).
const employmentOptions = [
  { value: "Employed", labelKey: "renterDashboard.applicationNew.employmentOptions.employed" },
  { value: "Self-employed", labelKey: "renterDashboard.applicationNew.employmentOptions.selfEmployed" },
  { value: "Student", labelKey: "renterDashboard.applicationNew.employmentOptions.student" },
  { value: "Retired", labelKey: "renterDashboard.applicationNew.employmentOptions.retired" },
  { value: "Other", labelKey: "renterDashboard.applicationNew.employmentOptions.other" },
];

// Income bands contain currency amounts, which stay untranslated -- only
// the surrounding "Under / Between … and … / Above" wording is translated,
// via interpolation into the three templates below.
const incomeRanges = [
  "Under RWF 500,000",
  "Between RWF 500,000 and RWF 999,999",
  "Between RWF 1,000,000 and RWF 1,499,999",
  "Between RWF 1,500,000 and RWF 1,999,999",
  "Between RWF 2,000,000 and RWF 2,999,999",
  "Above RWF 3,000,000",
];
const incomeRangeLabels: Array<{ key: string; vars: Record<string, string> }> = [
  { key: "renterDashboard.applicationNew.incomeRanges.under", vars: { amount: "RWF 500,000" } },
  { key: "renterDashboard.applicationNew.incomeRanges.between", vars: { min: "RWF 500,000", max: "RWF 999,999" } },
  { key: "renterDashboard.applicationNew.incomeRanges.between", vars: { min: "RWF 1,000,000", max: "RWF 1,499,999" } },
  { key: "renterDashboard.applicationNew.incomeRanges.between", vars: { min: "RWF 1,500,000", max: "RWF 1,999,999" } },
  { key: "renterDashboard.applicationNew.incomeRanges.between", vars: { min: "RWF 2,000,000", max: "RWF 2,999,999" } },
  { key: "renterDashboard.applicationNew.incomeRanges.above", vars: { amount: "RWF 3,000,000" } },
];

const incomeSources = [
  "Salary or wages",
  "Self-employment or business",
  "Freelance or contract work",
  "Investments or rental income",
  "Pension or retirement income",
  "Family support",
  "Other",
];
const INCOME_SOURCE_LABEL_KEYS: Record<string, string> = {
  "Salary or wages": "renterDashboard.applicationNew.incomeSources.salaryOrWages",
  "Self-employment or business": "renterDashboard.applicationNew.incomeSources.selfEmploymentOrBusiness",
  "Freelance or contract work": "renterDashboard.applicationNew.incomeSources.freelanceOrContractWork",
  "Investments or rental income": "renterDashboard.applicationNew.incomeSources.investmentsOrRentalIncome",
  "Pension or retirement income": "renterDashboard.applicationNew.incomeSources.pensionOrRetirementIncome",
  "Family support": "renterDashboard.applicationNew.incomeSources.familySupport",
  Other: "renterDashboard.applicationNew.incomeSources.other",
};

const rentPaymentMethods = [
  "Bank transfer",
  "Mobile Money",
  "Standing order or direct debit",
  "Cash deposit",
  "Employer-paid housing allowance",
  "Other",
];
const RENT_PAYMENT_LABEL_KEYS: Record<string, string> = {
  "Bank transfer": "renterDashboard.applicationNew.rentPaymentMethods.bankTransfer",
  "Mobile Money": "renterDashboard.applicationNew.rentPaymentMethods.mobileMoney",
  "Standing order or direct debit": "renterDashboard.applicationNew.rentPaymentMethods.standingOrderOrDirectDebit",
  "Cash deposit": "renterDashboard.applicationNew.rentPaymentMethods.cashDeposit",
  "Employer-paid housing allowance": "renterDashboard.applicationNew.rentPaymentMethods.employerPaidHousingAllowance",
  Other: "renterDashboard.applicationNew.rentPaymentMethods.other",
};

const applicationDocuments = ["Identity document", "Reference document"];
const DOCUMENT_LABEL_KEYS: Record<string, string> = {
  "Identity document": "renterDashboard.applicationNew.documents.identityDocument",
  "Reference document": "renterDashboard.applicationNew.documents.referenceDocument",
};

function currentApplicationValues(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([name]) => name !== "employer" && name !== "role",
    ),
  );
}

type ApplicationField = {
  labelKey: string;
  name: string;
  placeholder?: string;
  placeholderKey?: string;
};

const fields: Record<number, ApplicationField[]> = {
  0: [
    { labelKey: "renterDashboard.applicationNew.fields.fullName", name: "fullName", placeholder: "Julien Mugisha" },
    { labelKey: "renterDashboard.applicationNew.fields.email", name: "email", placeholder: "renter@gmail.com" },
    { labelKey: "renterDashboard.applicationNew.fields.phone", name: "phone", placeholder: "+250 788 000 000" },
  ],
  1: [
    { labelKey: "renterDashboard.applicationNew.fields.moveIn", name: "moveIn" },
    {
      labelKey: "renterDashboard.applicationNew.fields.lease",
      name: "lease",
      placeholderKey: "renterDashboard.applicationNew.placeholders.leaseLength",
    },
    {
      labelKey: "renterDashboard.applicationNew.fields.reason",
      name: "reason",
      placeholderKey: "renterDashboard.applicationNew.placeholders.reasonForMoving",
    },
  ],
  2: [
    { labelKey: "renterDashboard.applicationNew.fields.employment", name: "employment" },
    { labelKey: "renterDashboard.applicationNew.fields.income", name: "income" },
    { labelKey: "renterDashboard.applicationNew.fields.incomeSource", name: "incomeSource" },
    { labelKey: "renterDashboard.applicationNew.fields.rentPayment", name: "rentPayment" },
  ],
  3: [
    { labelKey: "renterDashboard.applicationNew.fields.occupants", name: "occupants", placeholder: "2" },
    {
      labelKey: "renterDashboard.applicationNew.fields.pets",
      name: "pets",
      placeholderKey: "renterDashboard.applicationNew.placeholders.noPets",
    },
    {
      labelKey: "renterDashboard.applicationNew.fields.coApplicant",
      name: "coApplicant",
      placeholderKey: "renterDashboard.applicationNew.placeholders.none",
    },
  ],
  4: [
    { labelKey: "renterDashboard.applicationNew.fields.referenceName", name: "reference", placeholder: "Claire Uwase" },
    {
      labelKey: "renterDashboard.applicationNew.fields.relationship",
      name: "relationship",
      placeholderKey: "renterDashboard.applicationNew.placeholders.relationshipExample",
    },
    { labelKey: "renterDashboard.applicationNew.fields.referencePhone", name: "referencePhone", placeholder: "+250 788 111 111" },
  ],
};

export default function NewApplicationPage() {
  return (
    <Suspense>
      <NewApplicationPageInner />
    </Suspense>
  );
}

function NewApplicationPageInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const router = useRouter();
  const propertyId = params.get("property") ?? "kacyiru-2br";
  const draftId = params.get("draft");
  const property =
    DEMO_LISTINGS.find((item) => item.id === propertyId) ?? DEMO_LISTINGS[0];
  const existing = RENTER_APPLICATIONS.find(
    (item) =>
      item.propertyId === propertyId &&
      item.status !== "Draft" &&
      item.status !== "Withdrawn",
  );
  const [step, setStep] = useState(draftId ? 3 : 0);
  const [values, setValues] = useState<Record<string, string>>({
    fullName: "Julien Mugisha",
    email: "renter@gmail.com",
    phone: "+250 788 000 000",
    employment: "Employed",
  });
  const [documents, setDocuments] = useState<string[]>(
    draftId ? ["Identity document"] : [],
  );
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [documentTypes, setDocumentTypes] = useState<Record<string, string>>(
    {},
  );
  const [consented, setConsented] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const applicationId = "HH-APP-0261";

  useEffect(() => {
    const rawDraft = localStorage.getItem(
      `hauxhunt-application-${property.id}`,
    );
    if (!rawDraft) return;
    try {
      const draft = JSON.parse(rawDraft) as {
        step?: number;
        values?: Record<string, string>;
        documents?: string[];
      };
      const restoreDraft = window.setTimeout(() => {
        if (draft.values) {
          setValues((current) => ({
            ...current,
            ...currentApplicationValues(draft.values ?? {}),
          }));
        }
        if (draft.documents) {
          setDocuments(
            draft.documents.filter((name) =>
              applicationDocuments.includes(name),
            ),
          );
        }
        if (typeof draft.step === "number") {
          setStep(Math.min(Math.max(draft.step, 0), stepKeys.length - 1));
        }
      }, 0);
      return () => window.clearTimeout(restoreDraft);
    } catch {
      localStorage.removeItem(`hauxhunt-application-${property.id}`);
    }
  }, [property.id]);

  function saveDraft() {
    localStorage.setItem(
      `hauxhunt-application-${property.id}`,
      JSON.stringify({
        step,
        values: currentApplicationValues(values),
        documents,
        propertyId: property.id,
        title: property.title,
        location: property.location,
        savedAt: new Date().toISOString(),
      }),
    );
    setSaved(true);
    window.setTimeout(
      () => router.push("/renter-dashboard/applications?tab=drafts"),
      900,
    );
  }

  function continueForm() {
    if (!formRef.current?.reportValidity()) return;
    setStep((current) => current + 1);
  }

  function submitApplication() {
    sessionStorage.setItem(
      `hauxhunt-submission-${applicationId}`,
      JSON.stringify({
        propertyId: property.id,
        title: property.title,
        location: property.location,
        values,
        documents: documents
          .filter((name) => applicationDocuments.includes(name))
          .map((name) => ({
            name,
            url: documentUrls[name],
            type: documentTypes[name],
          })),
      }),
    );
    localStorage.removeItem(`hauxhunt-application-${property.id}`);
    setSubmitted(true);
  }

  if (existing && !draftId) {
    return (
      <>
        <RenterCatalogueTopBar />
        <main className="bg-carbon-50 flex min-h-svh items-center justify-center px-5 pt-16">
          <section className="w-full max-w-xl p-8 text-center">
            <Image
              src={applicationReceivedIllustration}
              alt={t(
                "renterDashboard.applicationNew.alreadyApplied.illustrationAlt",
              )}
              className="mx-auto h-36 w-auto object-contain"
              priority
            />
            <h1 className="font-bricolage mt-5 text-3xl font-medium">
              {t("renterDashboard.applicationNew.alreadyApplied.heading")}
            </h1>
            <p className="text-carbon-500 mt-3 text-sm leading-6">
              {t("renterDashboard.applicationNew.alreadyApplied.body", {
                title: existing.title,
              })}
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Link
                href="/renter-dashboard/applications"
                className="h-10 rounded-full border border-black/15 px-5 py-2.5 text-sm"
              >
                {t(
                  "renterDashboard.applicationNew.alreadyApplied.allApplications",
                )}
              </Link>
              <Link
                href={`/renter-dashboard/applications/${existing.id}`}
                className="h-10 rounded-full bg-black px-5 py-2.5 text-sm text-white"
              >
                {t(
                  "renterDashboard.applicationNew.alreadyApplied.viewApplication",
                )}
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <RenterCatalogueTopBar />
        <main className="bg-carbon-50 flex min-h-svh items-center justify-center px-5 pt-16">
          <section className="w-full max-w-2xl bg-white p-8 text-center shadow-[0_3px_14px_rgba(0,0,0,0.04)]">
            <Image
              src={applicationReceivedIllustration}
              alt={t("renterDashboard.applicationNew.submitted.illustrationAlt")}
              className="mx-auto h-40 w-auto object-contain"
              priority
            />
            <h1 className="font-bricolage mt-5 text-3xl font-medium">
              {t("renterDashboard.applicationNew.submitted.heading")}
            </h1>
            <p className="text-carbon-500 mt-2">
              {t("renterDashboard.applicationNew.submitted.body", {
                title: property.title,
              })}
            </p>
            <div className="mx-auto mt-7 grid max-w-md grid-cols-2 divide-x divide-black/10 border-y border-black/10 py-4 text-left text-sm">
              <div className="pr-5">
                <p className="text-carbon-500 text-xs">
                  {t(
                    "renterDashboard.applicationNew.submitted.applicationIdLabel",
                  )}
                </p>
                <p className="mt-1 font-medium">{applicationId}</p>
              </div>
              <div className="pl-5">
                <p className="text-carbon-500 text-xs">
                  {t("renterDashboard.applicationNew.submitted.statusLabel")}
                </p>
                <p className="mt-1 font-medium">
                  {t("renterDashboard.applicationNew.submitted.statusValue")}
                </p>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/renter-dashboard/applications"
                className="h-10 rounded-full border border-black/15 px-5 py-2.5 text-sm"
              >
                {t("renterDashboard.applicationNew.applicationsLink")}
              </Link>
              <Link
                href={`/renter-dashboard/messages?property=${encodeURIComponent(property.title)}&propertyId=${encodeURIComponent(property.id)}&ctx=application&status=Submitted&refId=${encodeURIComponent(applicationId)}`}
                className="h-10 rounded-full border border-black/15 px-5 py-2.5 text-sm"
              >
                {t("renterDashboard.applicationNew.submitted.message")}
              </Link>
              <Link
                href={`/renter-dashboard/applications/${applicationId}?property=${encodeURIComponent(property.id)}&title=${encodeURIComponent(property.title)}&location=${encodeURIComponent(property.location)}`}
                className="h-10 rounded-full bg-black px-5 py-2.5 text-sm text-white"
              >
                {t("renterDashboard.applicationNew.submitted.viewApplication")}
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <div className="px-5 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto w-full max-w-[1120px] py-8 lg:py-10">
            <Link
              href="/renter-dashboard/applications"
              className="inline-flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="size-4" />
              {t("renterDashboard.applicationNew.applicationsLink")}
            </Link>
            <div className="mt-6 grid gap-6 lg:grid-cols-[250px_1fr]">
              <aside className="h-fit bg-white p-5">
                <p className="text-carbon-500 text-xs tracking-[0.12em] uppercase">
                  {t("renterDashboard.applicationNew.applyingFor")}
                </p>
                <h1 className="font-bricolage mt-2 text-xl font-medium">
                  {property.title}
                </h1>
                <p className="text-carbon-500 mt-1 text-sm">
                  {property.location}
                </p>
                <div className="mt-6 space-y-1">
                  {stepKeys.map((labelKey, index) => (
                    <button
                      key={labelKey}
                      onClick={() => index <= step && setStep(index)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${index === step ? "bg-black text-white" : "text-carbon-500"}`}
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-[11px] ${index < step ? "bg-black text-white" : "border border-current"}`}
                      >
                        {index < step ? (
                          <Check className="size-3" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
              </aside>
              <form
                ref={formRef}
                onSubmit={(event) => event.preventDefault()}
                className="bg-white p-6 shadow-[0_3px_14px_rgba(0,0,0,0.03)] sm:p-8"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-carbon-500 text-sm">
                      {t("renterDashboard.applicationNew.stepProgress", {
                        current: step + 1,
                        total: stepKeys.length,
                      })}
                    </p>
                    <h2 className="font-bricolage mt-1 text-3xl font-medium">
                      {t(stepKeys[step])}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="h-10 shrink-0 rounded-full border border-black/15 px-4 text-sm"
                  >
                    {t("renterDashboard.applicationNew.saveDraft")}
                  </button>
                </div>
                <div className="mt-5 h-1 bg-black/10">
                  <div
                    className="h-full bg-black transition-all"
                    style={{ width: `${((step + 1) / stepKeys.length) * 100}%` }}
                  />
                </div>
                <div className="mt-8 min-h-[310px]">
                  {step <= 4 ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {fields[step].map((field) => {
                        const { name } = field;
                        const placeholderText = field.placeholderKey
                          ? t(field.placeholderKey)
                          : field.placeholder;
                        return (
                          <label key={name} className="block">
                            <span className="mb-2 block text-sm font-medium">
                              {t(field.labelKey)}{" "}
                              <span className="text-red-600">*</span>
                            </span>
                            {name === "employment" ? (
                              <select
                                required
                                value={values[name] ?? ""}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [name]: event.target.value,
                                  }))
                                }
                                className="application-form-input h-11 w-full border-0 border-b border-black/20 bg-transparent px-1 text-sm outline-none focus:border-black focus:ring-0"
                              >
                                <option value="">
                                  {t(
                                    "renterDashboard.applicationNew.selectPrompts.employment",
                                  )}
                                </option>
                                {employmentOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {t(option.labelKey)}
                                  </option>
                                ))}
                              </select>
                            ) : name === "income" ? (
                              <select
                                required
                                value={values[name] ?? ""}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [name]: event.target.value,
                                  }))
                                }
                                className="application-form-input h-11 w-full border-0 border-b border-black/20 bg-transparent px-1 text-sm outline-none focus:border-black focus:ring-0"
                              >
                                <option value="">
                                  {t(
                                    "renterDashboard.applicationNew.selectPrompts.income",
                                  )}
                                </option>
                                {incomeRanges.map((range, index) => (
                                  <option key={range} value={range}>
                                    {t(
                                      incomeRangeLabels[index].key,
                                      incomeRangeLabels[index].vars,
                                    )}
                                  </option>
                                ))}
                              </select>
                            ) : name === "incomeSource" ? (
                              <select
                                required
                                value={values[name] ?? ""}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [name]: event.target.value,
                                  }))
                                }
                                className="application-form-input h-11 w-full border-0 border-b border-black/20 bg-transparent px-1 text-sm outline-none focus:border-black focus:ring-0"
                              >
                                <option value="">
                                  {t(
                                    "renterDashboard.applicationNew.selectPrompts.incomeSource",
                                  )}
                                </option>
                                {incomeSources.map((source) => (
                                  <option key={source} value={source}>
                                    {t(INCOME_SOURCE_LABEL_KEYS[source])}
                                  </option>
                                ))}
                              </select>
                            ) : name === "rentPayment" ? (
                              <select
                                required
                                value={values[name] ?? ""}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [name]: event.target.value,
                                  }))
                                }
                                className="application-form-input h-11 w-full border-0 border-b border-black/20 bg-transparent px-1 text-sm outline-none focus:border-black focus:ring-0"
                              >
                                <option value="">
                                  {t(
                                    "renterDashboard.applicationNew.selectPrompts.rentPayment",
                                  )}
                                </option>
                                {rentPaymentMethods.map((method) => (
                                  <option key={method} value={method}>
                                    {t(RENT_PAYMENT_LABEL_KEYS[method])}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                required
                                type={
                                  name === "moveIn"
                                    ? "date"
                                    : name === "email"
                                      ? "email"
                                      : name === "occupants"
                                        ? "number"
                                        : "text"
                                }
                                min={
                                  name === "moveIn"
                                    ? "2026-08-15"
                                    : name === "occupants"
                                      ? "1"
                                      : undefined
                                }
                                value={values[name] ?? ""}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [name]: event.target.value,
                                  }))
                                }
                                placeholder={
                                  name === "moveIn" ? undefined : placeholderText
                                }
                                className="application-form-input h-11 w-full border-0 border-b border-black/20 bg-transparent px-1 text-sm outline-none focus:border-black focus:ring-0"
                              />
                            )}
                            {name === "occupants" ? (
                              <span className="text-carbon-500 mt-2 block text-xs leading-5">
                                {t("renterDashboard.applicationNew.occupantsHelp")}
                              </span>
                            ) : null}
                            {name === "coApplicant" ? (
                              <span className="text-carbon-500 mt-2 block text-xs leading-5">
                                {t(
                                  "renterDashboard.applicationNew.coApplicantHelp",
                                )}
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                  {step === 5 ? (
                    <Documents
                      documents={documents}
                      onAdd={(name, file) => {
                        setDocuments((current) =>
                          current.includes(name) ? current : [...current, name],
                        );
                        setDocumentUrls((current) => ({
                          ...current,
                          [name]: URL.createObjectURL(file),
                        }));
                        setDocumentTypes((current) => ({
                          ...current,
                          [name]: file.type,
                        }));
                      }}
                    />
                  ) : null}
                  {step === 6 ? (
                    <Review
                      property={property}
                      values={values}
                      documents={documents}
                      consented={consented}
                      onConsent={setConsented}
                    />
                  ) : null}
                </div>
                <div
                  className={`flex items-center justify-between pt-5 ${step === 6 ? "" : "border-t border-black/10"}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setStep((current) => Math.max(0, current - 1))
                    }
                    disabled={step === 0}
                    className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-sm disabled:opacity-30"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />{" "}
                    {t("renterDashboard.applicationNew.back")}
                  </button>
                  {step < stepKeys.length - 1 ? (
                    <button
                      type="button"
                      onClick={continueForm}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-black px-5 text-sm text-white"
                    >
                      {t("renterDashboard.applicationNew.continue")}{" "}
                      <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!consented}
                      onClick={submitApplication}
                      className="h-10 rounded-full bg-black px-5 text-sm text-white disabled:opacity-35"
                    >
                      {t("renterDashboard.applicationNew.submitApplication")}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        {saved ? (
          <div role="status" className="feedback-toast">
            {t("renterDashboard.applicationNew.draftSavedToast")}
          </div>
        ) : null}
      </main>
    </>
  );
}

function Documents({
  documents,
  onAdd,
}: {
  documents: string[];
  onAdd: (name: string, file: File) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-carbon-500 mb-5 text-sm">
        {t("renterDashboard.applicationNew.documents.requirement")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {applicationDocuments.map((name) => (
          <label
            key={name}
            className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition-colors ${documents.includes(name) ? "border-black bg-black/[0.035]" : "border-black/25 hover:border-black"}`}
          >
            <input
              type="file"
              required={
                name === "Identity document" && !documents.includes(name)
              }
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAdd(name, file);
              }}
            />
            <span
              className={`flex size-10 items-center justify-center rounded-full ${documents.includes(name) ? "bg-black text-white" : "bg-black/[0.06]"}`}
            >
              {documents.includes(name) ? (
                <Check className="size-4" />
              ) : (
                <FileUp className="size-4" />
              )}
            </span>
            <p className="mt-3 text-sm font-medium">
              {t(DOCUMENT_LABEL_KEYS[name])}
            </p>
            <p className="text-carbon-500 mt-1 text-xs">
              {documents.includes(name)
                ? t("renterDashboard.applicationNew.documents.addedClickToReplace")
                : t("renterDashboard.applicationNew.documents.chooseFile")}
            </p>
          </label>
        ))}
      </div>
    </div>
  );
}

function Review({
  property,
  values,
  documents,
  consented,
  onConsent,
}: {
  property: (typeof DEMO_LISTINGS)[number];
  values: Record<string, string>;
  documents: string[];
  consented: boolean;
  onConsent: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ReviewBlock
          title={t("renterDashboard.applicationNew.review.property")}
          rows={[property.title, property.location]}
        />
        <ReviewBlock
          title={t("renterDashboard.applicationNew.review.rentalDetails")}
          rows={[
            t("renterDashboard.applicationNew.review.moveInLabel", {
              value:
                formatDate(values.moveIn) ??
                t("renterDashboard.applicationNew.review.notProvided"),
            }),
            t("renterDashboard.applicationNew.review.leaseLabel", {
              value: values.lease,
            }),
            t("renterDashboard.applicationNew.review.occupantsLabel", {
              value: values.occupants,
            }),
          ]}
        />
        <ReviewBlock
          title={t("renterDashboard.applicationNew.review.applicant")}
          rows={[
            values.fullName,
            values.email,
            values.employment,
            values.incomeSource,
            values.income,
            values.rentPayment,
          ]}
        />
        <ReviewBlock
          title={t("renterDashboard.applicationNew.review.documents")}
          rows={[
            documents.length === 1
              ? t("renterDashboard.applicationNew.review.documentsAttachedOne", {
                  count: documents.length,
                })
              : t(
                  "renterDashboard.applicationNew.review.documentsAttachedOther",
                  { count: documents.length },
                ),
          ]}
          showBorder={false}
        />
      </div>
      <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => onConsent(event.target.checked)}
          className="mt-1 size-4 accent-black"
        />
        <span>{t("renterDashboard.applicationNew.review.consent")}</span>
      </label>
    </div>
  );
}

function ReviewBlock({
  title,
  rows,
  showBorder = true,
}: {
  title: string;
  rows: string[];
  showBorder?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={showBorder ? "border-b border-black/10 pb-5" : "pb-5"}>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="text-carbon-500 mt-2 space-y-1 text-sm leading-6">
        {rows.map((row) => (
          <p key={row || "empty"}>
            {row || t("renterDashboard.applicationNew.review.notProvided")}
          </p>
        ))}
      </div>
    </div>
  );
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
