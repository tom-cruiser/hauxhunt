"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
import Link from "next/link";
import { Check, ChevronLeft, Briefcase, MapPin, BadgeCheck, Home, X, User } from "lucide-react";
import { FlatmateAuthAction } from "@/components/flatmates/flatmate-auth-action";
import { FlatmatePortrait } from "@/components/flatmates/flatmate-portrait";
import { FlatmatesNavigation } from "@/components/flatmates/flatmates-navigation";
import { Footer } from "@/components/layout/footer";
import { formatRwf, type PublicFlatmate } from "@/data/public-flatmates";
import { DEMO_LISTINGS } from "@/data/hero-search-demo";

export function FlatmateDetailClient({
  initialFlatmate,
  id,
  renterView,
}: {
  initialFlatmate: PublicFlatmate;
  id: string;
  renterView: boolean;
}) {
  const [flatmate, setFlatmate] = useState<PublicFlatmate>(initialFlatmate);
  const role = useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem("hauxhunt-authenticated-role"),
    () => (renterView ? "renter" : null),
  );
  const isAuthenticated = renterView || Boolean(role);

  // Storage states for matchmaking
  const [hasInterests, setHasInterests] = useState<string[]>([]);
  const [receivedInterests, setReceivedInterests] = useState<string[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // User details from profile editor
  const [userSituation, setUserSituation] = useState<"looking" | "has-place">("looking");
  const [userBudget, setUserBudget] = useState(450000);
  const [userAreas, setUserAreas] = useState<string[]>(["Kacyiru", "Kimihurura"]);

  // Initialize and sync co-living storage data
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Seed received interests if empty so the prototype works
      const received = window.sessionStorage.getItem("hauxhunt-flatmate-received-interests");
      if (!received) {
        window.sessionStorage.setItem("hauxhunt-flatmate-received-interests", JSON.stringify(["aline", "nadia"]));
      }

      // 2. Read user situation profile details to show combined values
      const savedProfile = window.sessionStorage.getItem("hauxhunt-flatmate-profile-data");
      if (savedProfile) {
        try {
          const data = JSON.parse(savedProfile);
          if (data.situation) setUserSituation(data.situation);
          if (data.budget) setUserBudget(Number(data.budget));
          if (data.areas) setUserAreas(data.areas);
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Sync interests arrays
      const syncInterests = () => {
        const interestsStr = window.sessionStorage.getItem("hauxhunt-flatmate-interests") || "[]";
        const receivedStr = window.sessionStorage.getItem("hauxhunt-flatmate-received-interests") || "[]";
        try {
          const interests = JSON.parse(interestsStr) as string[];
          const rec = JSON.parse(receivedStr) as string[];

          setHasInterests((prev) => {
            const wasLiked = prev.includes(flatmate.id);
            const isLikedNow = interests.includes(flatmate.id);
            const isReciprocal = rec.includes(flatmate.id);
            if (!wasLiked && isLikedNow && isReciprocal) {
              setShowMatchModal(true);
            }
            // Check if we should actually update the reference to prevent infinite loops
            const arraysEqual = prev.length === interests.length && prev.every((val, index) => val === interests[index]);
            return arraysEqual ? prev : interests;
          });

          setReceivedInterests((prev) => {
            const arraysEqual = prev.length === rec.length && prev.every((val, index) => val === rec[index]);
            return arraysEqual ? prev : rec;
          });
        } catch (e) {
          console.error(e);
        }
      };

      syncInterests();
      window.addEventListener("storage", syncInterests);
      return () => window.removeEventListener("storage", syncInterests);
    }
  }, [flatmate.id]);

  useEffect(() => {
    if (id === "julien") {
      const saved = window.sessionStorage.getItem("hauxhunt-flatmate-profile-data");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setFlatmate({
            id: "julien",
            firstName: data.firstName || initialFlatmate.firstName,
            age: Number(data.age) || initialFlatmate.age,
            gender: data.gender || initialFlatmate.gender,
            occupation: data.occupation || initialFlatmate.occupation,
            city: data.city || initialFlatmate.city,
            country: data.country || initialFlatmate.country,
            situation: data.situation || initialFlatmate.situation,
            portrait: data.profileImage || initialFlatmate.portrait,
            budgetMin: Number(data.budget) || initialFlatmate.budgetMin,
            budgetMax: Number(data.budget) || initialFlatmate.budgetMax,
            moveIn: data.moveIn || initialFlatmate.moveIn,
            moveInValue: initialFlatmate.moveInValue,
            areas: data.areas || initialFlatmate.areas,
            lifestyleTags: data.lifestyleTags || initialFlatmate.lifestyleTags,
            smoking: data.lifestyleTags?.includes("Non-smoker") ? "non-smoker" : "outdoor-only",
            lifestyle: initialFlatmate.lifestyle,
            about: data.about || initialFlatmate.about,
            preferredProperty: data.preferredProperty || initialFlatmate.preferredProperty,
            furnishing: data.furnishing || initialFlatmate.furnishing,
            stay: data.stay || initialFlatmate.stay,
            lifestyleDetails: [
              ["Cleanliness", data.cleanliness || "Very tidy"],
              ["Smoking", data.lifestyleTags?.includes("Non-smoker") ? "Non-smoker" : "Outdoor only"],
              ["Pets", data.pets || "Okay with cats"],
              ["Social style", data.socialStyle || "Quiet weekdays, social weekends"],
              ["Sleep schedule", data.sleepSchedule || "Early sleeper"],
              ["Work / study", data.occupation || "Product Designer"],
              ["Guests", data.guests || "Occasional visitors"],
            ],
            lookingFor: data.lookingFor || initialFlatmate.lookingFor,
            selectedRentalId: data.selectedRentalId || initialFlatmate.selectedRentalId,
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [id, initialFlatmate]);

  const looking = flatmate.situation === "looking";

  const arrangement = looking ? null : (flatmate.livingArrangement || (flatmate.selectedRentalId ? (() => {
    const selectedRental = DEMO_LISTINGS.find(item => item.id === flatmate.selectedRentalId);
    if (!selectedRental) return null;
    return {
      area: selectedRental.location,
      flatmatesWanted: 1,
      contribution: flatmate.budgetMin || 300000,
      availableFrom: flatmate.moveIn || "September 2026",
      room: "Private bedroom",
      sharedSpaces: ["Kitchen", "Living room"],
      householdSize: 1,
      furnishing: selectedRental.amenities.includes("Furnished") ? "Furnished" : "Unfurnished",
      householdStyle: ["Clean shared spaces", "Quiet weekday routine"],
    };
  })() : null));

  const displayAbout = isAuthenticated
    ? flatmate.about
    : (flatmate.about.length > 80 ? `${flatmate.about.slice(0, 80)}... (Sign in to view full bio)` : flatmate.about);

  const displayLifestyleDetails = isAuthenticated
    ? flatmate.lifestyleDetails
    : flatmate.lifestyleDetails.filter(([label]) =>
      ["Cleanliness", "Smoking", "Social style"].includes(label)
    );

  const isLiked = hasInterests.includes(flatmate.id);
  const isReciprocal = receivedInterests.includes(flatmate.id);
  const isMatched = isLiked && isReciprocal;

  const handleWithdrawInterest = () => {
    const key = "hauxhunt-flatmate-interests";
    const current = JSON.parse(window.sessionStorage.getItem(key) || "[]");
    const updated = current.filter((id: string) => id !== flatmate.id);
    window.sessionStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <>
      <FlatmatesNavigation initialRenterView={renterView} />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="px-5 pt-8 pb-14 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1280px]">
            <Link
              href={renterView ? "/flatmates?from=renter" : "/flatmates"}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-black/65 transition-colors hover:text-black font-semibold"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Back to Flatmates
            </Link>

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,480px)_1fr] max-w-[1280px]">
              <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] h-[260px] lg:h-full lg:min-h-[320px]">
                <FlatmatePortrait
                  src={flatmate.portrait}
                  name={flatmate.firstName}
                  priority
                />
              </div>

              <div className="flex flex-col justify-center rounded-3xl border border-black/5 bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] p-6 sm:p-7 lg:p-8">
                <h1 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl flex items-center gap-2">
                  <span>{flatmate.firstName}, {flatmate.age}</span>
                  <BadgeCheck className="size-7 text-[#242424] fill-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.06)]" />
                </h1>

                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-6 text-sm text-carbon-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="size-4 text-carbon-450 shrink-0" />
                    {flatmate.occupation}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-carbon-450 shrink-0" />
                    {flatmate.city}, {flatmate.country}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-1.5">
                  {flatmate.lifestyleTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-black/5 bg-black/[0.04] px-2.5 py-0.5 text-xs font-medium text-black/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="mt-6 text-neutral-600 text-sm leading-relaxed max-w-xl">
                  {displayAbout}
                </p>

                {!isMatched && !isLiked && (
                  <FlatmateAuthAction
                    label="I'm Interested"
                    returnTo={`/flatmates/${flatmate.id}${renterView ? "?from=renter" : ""}`}
                    flatmateName={flatmate.firstName}
                    flatmateId={flatmate.id}
                    className="font-bricolage mt-7 h-12 w-fit rounded-full bg-black px-7 font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg active:scale-95"
                  />
                )}
                {isLiked && !isMatched && (
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                      disabled
                      className="font-bricolage h-12 w-fit rounded-full bg-neutral-100 px-7 font-medium text-neutral-500 cursor-not-allowed"
                    >
                      Waiting for response
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawInterest}
                      className="font-bricolage h-12 w-fit rounded-full border border-red-200 bg-red-50/50 text-red-650 px-6 font-semibold hover:bg-red-50 active:scale-95 transition-all text-sm"
                    >
                      Withdraw Interest
                    </button>
                  </div>
                )}
                {isMatched && (
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href={`/renter-dashboard/messages?chat=${flatmate.id}`}
                      className="font-bricolage flex h-12 items-center justify-center rounded-full bg-black px-7 font-medium text-white transition-all hover:bg-neutral-800 hover:shadow-lg active:scale-95"
                    >
                      Message
                    </Link>
                    {looking && userSituation === "looking" ? (
                      <button
                        onClick={() => setShowMatchModal(true)}
                        className="font-bricolage flex h-12 items-center justify-center rounded-full border border-black/20 bg-white px-7 font-medium text-black hover:bg-neutral-50 transition-all active:scale-95"
                      >
                        Browse Homes Together
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowMatchModal(true)}
                        className="font-bricolage flex h-12 items-center justify-center rounded-full border border-black/20 bg-white px-7 font-medium text-black hover:bg-neutral-50 transition-all active:scale-95"
                      >
                        Discuss Living Arrangement
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isAuthenticated && (
                <ProfileSection title="Lifestyle">
                  <dl className="grid gap-5 sm:grid-cols-2">
                    {displayLifestyleDetails.map(([label, value]) => (
                      <Detail key={label} label={label} value={value} />
                    ))}
                  </dl>
                </ProfileSection>
              )}
            </div>

            {isAuthenticated ? (
              <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  {looking ? (
                    <ProfileSection title="Housing Plans">
                      <dl className="grid gap-5 sm:grid-cols-2">
                        <Detail
                          label="Preferred areas"
                          value={flatmate.areas.join(" · ") || "None specified"}
                          wide
                        />
                        <Detail
                          label="Personal monthly budget contribution"
                          value={formatRwf(flatmate.budgetMin)}
                        />
                        <Detail label="Move-in" value={flatmate.moveIn} />
                        {isAuthenticated && (
                          <>
                            <Detail
                              label="Preferred property"
                              value={flatmate.preferredProperty}
                            />
                            <Detail label="Furnishing" value={flatmate.furnishing} />
                            <Detail label="Stay" value={flatmate.stay} />
                          </>
                        )}
                      </dl>
                      <p className="text-carbon-500 mt-6 border-t border-black/10 pt-5 text-xs leading-5">
                        This is {flatmate.firstName}&apos;s personal budget
                        contribution, not the total rent for a property.
                      </p>
                    </ProfileSection>
                  ) : arrangement ? (
                    <ProfileSection title="Current Living Arrangement">
                      <p className="text-carbon-600 mb-6 text-sm leading-relaxed">
                        {flatmate.firstName} currently has accommodation in{" "}
                        <span className="font-semibold text-black">{arrangement.area}</span>.
                      </p>
                      <dl className="grid gap-5 sm:grid-cols-2">
                        <Detail
                          label="Area / neighbourhood"
                          value={arrangement.area}
                        />
                        <Detail
                          label="Expected contribution"
                          value={`Around ${formatRwf(arrangement.contribution)} / month`}
                        />
                        <Detail
                          label="Looking for"
                          value={`${arrangement.flatmatesWanted} flatmate`}
                        />
                        <Detail
                          label="Available from"
                          value={arrangement.availableFrom}
                        />
                        {isAuthenticated && (
                          <>
                            <Detail
                              label="Room"
                              value={arrangement.room}
                            />
                            <Detail
                              label="Current household"
                              value={`${arrangement.householdSize} person`}
                            />
                            <Detail
                              label="Shared spaces"
                              value={arrangement.sharedSpaces.join(" · ")}
                            />
                            <Detail
                              label="Furnishing"
                              value={arrangement.furnishing}
                            />
                            <Detail
                              label="Household style"
                              value={arrangement.householdStyle.join(" · ")}
                              wide
                            />
                          </>
                        )}
                      </dl>
                      <p className="text-carbon-505 mt-6 border-t border-black/10 pt-5 text-[11px] text-neutral-450 leading-relaxed font-normal">
                        Living-arrangement information is provided by this member and does not represent a RentUp property listing.
                      </p>
                    </ProfileSection>
                  ) : null}

                </div>

                <aside className="space-y-6">
                  <ProfileSection title="What I'm Looking For">
                    <ul className="space-y-4">
                      {flatmate.lookingFor.map((item) => (
                        <li key={item} className="flex items-start gap-3.5 text-sm leading-relaxed text-black/75">
                          <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-white">
                            <Check className="size-3 stroke-[3]" />
                          </div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </ProfileSection>

                  <section className="rounded-3xl bg-neutral-950 p-7 text-white sm:p-8 border border-neutral-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 size-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                    <h2 className="font-bricolage text-2xl font-semibold tracking-tight relative z-10">
                      Connect when you&apos;re ready
                    </h2>
                    <p className="mt-3.5 text-sm leading-6 text-neutral-400 relative z-10">
                      {isAuthenticated
                        ? (isMatched
                          ? `You and ${flatmate.firstName} are mutually interested! You can now start messaging to decide everything.`
                          : (isLiked
                            ? `You've expressed interest. Waiting for ${flatmate.firstName} to respond.`
                            : `Let ${flatmate.firstName} know you're interested in sharing a home to see if you would be a great match to live together.`))
                        : "Sign in to express interest, view details, and connect if the interest is mutual."}
                    </p>
                    {!isMatched && !isLiked && (
                      <FlatmateAuthAction
                        label="I'm Interested"
                        returnTo={`/flatmates/${flatmate.id}`}
                        flatmateName={flatmate.firstName}
                        flatmateId={flatmate.id}
                        className="font-bricolage mt-6 h-11 w-full rounded-full bg-white px-6 font-semibold text-black hover:bg-neutral-100 transition-all active:scale-95 relative z-10 shadow-md"
                      />
                    )}
                    {isLiked && !isMatched && (
                      <div className="mt-6 flex flex-col gap-2.5 relative z-10">
                        <button
                          disabled
                          className="font-bricolage h-11 w-full rounded-full bg-neutral-800 px-6 font-semibold text-neutral-400 cursor-not-allowed"
                        >
                          Waiting for response
                        </button>
                        <button
                          type="button"
                          onClick={handleWithdrawInterest}
                          className="font-bricolage h-11 w-full rounded-full border border-red-200 bg-red-50/50 text-red-650 px-6 font-semibold hover:bg-red-55 active:scale-95 transition-all text-sm"
                        >
                          Withdraw Interest
                        </button>
                      </div>
                    )}
                    {isMatched && (
                      <div className="mt-6 flex flex-col gap-3 relative z-10">
                        <Link
                          href={`/renter-dashboard/messages?chat=${flatmate.id}`}
                          className="font-bricolage flex h-11 w-full items-center justify-center rounded-full bg-white px-6 font-semibold text-black hover:bg-neutral-100 transition-all active:scale-95 shadow-md"
                        >
                          Message
                        </Link>
                        {looking && userSituation === "looking" ? (
                          <button
                            onClick={() => setShowMatchModal(true)}
                            className="font-bricolage flex h-11 w-full items-center justify-center rounded-full border border-white/20 bg-neutral-900 px-6 font-semibold text-white hover:bg-neutral-850 transition-all active:scale-95"
                          >
                            Browse Homes Together
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowMatchModal(true)}
                            className="font-bricolage flex h-11 w-full items-center justify-center rounded-full border border-white/20 bg-neutral-900 px-6 font-semibold text-white hover:bg-neutral-850 transition-all active:scale-95"
                          >
                            Discuss Living Arrangement
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            ) : (
              <div className="mt-7 rounded-3xl border border-black/5 bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] p-8 text-center max-w-xl mx-auto flex flex-col items-center">
                <div className="size-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200 shadow-inner">
                  <User className="size-7" />
                </div>
                <h3 className="font-bricolage text-2xl font-bold tracking-tight text-neutral-950 mt-5">
                  Unlock Full Roommate Details
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-500 max-w-[40ch]">
                  Sign in or create an account to view {flatmate.firstName}&apos;s routines, stay details, housing preferences, and connect.
                </p>
                <FlatmateAuthAction
                  label="Sign In to View Profile"
                  returnTo={`/flatmates/${flatmate.id}`}
                  flatmateName={flatmate.firstName}
                  className="font-bricolage mt-6 h-11 rounded-full bg-black px-7 font-semibold text-white hover:bg-neutral-800 transition-all active:scale-95 shadow-md"
                />
              </div>
            )}
          </div>
        </section>
      </main>
      {renterView ? null : <Footer />}

      {showMatchModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-5">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.3)] p-8">
            <button
              type="button"
              onClick={() => setShowMatchModal(false)}
              aria-label="Close"
              className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 bg-white transition-colors hover:bg-neutral-50"
            >
              <X className="size-4" />
            </button>

            <span className="text-[10px] tracking-[0.15em] font-extrabold text-neutral-400 uppercase block">
              Co-living Connection
            </span>
            <h2 className="font-bricolage text-3xl font-bold tracking-tight text-neutral-900 mt-2">
              You&apos;re a Match!
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed text-neutral-600">
              You and {flatmate.firstName} are both interested in exploring living together.
            </p>

            <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-100 p-5 space-y-4">
              {looking && userSituation === "looking" ? (
                <>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-450 block">
                      Preferred Areas Overlap
                    </span>
                    <span className="text-sm font-semibold text-neutral-800 mt-1 block">
                      {userAreas.filter(a => flatmate.areas.includes(a)).join(" · ") || `${userAreas[0] || "Kacyiru"} · ${flatmate.areas[0] || "Kimihurura"}`}
                    </span>
                  </div>
                  <div className="border-t border-neutral-100 pt-3">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-450 block">
                      Potential Combined Budget
                    </span>
                    <span className="font-bricolage text-xl font-extrabold text-black mt-1 block">
                      {formatRwf(userBudget + flatmate.budgetMax)} / month
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal block mt-0.5">
                      Combined discovery estimate (RWF {userBudget.toLocaleString()} + RWF {flatmate.budgetMax.toLocaleString()})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-450 block">
                      Living Arrangement Area
                    </span>
                    <span className="text-sm font-semibold text-neutral-800 mt-1 block">
                      {arrangement?.area || flatmate.city}
                    </span>
                  </div>
                  <div className="border-t border-neutral-100 pt-3">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-450 block">
                      Expected Monthly Share
                    </span>
                    <span className="font-bricolage text-xl font-extrabold text-black mt-1 block">
                      {arrangement ? formatRwf(arrangement.contribution) : formatRwf(flatmate.budgetMin)} / month
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={`/renter-dashboard/messages?chat=${flatmate.id}`}
                onClick={() => setShowMatchModal(false)}
                className="flex h-12 items-center justify-center rounded-full bg-black font-semibold text-white hover:bg-neutral-800 active:scale-95 transition-all shadow-md"
              >
                Start Chat
              </Link>
              {looking && userSituation === "looking" ? (
                <Link
                  href={`/flatmates?from=renter&view=all&budget=450-600&location=${flatmate.areas[0] || ""}`}
                  onClick={() => setShowMatchModal(false)}
                  className="flex h-12 items-center justify-center rounded-full border border-black/15 bg-white font-semibold text-black hover:bg-neutral-50 active:scale-95 transition-all"
                >
                  Browse Homes Together
                </Link>
              ) : (
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="flex h-12 items-center justify-center rounded-full border border-black/15 bg-white font-semibold text-black hover:bg-neutral-50 active:scale-95 transition-all"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-white/70 backdrop-blur-xl sm:p-8">
      <h2 className="font-bricolage mb-6 text-2xl font-semibold tracking-tight text-black/85">{title}</h2>
      {children}
    </section>
  );
}
function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`pb-3 border-b border-black/5 transition-all ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-neutral-400 text-[10px] font-normal uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm font-normal text-black/80 leading-relaxed">{value}</dd>
    </div>
  );
}
