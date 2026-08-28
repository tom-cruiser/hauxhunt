"use client";

import Image from "next/image";
import { Bell, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useReducer } from "react";

import { PartnerDetailsFields } from "@/components/partner/partner-details-fields";
import { SaveSettingsButton } from "@/components/partner/save-settings-button";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { StatusPill } from "@/components/owner/status-pill";
import { useDemoProfessional, useMounted } from "@/components/partner/use-demo-professional";
import julienProfile from "@/assets/images/julien.jpg";
import { PlanToggleCard } from "@/components/tier/plan-toggle-card";
import { LockedFeature } from "@/components/tier/locked-feature";
import {
  DEFAULT_PAYOUT_DETAILS,
  PayoutDetailsForm,
  type PayoutDetails,
} from "@/components/tier/payout-details-form";
import { isPaidTier, useTier } from "@/hooks/use-tier";

// Agent and Property Manager get identical tier rules (the free/paid matrix
// is silent on Property Manager, so it follows Agent's rules rather than
// staying ungated) -- everything below is shared by both roles.
const PARTNER_PLAN_FEATURES = [
  { label: "Verified listing badge", free: "Locked", paid: "Included" },
  { label: "Number of listings", free: "Unlimited", paid: "Unlimited" },
  { label: "Viewing fee collection", free: "Off-platform", paid: "In-app bank attachment" },
  { label: "In-app rent collection", free: "Off-platform", paid: "Included" },
  { label: "Property boost", free: "Locked", paid: "Included" },
  { label: "WhatsApp alerts", free: "Locked", paid: "Included" },
] as const;

const PAYOUT_KEY = "hauxhunt-partner-payout-details";

function readPayoutDetails(): PayoutDetails {
  if (typeof window === "undefined") return DEFAULT_PAYOUT_DETAILS;
  try {
    const raw = window.sessionStorage.getItem(PAYOUT_KEY);
    return raw
      ? { ...DEFAULT_PAYOUT_DETAILS, ...(JSON.parse(raw) as Partial<PayoutDetails>) }
      : DEFAULT_PAYOUT_DETAILS;
  } catch {
    return DEFAULT_PAYOUT_DETAILS;
  }
}
function writePayoutDetails(details: PayoutDetails) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PAYOUT_KEY, JSON.stringify(details));
  } catch {
    // Storage full/unavailable -- change still applies for this render.
  }
}

const WHATSAPP_KEY = "hauxhunt-partner-whatsapp-alerts";
function readWhatsappEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(WHATSAPP_KEY) === "true";
}
function writeWhatsappEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(WHATSAPP_KEY, String(enabled));
}

// Agent Dashboard Redesign phase -- Section 47/48. A light, in-scope
// improvement: the top card becomes a real Professional Profile for the
// Agent persona (photo, display name, role, location, verification state)
// sourced from the same useDemoProfessional("agent") used everywhere
// else, instead of the generic placeholder photo. Property Manager's card
// is untouched. The rest of the form (PartnerDetailsFields,
// SaveSettingsButton, Verification card) is shared and unmodified -- no
// payment methods added, since no commission model exists for Agents.
export function PartnerSettingsContent() {
  const role = usePartnerRole();
  const isAgent = role === "agent";
  // Hook called unconditionally every render (Rules of Hooks) -- only the
  // result is picked conditionally.
  const agentIdentity = useDemoProfessional("agent");
  const professional = isAgent ? agentIdentity : undefined;

  const tier = useTier();
  const mounted = useMounted();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const payoutDetails = mounted ? readPayoutDetails() : DEFAULT_PAYOUT_DETAILS;
  const whatsappEnabled = mounted ? readWhatsappEnabled() : false;

  function savePayoutDetails(next: PayoutDetails) {
    writePayoutDetails(next);
    forceUpdate();
  }

  function toggleWhatsapp() {
    writeWhatsappEnabled(!whatsappEnabled);
    forceUpdate();
  }

  return (
    <form className="mt-8 space-y-6">
      {isAgent && professional ? (
        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {professional.avatar ? (
                <Image src={professional.avatar} alt="" className="size-16 rounded-full object-cover shadow-[0_5px_18px_rgba(0,0,0,0.15)]" />
              ) : (
                <span className="font-bricolage flex size-16 items-center justify-center rounded-full bg-black text-xl font-medium text-white">{professional.name.charAt(0)}</span>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bricolage text-carbon-900 text-xl font-medium">{professional.name}</h2>
                  {professional.verified ? <StatusPill status="Verified" /> : null}
                </div>
                <p className="text-carbon-500 mt-1 text-sm">
                  Agent · {professional.location}
                </p>
              </div>
            </div>
            <button type="button" className="font-bricolage h-10 rounded-full bg-black px-5 text-sm font-medium text-white">
              Change photo
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image src={julienProfile} alt="" className="size-16 rounded-full object-cover shadow-[0_5px_18px_rgba(0,0,0,0.15)]" />
              <div>
                <h2 className="font-bricolage text-carbon-900 text-xl font-medium">Profile photo</h2>
                <p className="text-carbon-500 mt-1 text-sm">Displayed to property seekers and applicants.</p>
              </div>
            </div>
            <button type="button" className="font-bricolage h-10 rounded-full bg-black px-5 text-sm font-medium text-white">
              Change photo
            </button>
          </div>
        </section>
      )}

      <SettingsCard icon={Building2} title="Personal and business details" description="These details are reused when you create a property listing.">
        <PartnerDetailsFields />
      </SettingsCard>

      {/* Final Presentation Readiness Cleanup -- previously implied a
          clickable "one remaining step" with no actual completion flow
          anywhere in the product. Reworded to an honest, passive pending
          state: nothing here is being withheld from the professional, it's
          waiting on HauxHunt. No documents, review timeline, or approval
          action are invented -- see the final audit's Admin Boundary. */}
      <SettingsCard icon={ShieldCheck} title="Verification" description="Verification builds trust and unlocks listing publication.">
        <div className="flex items-center gap-3 rounded-2xl bg-black/[0.035] p-4">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          <div className="flex-1">
            <p className="font-medium">Contact details confirmed</p>
            <p className="text-carbon-500 mt-0.5 text-sm">Your remaining verification step is being reviewed by HauxHunt.</p>
          </div>
          <span className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">In progress</span>
        </div>
      </SettingsCard>

      <SettingsCard icon={Building2} title="Bank attachment" description="For collecting viewing fees directly in-app instead of off-platform.">
        {isPaidTier(tier) ? (
          <PayoutDetailsForm details={payoutDetails} onSave={savePayoutDetails} />
        ) : (
          <LockedFeature feature="agent.bankAttachment" variant="row" />
        )}
      </SettingsCard>

      <SettingsCard icon={Bell} title="Notifications" description="Choose how HauxHunt reaches you.">
        {isPaidTier(tier) ? (
          <label className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">WhatsApp alerts</p>
              <p className="text-carbon-500 mt-0.5 text-xs">
                Enquiry, viewing, and application alerts on WhatsApp.
              </p>
            </div>
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={toggleWhatsapp}
              className="size-4 shrink-0 accent-black"
              aria-label="WhatsApp alerts"
            />
          </label>
        ) : (
          <LockedFeature
            feature="agent.whatsappAlerts"
            label="WhatsApp alerts"
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-black/10 p-3.5 text-left transition-colors hover:bg-black/[0.02]"
          />
        )}
      </SettingsCard>

      <PlanToggleCard features={PARTNER_PLAN_FEATURES} />

      <div className="flex justify-end">
        <SaveSettingsButton />
      </div>
    </form>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)] sm:p-8">
      <div className="mb-7 flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-bricolage text-carbon-900 text-xl font-medium">{title}</h2>
          <p className="text-carbon-500 mt-1 text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
