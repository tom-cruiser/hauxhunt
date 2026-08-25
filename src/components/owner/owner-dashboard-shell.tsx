"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  CreditCard,
  HelpCircle,
  Home,
  Key,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";

import { Wordmark } from "@/components/layout/wordmark";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import appIllustration from "@/assets/images/illustrated-black-man-using-mobile-phone.png";
import ownerProfile from "@/assets/images/flatmate-billy.jpg";
import { OWNER } from "@/lib/owner-data";
import {
  getOwnerUnreadNotificationCount,
  subscribeToOwnerNotifications,
} from "@/lib/owner-notifications";

// Owner dashboard nav follows a different information architecture than the
// Agent/Property Manager shell (components/partner/dashboard-shell.tsx):
// ownership + oversight + delegation, grouped into Properties / Rentals /
// Management, instead of a single flat marketing/leads workflow list. The
// visual language (dark sidebar, pill active state, collapse behavior,
// top bar search + bell + profile) is deliberately reused so the owner
// experience still feels like the same product.

type OwnerNavItem = { label: string; href: string; icon: LucideIcon };

// One flat list, same vertical rhythm as the Agent/Property Manager sidebar
// (components/partner/dashboard-shell.tsx) -- no section headings, no extra
// gaps between what used to be groups.
// Owner Foundation Cleanup phase -- "Listings" removed from primary nav (its
// content substantially duplicated Properties + Property Detail's Listing
// tab, per the Owner Dashboard Audit). The route and its components are
// deliberately untouched; only this entry point is gone. "My Properties" ->
// "Properties" and "Active Rentals" -> "Rentals" are label-only changes --
// the Owner is already inside their own dashboard, and the Rentals screen
// itself covers Active/Upcoming/Ending Soon/Ended, not only active ones.
const ALL_ITEMS: OwnerNavItem[] = [
  { label: "Overview", href: "/owner-dashboard", icon: LayoutDashboard },
  { label: "Performance", href: "/owner-dashboard/performance", icon: ChartNoAxesCombined },
  { label: "Properties", href: "/owner-dashboard/properties", icon: Home },
  { label: "Applications", href: "/owner-dashboard/applications", icon: ClipboardCheck },
  { label: "Rentals", href: "/owner-dashboard/rentals", icon: Key },
  { label: "Payments", href: "/owner-dashboard/payments", icon: CreditCard },
  { label: "Maintenance", href: "/owner-dashboard/maintenance", icon: Wrench },
  { label: "Team", href: "/owner-dashboard/team", icon: UserCog },
  { label: "Messages", href: "/owner-dashboard/messages", icon: MessageSquare },
];

let rememberedSidebarCollapsed = false;

export function OwnerDashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(rememberedSidebarCollapsed);
  const pathname = usePathname();

  return (
    <main className="bg-carbon-50 min-h-svh lg:fixed lg:inset-0 lg:block lg:min-h-0 lg:overflow-hidden lg:bg-black">
      <OwnerSidebar
        collapsed={collapsed}
        pathname={pathname}
        onCollapse={() =>
          setCollapsed((value) => {
            rememberedSidebarCollapsed = !value;
            return !value;
          })
        }
      />
      <div
        className={`bg-carbon-50 min-h-svh min-w-0 lg:absolute lg:inset-y-0 lg:right-0 lg:min-h-0 lg:overflow-x-clip lg:overflow-y-auto lg:overscroll-contain lg:rounded-tl-[2rem] lg:rounded-bl-[2rem] lg:transition-[left] lg:duration-300 ${collapsed ? "lg:left-[84px]" : "lg:left-[280px]"}`}
      >
        <MobileOwnerNav pathname={pathname} />
        <OwnerTopBar />
        {children}
      </div>
    </main>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/owner-dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function OwnerTopBar() {
  const unreadCount = useSyncExternalStore(
    subscribeToOwnerNotifications,
    getOwnerUnreadNotificationCount,
    () => 0,
  );

  return (
    <header className="bg-carbon-50/95 sticky top-0 z-30 hidden h-20 px-6 backdrop-blur-md lg:block lg:px-10 xl:px-12">
      <div className="relative mx-auto flex h-full w-full max-w-[1360px] items-center justify-end gap-2 border-b border-black/8">
        <label className="mr-auto block w-full max-w-sm">
          <span className="sr-only">Search your properties</span>
          <span className="catalogue-location-filter flex items-center gap-2 px-4">
            <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
            <input
              type="search"
              placeholder="Search your properties"
              className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <VoiceInputButton />
          </span>
        </label>
        <CurrencySelector openOnHover />
        <Link
          href="/owner-dashboard/notifications"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          className="relative mr-4 flex size-11 items-center justify-center rounded-full bg-transparent text-black hover:bg-black/4.5"
        >
          <Bell aria-hidden="true" className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-black text-[0.6rem] font-medium text-white ring-2 ring-white">
              {unreadCount}
            </span>
          ) : null}
        </Link>
        <OwnerProfileMenu />
      </div>
    </header>
  );
}

// The one profile control for the owner dashboard -- the sidebar card and
// the top bar next to the notifications bell -- the only place the owner's
// profile lives. The sidebar deliberately has no profile control of its own.
function OwnerProfileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex size-12 items-center justify-center rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.14)] transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
      >
        <Image src={ownerProfile} alt="" className="size-12 rounded-full object-cover" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+0.75rem)] right-0 z-50 w-[min(360px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_20px_55px_rgba(0,0,0,0.16)]"
        >
          <div className="flex items-center gap-4 border-b border-black/10 p-5">
            <Image src={ownerProfile} alt="" className="size-12 shrink-0 rounded-full object-cover shadow-[0_4px_14px_rgba(0,0,0,0.14)]" />
            <div className="min-w-0">
              <p className="font-bricolage truncate text-lg font-medium">{OWNER.name}</p>
              <p className="text-carbon-500 truncate text-sm">{OWNER.email}</p>
              <p className="text-carbon-400 mt-0.5 text-xs">{OWNER.role}</p>
            </div>
          </div>
          <div className="space-y-1 border-b border-black/10 p-2">
            <Link
              href="/owner-dashboard/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-3 rounded-xl bg-black/4.5 px-3 font-medium transition-colors hover:bg-black/8"
            >
              <Settings aria-hidden="true" className="text-carbon-500 size-4" />
              My Account
            </Link>
            <Link
              href="/renter-dashboard/help"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors hover:bg-black/4.5"
            >
              <HelpCircle aria-hidden="true" className="text-carbon-500 size-4" />
              Help Center
            </Link>
            <Link
              href="/feedback"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors hover:bg-black/4.5"
            >
              <MessageSquarePlus aria-hidden="true" className="text-carbon-500 size-4" />
              Send Feedback
            </Link>
          </div>
          <div className="p-2">
            <Link
              href="/login"
              role="menuitem"
              onClick={() => window.sessionStorage.removeItem("hauxhunt-authenticated-role")}
              className="flex h-12 items-center justify-between rounded-xl px-3 font-medium transition-colors hover:bg-black/4.5"
            >
              Log out
              <LogOut aria-hidden="true" className="text-carbon-500 size-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OwnerSidebar({
  collapsed,
  pathname,
  onCollapse,
}: {
  collapsed: boolean;
  pathname: string;
  onCollapse: () => void;
}) {
  return (
    <aside
      className={`sticky top-0 z-30 hidden h-full min-h-0 shrink-0 flex-col bg-black py-6 text-white transition-[width,padding] duration-300 lg:flex ${collapsed ? "w-[84px] overflow-visible px-3" : "w-[280px] overflow-y-auto px-5"}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07]" />
      </div>
      <div className={`relative z-20 flex items-center ${collapsed ? "flex-col justify-center gap-4" : "justify-between"}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Expand sidebar"
            className="group relative flex size-10 shrink-0 items-center justify-center"
          >
            <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
              <span className="invert">
                <Wordmark height={32} />
              </span>
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <PanelLeftOpen className="size-5 text-white" />
            </span>
          </button>
        ) : (
          <>
            <Link href="/" aria-label="HauxHunt home" className="shrink-0 invert transition-all w-auto">
              <Wordmark height={42} />
            </Link>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              className="group relative flex size-9 shrink-0 items-center justify-center text-white/65 transition-colors hover:text-white"
            >
              <PanelLeftClose className="size-5" />
            </button>
          </>
        )}
      </div>

      <nav aria-label="Owner dashboard" className="relative z-10 mt-7 flex-1">
        <ul className={collapsed ? "space-y-2" : "mt-2 space-y-1"}>
          {ALL_ITEMS.map((item) => (
            <OwnerNavLink key={item.href} item={item} collapsed={collapsed} active={isActive(pathname, item.href)} />
          ))}
        </ul>
      </nav>

      {!collapsed ? (
        <section className="relative z-10 mt-5 min-h-56 shrink-0 overflow-hidden rounded-[1.5rem] bg-[#00f58a] p-5 text-black">
          <svg
            aria-hidden="true"
            viewBox="0 0 240 224"
            className="pointer-events-none absolute inset-0 z-0 size-full translate-y-4 opacity-25"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-24 116C33 73 73 164 134 126C178 98 205 73 264 96M-24 176C33 133 73 224 134 186C178 158 205 133 264 156"
              stroke="black"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
          </svg>
          <div className="relative z-10 max-w-[135px]">
            <p className="font-bricolage text-lg leading-5 font-medium tracking-[-0.025em]">HauxHunt on the go.</p>
            <p className="mt-2 text-xs leading-4 text-black/55">Manage your properties anywhere.</p>
          </div>
          <button
            type="button"
            className="font-bricolage absolute bottom-5 left-5 z-10 inline-flex h-9 items-center justify-center rounded-full bg-black px-4 text-xs font-medium text-white"
          >
            Download App
          </button>
          <Image
            src={appIllustration}
            alt="Person using the HauxHunt mobile app"
            className="absolute -right-32 -bottom-32 z-10 h-96 w-auto max-w-none object-contain"
          />
        </section>
      ) : null}
    </aside>
  );
}

function OwnerNavLink({ item, collapsed, active }: { item: OwnerNavItem; collapsed: boolean; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={`group relative flex h-11 items-center text-sm ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${
          active
            ? `bg-carbon-50 rounded-l-full rounded-r-none text-black before:absolute before:-top-5 before:right-0 before:size-5 before:rounded-br-full before:shadow-[7px_7px_0_7px_var(--color-carbon-50)] after:absolute after:right-0 after:-bottom-5 after:size-5 after:rounded-tr-full after:shadow-[7px_-7px_0_7px_var(--color-carbon-50)] ${collapsed ? "w-[calc(100%+0.75rem)] pr-3 pl-0" : "w-[calc(100%+1.25rem)] pr-8"}`
            : `text-white/58 hover:bg-white/[0.1] hover:text-white ${collapsed ? "rounded-[1rem]" : "rounded-xl"}`
        }`}
      >
        <item.icon aria-hidden="true" className="size-[18px] shrink-0" />
        {!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
        {collapsed ? (
          <span className="pointer-events-none absolute top-1/2 left-[calc(100%+0.85rem)] z-50 -translate-x-1 -translate-y-1/2 rounded-full border border-white/10 bg-[#242424] px-4 py-2 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            {item.label}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function MobileOwnerNav({ pathname }: { pathname: string }) {
  return (
    <div className="border-b border-black/10 bg-white lg:hidden">
      <div className="flex items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" aria-label="HauxHunt home">
          <Wordmark height={36} />
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/owner-dashboard/notifications"
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full border border-black/10"
          >
            <Bell aria-hidden="true" className="size-4" />
          </Link>
          <Link
            href="/owner-dashboard/account"
            aria-label="Account"
            className="flex size-9 items-center justify-center rounded-full bg-black text-white"
          >
            <Building2 aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
      <nav aria-label="Owner dashboard" className="overflow-x-auto px-5 pb-3 sm:px-6">
        <ul className="flex min-w-max gap-2">
          {ALL_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${isActive(pathname, item.href) ? "bg-black text-white" : "border border-black/10 bg-white text-black"}`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
