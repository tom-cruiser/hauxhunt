"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, MessageSquare, X, Info, HelpCircle } from "lucide-react";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import {
  PUBLIC_FLATMATES,
  type PublicFlatmate,
  formatRwf,
} from "@/data/public-flatmates";
import emptyImage from "@/assets/images/empty.png";
import matchImage from "@/assets/images/match.png";

export default function RenterFlatmateMatchesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"matches" | "received" | "sent">(
    "matches",
  );
  const [interests, setInterests] = useState<string[]>([]);
  const [received, setReceived] = useState<string[]>([]);
  const [notForMe, setNotForMe] = useState<string[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [modalFlatmate, setModalFlatmate] = useState<PublicFlatmate | null>(
    null,
  );

  // User details from profile editor
  const [userSituation, setUserSituation] = useState<"looking" | "has-place">(
    "looking",
  );
  const [userBudget, setUserBudget] = useState(450000);
  const [userAreas, setUserAreas] = useState<string[]>([
    "Kacyiru",
    "Kimihurura",
  ]);

  // Load and sync states
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Seed default incoming interests if not present
      const savedReceived = window.sessionStorage.getItem(
        "hauxhunt-flatmate-received-interests",
      );
      if (!savedReceived) {
        window.sessionStorage.setItem(
          "hauxhunt-flatmate-received-interests",
          JSON.stringify(["aline", "nadia"]),
        );
      }

      // Handle notification deep-link: ?tab=matches&highlight=aline
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const highlight = params.get("highlight");
      if (tabParam === "matches") setActiveTab("matches");
      if (highlight) {
        // Ensure the highlighted person is a mutual match by seeding both sides
        const iStr =
          window.sessionStorage.getItem("hauxhunt-flatmate-interests") || "[]";
        const rStr =
          window.sessionStorage.getItem(
            "hauxhunt-flatmate-received-interests",
          ) || "[]";
        try {
          const iIds: string[] = JSON.parse(iStr);
          const rIds: string[] = JSON.parse(rStr);
          let changed = false;
          if (!iIds.includes(highlight)) {
            iIds.push(highlight);
            changed = true;
          }
          if (!rIds.includes(highlight)) {
            rIds.push(highlight);
            changed = true;
          }
          if (changed) {
            window.sessionStorage.setItem(
              "hauxhunt-flatmate-interests",
              JSON.stringify(iIds),
            );
            window.sessionStorage.setItem(
              "hauxhunt-flatmate-received-interests",
              JSON.stringify(rIds),
            );
          }
        } catch {}
      }

      // Load user profile properties
      const savedProfile = window.sessionStorage.getItem(
        "hauxhunt-flatmate-profile-data",
      );
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

      const sync = () => {
        const iStr =
          window.sessionStorage.getItem("hauxhunt-flatmate-interests") || "[]";
        const rStr =
          window.sessionStorage.getItem(
            "hauxhunt-flatmate-received-interests",
          ) || "[]";
        const nStr =
          window.sessionStorage.getItem("hauxhunt-flatmate-not-for-me") || "[]";
        try {
          setInterests(JSON.parse(iStr));
          setReceived(JSON.parse(rStr));
          setNotForMe(JSON.parse(nStr));
        } catch (e) {
          console.error(e);
        }
      };

      sync();
      window.addEventListener("storage", sync);
      return () => window.removeEventListener("storage", sync);
    }
  }, []);

  // Update sessionStorage helpers
  const saveInterests = (newInterests: string[]) => {
    setInterests(newInterests);
    window.sessionStorage.setItem(
      "hauxhunt-flatmate-interests",
      JSON.stringify(newInterests),
    );
    window.dispatchEvent(new Event("storage"));
  };

  const saveNotForMe = (newNotForMe: string[]) => {
    setNotForMe(newNotForMe);
    window.sessionStorage.setItem(
      "hauxhunt-flatmate-not-for-me",
      JSON.stringify(newNotForMe),
    );
    window.dispatchEvent(new Event("storage"));
  };

  // State calculators
  const matchedFlatmates = PUBLIC_FLATMATES.filter(
    (f) => interests.includes(f.id) && received.includes(f.id),
  );

  const incomingInterests = PUBLIC_FLATMATES.filter(
    (f) =>
      received.includes(f.id) &&
      !interests.includes(f.id) &&
      !notForMe.includes(f.id),
  );

  const outgoingInterests = PUBLIC_FLATMATES.filter(
    (f) => interests.includes(f.id) && !received.includes(f.id),
  );

  // Action triggers
  const handleLike = (flatmate: PublicFlatmate) => {
    const updated = [...interests];
    if (!updated.includes(flatmate.id)) {
      updated.push(flatmate.id);
      saveInterests(updated);

      // Trigger visual co-living match modal
      if (received.includes(flatmate.id)) {
        setModalFlatmate(flatmate);
        setShowMatchModal(true);
      }
    }
  };

  const handlePass = (id: string) => {
    const updated = [...notForMe];
    if (!updated.includes(id)) {
      updated.push(id);
      saveNotForMe(updated);
    }
  };

  const handleRemoveInterest = (id: string) => {
    const updated = interests.filter((interestId) => interestId !== id);
    saveInterests(updated);
  };

  const openCoLivingDetailsModal = (flatmate: PublicFlatmate) => {
    setModalFlatmate(flatmate);
    setShowMatchModal(true);
  };

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1280px]">
            <Link
              href="/flatmates?from=renter"
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-black/65 transition-colors hover:text-black"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              {t("renterDashboard.flatmateMatches.backToCatalog")}
            </Link>

            <div className="flex flex-col gap-2">
              <h1 className="dashboard-page-title text-carbon-900">
                {t("renterDashboard.flatmateMatches.heading")}
              </h1>
              <p className="text-carbon-600 max-w-xl text-sm leading-relaxed">
                {t("renterDashboard.flatmateMatches.subheading")}
              </p>
            </div>

            {/* Tabs Row */}
            <div className="mt-8 flex gap-6 border-b border-black/10 text-sm font-semibold">
              <button
                onClick={() => setActiveTab("matches")}
                className={`relative pb-3 transition-all ${
                  activeTab === "matches"
                    ? "text-black"
                    : "text-neutral-450 hover:text-black"
                }`}
              >
                <span>{t("renterDashboard.flatmateMatches.tabs.matches")}</span>
                {matchedFlatmates.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                    {matchedFlatmates.length}
                  </span>
                )}
                {activeTab === "matches" && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("received")}
                className={`relative pb-3 transition-all ${
                  activeTab === "received"
                    ? "text-black"
                    : "text-neutral-450 hover:text-black"
                }`}
              >
                <span>{t("renterDashboard.flatmateMatches.tabs.received")}</span>
                {incomingInterests.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                    {incomingInterests.length}
                  </span>
                )}
                {activeTab === "received" && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("sent")}
                className={`relative pb-3 transition-all ${
                  activeTab === "sent"
                    ? "text-black"
                    : "text-neutral-450 hover:text-black"
                }`}
              >
                <span>{t("renterDashboard.flatmateMatches.tabs.sent")}</span>
                {outgoingInterests.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                    {outgoingInterests.length}
                  </span>
                )}
                {activeTab === "sent" && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                )}
              </button>
            </div>

            {/* Tab Panels */}
            <div className="mt-8 pb-16">
              {activeTab === "matches" && (
                <>
                  {matchedFlatmates.length === 0 ? (
                    <EmptyState
                      title={t("renterDashboard.flatmateMatches.empty.matches.title")}
                      description={t(
                        "renterDashboard.flatmateMatches.empty.matches.description",
                      )}
                    />
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {matchedFlatmates.map((flatmate) => {
                        const isBothLooking =
                          flatmate.situation === "looking" &&
                          userSituation === "looking";
                        return (
                          <div
                            key={flatmate.id}
                            className="flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)]"
                          >
                            <div>
                              <div className="flex items-center gap-4">
                                <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-neutral-100 bg-neutral-50">
                                  <Image
                                    src={flatmate.portrait}
                                    alt={flatmate.firstName}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bricolage truncate text-lg font-bold text-neutral-900">
                                    {flatmate.firstName}, {flatmate.age}
                                  </h3>
                                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                                    {flatmate.occupation} · {flatmate.city}
                                  </p>
                                </div>
                              </div>

                              <div className="border-green-150 mt-4 inline-flex items-center gap-1 rounded-full border bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">
                                {t("renterDashboard.flatmateMatches.card.matchedToday")}
                              </div>

                              {/* Overlap parameters */}
                              <div className="mt-4 space-y-2.5 rounded-xl bg-neutral-50 p-4.5 text-xs">
                                <div className="flex justify-between gap-2">
                                  <span className="text-neutral-450">
                                    {t("renterDashboard.flatmateMatches.card.housingPlan")}
                                  </span>
                                  <span className="font-medium text-neutral-800">
                                    {flatmate.situation === "looking"
                                      ? t("renterDashboard.flatmateMatches.card.situation.looking")
                                      : t("renterDashboard.flatmateMatches.card.situation.hasPlace")}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-neutral-450">
                                    {t("renterDashboard.flatmateMatches.card.monthlyBudget")}
                                  </span>
                                  <span className="text-neutral-850 font-medium">
                                    {flatmate.situation === "looking"
                                      ? `${formatRwf(flatmate.budgetMin)}–${formatRwf(flatmate.budgetMax)}`
                                      : `${formatRwf(flatmate.budgetMin)} ${t("renterDashboard.flatmateMatches.card.perMonth")}`}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-neutral-450">
                                    {t("renterDashboard.flatmateMatches.card.moveInDate")}
                                  </span>
                                  <span className="text-neutral-855 font-medium">
                                    {flatmate.moveIn}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 flex flex-col gap-2.5">
                              <Link
                                href={`/renter-dashboard/messages?chat=${flatmate.id}`}
                                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-black text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800"
                              >
                                <MessageSquare className="size-3.5" />
                                <span>{t("renterDashboard.flatmateMatches.card.message")}</span>
                              </Link>
                              {isBothLooking ? (
                                <button
                                  onClick={() =>
                                    openCoLivingDetailsModal(flatmate)
                                  }
                                  className="flex h-10 w-full items-center justify-center rounded-full border border-black/15 bg-white text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                                >
                                  {t("renterDashboard.flatmateMatches.card.browseHomesTogether")}
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    openCoLivingDetailsModal(flatmate)
                                  }
                                  className="flex h-10 w-full items-center justify-center rounded-full border border-black/15 bg-white text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                                >
                                  {t("renterDashboard.flatmateMatches.card.discussLivingArrangement")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === "received" && (
                <>
                  {incomingInterests.length === 0 ? (
                    <EmptyState
                      title={t("renterDashboard.flatmateMatches.empty.received.title")}
                      description={t(
                        "renterDashboard.flatmateMatches.empty.received.description",
                      )}
                    />
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {incomingInterests.map((flatmate) => (
                        <div
                          key={flatmate.id}
                          className="flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)]"
                        >
                          <div>
                            <div className="flex items-center gap-4">
                              <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-neutral-100 bg-neutral-50">
                                <Image
                                  src={flatmate.portrait}
                                  alt={flatmate.firstName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bricolage truncate text-lg font-bold text-neutral-900">
                                  {flatmate.firstName}, {flatmate.age}
                                </h3>
                                <p className="mt-0.5 truncate text-xs text-neutral-500">
                                  {flatmate.occupation} · {flatmate.city}
                                </p>
                              </div>
                            </div>

                            <p className="border-neutral-150 mt-4 flex items-center gap-1.5 rounded-xl border bg-neutral-50 px-3 py-2 text-xs font-medium text-black/75">
                              <Info className="size-3.5 shrink-0 text-neutral-500" />
                              <span>
                                {t("renterDashboard.flatmateMatches.card.interestedInYouNote")}
                              </span>
                            </p>
                          </div>

                          <div className="mt-6 flex flex-col gap-2.5">
                            <Link
                              href={`/flatmates/${flatmate.id}?from=renter`}
                              className="flex h-10 w-full items-center justify-center rounded-full border border-black/15 bg-white text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                            >
                              {t("renterDashboard.flatmateMatches.card.viewProfile")}
                            </Link>
                            <div className="grid grid-cols-2 gap-2.5">
                              <button
                                onClick={() => handleLike(flatmate)}
                                className="flex h-10 items-center justify-center rounded-full bg-black text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
                              >
                                {t("renterDashboard.flatmateMatches.card.imInterestedToo")}
                              </button>
                              <button
                                onClick={() => handlePass(flatmate.id)}
                                className="flex h-10 items-center justify-center rounded-full border border-black/15 bg-white text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                              >
                                {t("renterDashboard.flatmateMatches.card.notForMe")}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "sent" && (
                <>
                  {outgoingInterests.length === 0 ? (
                    <EmptyState
                      title={t("renterDashboard.flatmateMatches.empty.sent.title")}
                      description={t(
                        "renterDashboard.flatmateMatches.empty.sent.description",
                      )}
                    />
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {outgoingInterests.map((flatmate) => (
                        <div
                          key={flatmate.id}
                          className="flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)]"
                        >
                          <div>
                            <div className="flex items-center gap-4">
                              <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-neutral-100 bg-neutral-50">
                                <Image
                                  src={flatmate.portrait}
                                  alt={flatmate.firstName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bricolage truncate text-lg font-bold text-neutral-900">
                                  {flatmate.firstName}, {flatmate.age}
                                </h3>
                                <p className="mt-0.5 truncate text-xs text-neutral-500">
                                  {flatmate.occupation} · {flatmate.city}
                                </p>
                              </div>
                            </div>

                            <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500">
                              <HelpCircle className="size-3.5 shrink-0 text-neutral-400" />
                              <span>{t("renterDashboard.flatmateMatches.card.waitingForResponse")}</span>
                            </p>
                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-2.5">
                            <Link
                              href={`/flatmates/${flatmate.id}?from=renter`}
                              className="flex h-10 items-center justify-center rounded-full border border-black/15 bg-white text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                            >
                              {t("renterDashboard.flatmateMatches.card.viewProfile")}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemoveInterest(flatmate.id)}
                              className="text-red-650 flex h-10 items-center justify-center rounded-full border border-red-200 bg-red-50/50 text-xs font-semibold transition-colors hover:bg-red-50"
                            >
                              {t("renterDashboard.flatmateMatches.card.removeInterest")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Mutual Match Modal Popup */}
      {showMatchModal && modalFlatmate && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/35 p-5">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.3)]">
            <div className="relative flex min-h-48 items-center justify-center bg-black/[0.06] p-6">
              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                aria-label={t("common.close")}
                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black"
              >
                <X className="size-5" />
              </button>
              <Image
                src={matchImage}
                alt={t("renterDashboard.flatmateMatches.modal.imageAlt")}
                className="h-40 w-auto object-contain"
              />
            </div>

            <div className="p-8">
              <span className="block text-[10px] font-extrabold tracking-[0.15em] text-neutral-400 uppercase">
                {t("renterDashboard.flatmateMatches.modal.eyebrow")}
              </span>
              <h2 className="font-bricolage mt-2 text-3xl font-bold tracking-tight text-neutral-900">
                {t("renterDashboard.flatmateMatches.modal.title")}
              </h2>
              <p className="mt-3.5 text-sm leading-relaxed text-neutral-600">
                {t("renterDashboard.flatmateMatches.modal.description", {
                  name: modalFlatmate.firstName,
                })}
              </p>

              {/* Context Details Card */}
              <div className="mt-6 space-y-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                {modalFlatmate.situation === "looking" &&
                userSituation === "looking" ? (
                  <>
                    <div>
                      <span className="text-neutral-450 block text-[9px] font-bold tracking-wider uppercase">
                        {t("renterDashboard.flatmateMatches.modal.preferredAreasOverlap")}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-neutral-800">
                        {userAreas
                          .filter((a) => modalFlatmate.areas.includes(a))
                          .join(" · ") ||
                          `${userAreas[0] || "Kacyiru"} · ${modalFlatmate.areas[0] || "Kimihurura"}`}
                      </span>
                    </div>
                    <div className="border-t border-neutral-100 pt-3">
                      <span className="text-neutral-450 block text-[9px] font-bold tracking-wider uppercase">
                        {t("renterDashboard.flatmateMatches.modal.potentialCombinedBudget")}
                      </span>
                      <span className="font-bricolage mt-1 block text-xl font-extrabold text-black">
                        {formatRwf(userBudget + modalFlatmate.budgetMax)}{" "}
                        {t("renterDashboard.flatmateMatches.card.perMonth")}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-normal text-neutral-400">
                        {t("renterDashboard.flatmateMatches.modal.combinedEstimate", {
                          min: userBudget.toLocaleString(),
                          max: modalFlatmate.budgetMax.toLocaleString(),
                        })}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-neutral-450 block text-[9px] font-bold tracking-wider uppercase">
                        {t("renterDashboard.flatmateMatches.modal.livingArrangementArea")}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-neutral-800">
                        {modalFlatmate.areas[0] || modalFlatmate.city}
                      </span>
                    </div>
                    <div className="border-t border-neutral-100 pt-3">
                      <span className="text-neutral-450 block text-[9px] font-bold tracking-wider uppercase">
                        {t("renterDashboard.flatmateMatches.modal.expectedMonthlyShare")}
                      </span>
                      <span className="font-bricolage mt-1 block text-xl font-extrabold text-black">
                        {formatRwf(modalFlatmate.budgetMin)}{" "}
                        {t("renterDashboard.flatmateMatches.card.perMonth")}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-7 flex flex-col gap-3">
                <Link
                  href={`/renter-dashboard/messages?chat=${modalFlatmate.id}`}
                  onClick={() => setShowMatchModal(false)}
                  className="flex h-12 items-center justify-center rounded-full bg-black font-semibold text-white shadow-md transition-all hover:bg-neutral-800 active:scale-95"
                >
                  {t("renterDashboard.flatmateMatches.modal.startChat")}
                </Link>
                {modalFlatmate.situation === "looking" &&
                userSituation === "looking" ? (
                  <Link
                    href={`/flatmates?from=renter&view=all&budget=450-600&location=${modalFlatmate.areas[0] || ""}`}
                    onClick={() => setShowMatchModal(false)}
                    className="flex h-12 items-center justify-center rounded-full border border-black/15 bg-white font-semibold text-black transition-all hover:bg-neutral-50 active:scale-95"
                  >
                    {t("renterDashboard.flatmateMatches.card.browseHomesTogether")}
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowMatchModal(false)}
                    className="flex h-12 items-center justify-center rounded-full border border-black/15 bg-white font-semibold text-black transition-all hover:bg-neutral-50 active:scale-95"
                  >
                    {t("common.close")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center border-none bg-transparent px-6 py-12 text-center">
      <div className="relative mb-4 h-44 w-44">
        <Image
          src={emptyImage}
          alt={t("renterDashboard.flatmateMatches.empty.imageAlt")}
          fill
          className="object-contain"
        />
      </div>
      <h3 className="font-bricolage text-neutral-850 text-xl font-bold">
        {title}
      </h3>
      <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-neutral-500">
        {description}
      </p>
      <Link
        href="/flatmates?from=renter"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800"
      >
        {t("renterDashboard.nav.groups.findFlatmate.browseFlatmates")}
      </Link>
    </div>
  );
}
