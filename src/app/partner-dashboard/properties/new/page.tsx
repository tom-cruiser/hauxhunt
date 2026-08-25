"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { BadgeCheck, Building2, ChevronLeft, FileText, Upload, UserRound } from "lucide-react";

import applicationReceivedIllustration from "@/assets/images/application-received.png";
import { DashboardShell } from "@/components/partner/dashboard-shell";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { submitIndependentProperty } from "@/lib/professional-properties";

// Phase 3 -- the Independent Property Representation intake flow (Sections
// 7-20 of the phase brief). This is deliberately NOT the existing
// ListPropertyForm (list-property-form.tsx) -- that flow creates a public
// LISTING (pricing, photos, publish) and has no notion of an off-platform
// Property Owner or an authorization review; conflating the two would
// misrepresent what's actually happening here. Team-assigned properties are
// never added through this flow -- they already appear automatically once
// assigned (see the guidance note below).

const PROPERTY_TYPES = ["Apartment", "House", "Studio", "Townhouse", "Villa"];
const COMMON_AMENITIES = ["Furnished", "Parking", "Backup power", "Water tank", "Security", "Garden", "Wi-Fi", "Balcony"];

type Step = "details" | "owner" | "authorization" | "review" | "success";

export default function AddPropertyPage() {
  const partnerRole = usePartnerRole();
  const role = partnerRole === "agent" ? "agent" : "property_manager";
  const roleLabel = role === "agent" ? "Agent" : "Property Manager";
  const professional = useDemoProfessional(role);

  const [step, setStep] = useState<Step>("details");

  // Step 1 -- Property Details
  const [title, setTitle] = useState("");
  const [type, setType] = useState(PROPERTY_TYPES[0]);
  const [location, setLocation] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");
  const [units, setUnits] = useState("");
  const [size, setSize] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);

  // Step 2 -- Property Owner
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Step 3 -- Authorization
  const [proofName, setProofName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<{ propertyId: string } | null>(null);

  if (!professional) {
    return (
      <DashboardShell initialSection="properties">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const detailsValid = title.trim() && location.trim() && Number(bedrooms) > 0 && Number(bathrooms) > 0 && Number(size) > 0;
  const ownerValid = ownerName.trim() && ownerPhone.trim();
  const authorizationValid = proofName && confirmed;

  function submit() {
    if (!professional) return;
    const { propertyId } = submitIndependentProperty({
      professionalId: professional.id,
      professionalRole: role,
      title: title.trim(),
      location: location.trim(),
      type,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      units: units.trim() ? Number(units) : null,
      size: Number(size),
      furnished,
      amenities,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim() || undefined,
      proofDocumentName: proofName ?? "Authorization document",
    });
    setResult({ propertyId });
    setStep("success");
  }

  if (step === "success" && result) {
    return (
      <DashboardShell initialSection="properties">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <div className="mx-auto max-w-140">
            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.12)]">
              <div className="relative flex h-48 items-center justify-center bg-black/4.5 px-8 pt-3">
                <Image src={applicationReceivedIllustration} alt="" className="h-full w-auto object-contain" />
              </div>
              <div className="p-7 sm:p-9">
                <h1 className="font-bricolage text-2xl leading-tight font-medium tracking-tight">Authorization Submitted</h1>
                <p className="text-carbon-600 mt-3 text-sm leading-6">We&apos;re reviewing your authorization to represent {title}.</p>
                <p className="text-carbon-600 mt-2 text-sm leading-6">You can continue preparing the property information while authorization is under review.</p>
                <p className="text-carbon-600 mt-2 text-sm leading-6">
                  {title} cannot be publicly {role === "agent" ? "represented" : "listed"} through your professional account until authorization is approved.
                </p>
                <div className="mt-7 flex flex-wrap justify-end gap-2">
                  <Link href="/partner-dashboard/properties" className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
                    Back to Properties
                  </Link>
                  <Link href={`/partner-dashboard/properties/${result.propertyId}`} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                    View Property
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </DashboardShell>
    );
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: "details", label: "Property Details" },
    { key: "owner", label: "Property Owner" },
    { key: "authorization", label: "Your Authorization" },
    { key: "review", label: "Review" },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <DashboardShell initialSection="properties">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-180">
          <Link href="/partner-dashboard/properties" className="text-carbon-500 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
            <ChevronLeft className="size-4" />
            {role === "agent" ? "My Properties" : "Managed Properties"}
          </Link>

          <header className="mt-4 border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Add a Property</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7">
              {role === "agent" ? "Add a property you're authorized to represent on HauxHunt." : "Add a property you're authorized to manage on HauxHunt."}
            </p>
          </header>

          {step === "details" ? (
            <div className="mt-6 rounded-2xl bg-black/3 p-5">
              <p className="text-sm font-medium">Was this property assigned to you through a HauxHunt Team?</p>
              <p className="text-carbon-600 mt-1.5 text-sm leading-6">Team-assigned properties automatically appear in your {role === "agent" ? "assigned" : "managed"} properties and don&apos;t need to be added again.</p>
              <Link href="/partner-dashboard/properties?filter=team" className="mt-2 inline-block text-sm font-medium underline underline-offset-4">
                View Assigned Properties
              </Link>
            </div>
          ) : null}

          <div className="mt-7 flex items-center gap-3 rounded-2xl bg-black/3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
              {role === "agent" ? <UserRound aria-hidden="true" className="size-4" /> : <Building2 aria-hidden="true" className="size-4" />}
            </span>
            <p className="text-sm leading-5">
              <span className="font-medium">Your role: {roleLabel}.</span>{" "}
              <span className="text-carbon-600">
                You are adding this property as an authorized {role === "agent" ? "representative" : "manager"} of the property owner.
              </span>
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`h-8 rounded-full px-3 text-xs font-medium leading-8 ${i === stepIndex ? "bg-black text-white" : i < stepIndex ? "bg-black/8 text-black/70" : "bg-black/4.5 text-black/40"}`}
              >
                {i + 1}. {s.label}
              </span>
            ))}
          </div>

          <div className="mt-7">
            {step === "details" ? (
              <fieldset>
                <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Property Details</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Property name / title" required className="sm:col-span-2">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Remera House" className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Property type">
                    <select value={type} onChange={(e) => setType(e.target.value)} className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black">
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Address / neighborhood" required>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remera, Kigali" className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Bedrooms" required>
                    <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Bathrooms" required>
                    <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Units (if applicable)">
                    <input type="number" min={0} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g. 12" className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Size (m²)" required>
                    <input type="number" min={0} value={size} onChange={(e) => setSize(e.target.value)} className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                </div>
                <label className="mt-4 flex w-fit cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} className="size-4 accent-black" />
                  <span className="text-sm font-medium">Furnished</span>
                </label>
                <div className="mt-5">
                  <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Amenities</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {COMMON_AMENITIES.map((a) => {
                      const checked = amenities.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAmenities((cur) => (checked ? cur.filter((x) => x !== a) : [...cur, a]))}
                          className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${checked ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-7 flex justify-end">
                  <button type="button" disabled={!detailsValid} onClick={() => setStep("owner")} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30">
                    Continue
                  </button>
                </div>
              </fieldset>
            ) : null}

            {step === "owner" ? (
              <fieldset>
                <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Property Owner</legend>
                <p className="text-carbon-600 mt-2 text-sm leading-6">Tell us who owns this property.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Owner full name" required>
                    <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. John Doe" className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Phone number" required>
                    <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+250 ..." className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                  <Field label="Email address" className="sm:col-span-2">
                    <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@example.com" className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black" />
                  </Field>
                </div>
                <p className="text-carbon-500 mt-4 text-xs leading-5">
                  HauxHunt account: <span className="font-medium">Not connected.</span> This Owner isn&apos;t required to register or verify anything on HauxHunt for you to submit this authorization.
                </p>
                <div className="mt-7 flex justify-between">
                  <button type="button" onClick={() => setStep("details")} className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
                    Back
                  </button>
                  <button type="button" disabled={!ownerValid} onClick={() => setStep("authorization")} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30">
                    Continue
                  </button>
                </div>
              </fieldset>
            ) : null}

            {step === "authorization" ? (
              <fieldset>
                <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Your Authorization</legend>
                <p className="text-carbon-600 mt-2 text-sm leading-6">
                  {role === "agent"
                    ? "Provide evidence that you're authorized to represent this property on behalf of the Owner."
                    : "Provide evidence that you're authorized to manage this property on behalf of the Owner."}
                </p>

                <div className="mt-5">
                  <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Proof of Authorization</p>
                  <p className="text-carbon-600 mt-1.5 text-sm leading-6">
                    Upload a document showing that the property owner has authorized you to {role === "agent" ? "represent" : "manage"} this property. Accepted proof may include documents such as an authorization letter or other evidence accepted by HauxHunt.
                  </p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setProofName(e.target.files?.[0]?.name ?? null)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-bricolage mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                  >
                    <Upload aria-hidden="true" className="size-4" />
                    Upload Document
                  </button>
                  {proofName ? (
                    <p className="text-carbon-600 mt-3 flex items-center gap-2 text-sm">
                      <FileText aria-hidden="true" className="size-4" />
                      {proofName}
                    </p>
                  ) : null}
                </div>

                <label className="mt-6 flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-black" />
                  <span className="text-sm leading-6">I confirm that I have permission from the property owner to {role === "agent" ? "represent" : "manage"} this property on HauxHunt.</span>
                </label>

                <div className="mt-7 flex justify-between">
                  <button type="button" onClick={() => setStep("owner")} className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
                    Back
                  </button>
                  <button type="button" disabled={!authorizationValid} onClick={() => setStep("review")} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30">
                    Continue
                  </button>
                </div>
              </fieldset>
            ) : null}

            {step === "review" ? (
              <div>
                <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Review Property &amp; Authorization</legend>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Property</p>
                    <p className="mt-2 font-medium">{title}</p>
                    <p className="text-carbon-500 text-sm">{location}</p>
                    <p className="text-carbon-500 mt-1 text-sm">
                      {type} · {bedrooms} bed · {bathrooms} bath{units ? ` · ${units} units` : ""} · {size} m²{furnished ? " · Furnished" : ""}
                    </p>
                  </div>
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Property Owner</p>
                    <p className="mt-2 font-medium">{ownerName}</p>
                    <p className="text-carbon-500 text-sm">{ownerPhone}</p>
                  </div>
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Your Role</p>
                    <p className="mt-2 flex items-center gap-1.5 font-medium">
                      {professional.name}
                      {professional.verified ? <BadgeCheck aria-label="Verified" className="size-4 fill-black text-white" /> : null}
                    </p>
                    <p className="text-carbon-500 text-sm">{roleLabel}</p>
                  </div>
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Authority</p>
                    <p className="mt-2 font-medium">Independent Owner Authorization</p>
                  </div>
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Proof</p>
                    <p className="mt-2 flex items-center gap-2 font-medium">
                      <FileText aria-hidden="true" className="size-4 shrink-0" />
                      {proofName}
                    </p>
                  </div>
                </div>
                <div className="mt-7 flex justify-between">
                  <button type="button" onClick={() => setStep("authorization")} className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
                    Back
                  </button>
                  <button type="button" onClick={submit} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                    Submit for Review
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-carbon-600 text-xs font-medium">
        {label}
        {required ? <span className="text-carbon-400"> *</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
