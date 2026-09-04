"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronDown, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { NotificationsDrawer } from "@/components/renter/notifications-drawer";

import { Wordmark } from "@/components/layout/wordmark";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { useTranslation } from "@/components/language/use-translation";
import { getTotalUnreadCount } from "@/lib/message-threads";
import {
  getUnreadNotificationCount,
  subscribeToNotifications,
} from "@/lib/notifications";
import julienProfile from "@/assets/images/julien.jpg";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

const RENTER_NAV_GROUPS = [
  {
    labelKey: "renterDashboard.nav.groups.findHome.label",
    links: [
      ["renterDashboard.nav.groups.findHome.listings", "/renter-dashboard/properties"],
      ["renterDashboard.nav.groups.findHome.myFavourites", "/renter-dashboard/saved"],
      ["renterDashboard.nav.groups.findHome.savedSearches", "/renter-dashboard/saved-searches"],
      ["renterDashboard.nav.groups.findHome.myViewings", "/renter-dashboard/visits"],
      ["renterDashboard.nav.groups.findHome.applications", "/renter-dashboard/applications"],
    ],
  },
  {
    labelKey: "renterDashboard.nav.groups.myHome.label",
    links: [
      ["renterDashboard.nav.groups.myHome.myRentals", "/renter-dashboard/rentals"],
      ["renterDashboard.nav.groups.myHome.payments", "/renter-dashboard/payments"],
      ["renterDashboard.nav.groups.myHome.maintenance", "/renter-dashboard/maintenance"],
    ],
  },
  {
    labelKey: "renterDashboard.nav.groups.findFlatmate.label",
    links: [
      ["renterDashboard.nav.groups.findFlatmate.browseFlatmates", "/flatmates?from=renter"],
      ["renterDashboard.nav.groups.findFlatmate.myFlatmateProfile", "/renter-dashboard/flatmates/profile"],
      ["renterDashboard.nav.groups.findFlatmate.matches", "/renter-dashboard/flatmates/matches"],
    ],
  },
] as const;

const PROFILE_LINKS = [
  ["renterDashboard.profileMenu.myAccount", "/renter-dashboard/account"],
  ["renterDashboard.profileMenu.helpCenter", "/renter-dashboard/help"],
  ["renterDashboard.profileMenu.sendFeedback", "/feedback"],
] as const;

export function RenterCatalogueTopBar() {
  const { t } = useTranslation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  // Mock, session-only count (not a real synced inbox) — computed fresh from
  // which conversations have been opened, so it's correct on every page, not
  // just after visiting Messages. Kept separate from Notifications.
  const unreadMessageCount = useSyncExternalStore(
    subscribeToStorage,
    () => getTotalUnreadCount(),
    () => 0
  );
  const unreadNotificationCount = useSyncExternalStore(
    subscribeToNotifications,
    getUnreadNotificationCount,
    () => 0,
  );

  useEffect(() => {
    const closeProfileOnOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeProfileOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeProfileOnOutsideClick);
  }, []);

  return (
    <header className="nav-surface border-border-subtle fixed inset-x-0 top-0 z-50 h-16 border-b text-black">
      <div className="mx-auto grid h-full w-[calc(100%-2.5rem)] max-w-[1562px] grid-cols-[auto_1fr_auto] items-center gap-4 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-5.5rem)] lg:grid-cols-[1fr_auto_1fr] lg:gap-10 xl:w-[calc(100%-6.5rem)]">
        <Link href="/renter-dashboard" aria-label={t("renterDashboard.nav.homeAria")}>
          <Wordmark height={38} />
        </Link>
        <nav className="hidden h-full items-center gap-5 justify-self-center text-sm font-medium lg:flex xl:gap-7">
          {RENTER_NAV_GROUPS.map((group) => {
            const open = openNavMenu === group.labelKey;
            return (
              <div
                key={group.labelKey}
                className="relative"
                onMouseEnter={() => setOpenNavMenu(group.labelKey)}
                onMouseLeave={() => setOpenNavMenu(null)}
                onFocus={() => setOpenNavMenu(group.labelKey)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    setOpenNavMenu(null);
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenNavMenu(open ? null : group.labelKey)}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className="relative inline-flex items-center gap-1.5 transition-opacity hover:opacity-55"
                >
                  {t(group.labelKey)}
                  <ChevronDown
                    className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open ? (
                  <div className="absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 pt-[0.8rem]">
                    <div
                      role="menu"
                      className="overflow-hidden rounded-2xl bg-white p-2 text-black shadow-[0_24px_70px_rgba(0,0,0,0.18)]"
                    >
                      {group.links.map(([labelKey, href]) => (
                        <Link
                          key={labelKey}
                          href={href}
                          role="menuitem"
                          className="flex min-h-11 items-center rounded-xl px-3 text-sm font-normal transition-colors hover:bg-black/[0.055] focus:bg-black/[0.055] focus:outline-none"
                        >
                          {t(labelKey)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <Link
            href="/renter-dashboard/messages"
            className="relative inline-flex items-center transition-opacity hover:opacity-55"
          >
            {t("renterDashboard.nav.messages")}
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1.5 -right-3.5 flex size-4 items-center justify-center rounded-full bg-black text-[0.55rem] font-bold text-white">
                {unreadMessageCount}
              </span>
            )}
          </Link>
        </nav>
        <div className="flex items-center gap-2 justify-self-end">
          {/* Main nav (incl. Messages) is desktop-only (`lg:flex` above) — this
              is the minimal mobile entry point into Messages. */}
          <Link
            href="/renter-dashboard/messages"
            aria-label={t("renterDashboard.nav.messages")}
            className="relative flex size-11 items-center justify-center rounded-full hover:bg-black/[0.055] lg:hidden"
          >
            <MessageCircle className="size-5" />
            {unreadMessageCount > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-black text-[0.55rem] font-bold text-white">
                {unreadMessageCount}
              </span>
            )}
          </Link>
          <LanguageSwitcher />
          <CurrencySelector openOnHover />
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={
              unreadNotificationCount > 0
                ? t("renterDashboard.notificationsAriaUnread", {
                    count: unreadNotificationCount,
                  })
                : t("renterDashboard.notificationsAria")
            }
            aria-expanded={notifOpen}
            className="relative flex size-11 items-center justify-center rounded-full hover:bg-black/[0.055]"
          >
            <Bell className="size-5" />
            {unreadNotificationCount > 0 ? (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-black text-[0.55rem] font-bold text-white">
                {unreadNotificationCount}
              </span>
            ) : null}
          </button>
          <NotificationsDrawer
            open={notifOpen}
            filter={notifFilter}
            onClose={() => setNotifOpen(false)}
            onFilterChange={setNotifFilter}
          />
          <div
            ref={profileMenuRef}
            className="relative"
            onMouseEnter={() => setProfileOpen(true)}
            onMouseLeave={() => setProfileOpen(false)}
            onFocus={() => setProfileOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setProfileOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex h-12 items-center gap-2 rounded-full pl-1 sm:pr-2"
            >
              <Image
                src={julienProfile}
                alt="Julien Mugisha"
                className="size-10 rounded-full object-cover ring-2 ring-black/10"
              />
              <span className="hidden text-sm font-medium sm:block">
                Julien
              </span>
              <ChevronDown
                className={`hidden size-4 transition-transform sm:block ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>
            {profileOpen ? (
              <div className="absolute top-full right-0 z-50 w-72 pt-3">
                <div
                  role="menu"
                  className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.18)]"
                >
                  <div className="border-b border-black/10 p-5">
                    <p className="font-bricolage text-lg font-medium">
                      Julien Mugisha
                    </p>
                    <p className="text-carbon-500 text-sm">renter@gmail.com</p>
                  </div>
                  <div className="p-2">
                    {PROFILE_LINKS.map(([labelKey, href]) => (
                      <Link
                        key={labelKey}
                        href={href}
                        role="menuitem"
                        className="flex h-11 items-center rounded-xl px-3 text-sm hover:bg-black/[0.055]"
                      >
                        {t(labelKey)}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-black/10 p-2">
                    <Link
                      href="/login"
                      role="menuitem"
                      onClick={() => {
                        window.sessionStorage.removeItem(
                          "hauxhunt-authenticated-role",
                        );
                      }}
                      className="flex h-11 items-center rounded-xl px-3 text-sm hover:bg-black/[0.055]"
                    >
                      {t("renterDashboard.profileMenu.logOut")}
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
