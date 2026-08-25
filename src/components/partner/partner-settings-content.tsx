"use client";

import Image from "next/image";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";

import { PartnerDetailsFields } from "@/components/partner/partner-details-fields";
import { SaveSettingsButton } from "@/components/partner/save-settings-button";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { StatusPill } from "@/components/owner/status-pill";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import julienProfile from "@/assets/images/julien.jpg";

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
