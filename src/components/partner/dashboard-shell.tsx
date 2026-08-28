"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useReducer, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  HelpCircle,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
  Wrench,
} from "lucide-react";

import { Wordmark } from "@/components/layout/wordmark";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import appIllustration from "@/assets/images/illustrated-black-man-using-mobile-phone.png";
import { usePartnerRole, setPartnerRole } from "@/components/partner/use-partner-role";
import { clearTier } from "@/hooks/use-tier";
import {
  REGISTERED_PROFESSIONALS,
  clearPreviewProfessional,
  getPreviewProfessionalId,
  setPreviewProfessional,
  subscribeToTeam,
  type RegisteredProfessional,
} from "@/lib/team-data";
import { useDemoProfessional, useMounted } from "@/components/partner/use-demo-professional";
import { getApplicationsFor, getConversationsFor, getEnquiriesFor, getProfessionalUnreadCount, subscribeToProfessionalWork } from "@/lib/professional-work";
import { getMaintenanceFor, getPaymentsFor, subscribeToPmWork } from "@/lib/pm-work";

type DashboardNavItem = {
  label: string;
  href: string;
  section: string;
  icon: LucideIcon;
  badge?: string;
};

// Property Manager Dashboard phase -- Section 5/90. Performance and
// "Enquiries & calendar" are deliberately removed from top-level nav (their
// routes/components still exist, just unlinked here -- Section 6: leasing
// activity for a PM lives contextually inside Property Detail instead).
// Rentals/Payments/Maintenance are new top-level PM surfaces; Applications
// is promoted to real (no longer a placeholder). Badges are live counts,
// computed in DashboardShell below -- never the old static placeholders.
const PROPERTY_MANAGER_NAV: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/partner-dashboard",
    section: "overview",
    icon: LayoutDashboard,
  },
  {
    label: "Properties",
    href: "/partner-dashboard/properties",
    section: "properties",
    icon: Home,
  },
  {
    label: "Applications",
    href: "/partner-dashboard/applications",
    section: "applications",
    icon: ClipboardCheck,
  },
  {
    label: "Rentals",
    href: "/partner-dashboard/rentals",
    section: "rentals",
    icon: KeyRound,
  },
  {
    label: "Finance",
    href: "/partner-dashboard/finance",
    section: "finance",
    icon: Wallet,
  },
  {
    label: "Maintenance",
    href: "/partner-dashboard/maintenance",
    section: "maintenance",
    icon: Wrench,
  },
  {
    label: "Team",
    href: "/partner-dashboard/team",
    section: "team",
    icon: UserRound,
  },
  {
    label: "Messages",
    href: "/partner-dashboard/messages",
    section: "messages",
    icon: MessageSquare,
  },
];

const AGENT_NAV: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/partner-dashboard",
    section: "overview",
    icon: LayoutDashboard,
  },
  {
    label: "Properties",
    href: "/partner-dashboard/properties",
    section: "properties",
    icon: Home,
  },
  {
    label: "Enquiries",
    href: "/partner-dashboard/enquiries",
    section: "enquiries",
    icon: CalendarDays,
  },
  {
    label: "Applications",
    href: "/partner-dashboard/applications",
    section: "applications",
    icon: ClipboardCheck,
  },
  {
    label: "Messages",
    href: "/partner-dashboard/messages",
    section: "messages",
    icon: MessageSquare,
  },
  {
    label: "Team",
    href: "/partner-dashboard/team",
    section: "team",
    icon: UserRound,
  },
];

const ACCOUNT_NAV = [
  {
    label: "Verification",
    href: "/partner-dashboard/verification",
    section: "verification",
    icon: ShieldCheck,
  },
] as const;

let rememberedSidebarCollapsed = false;

export function DashboardShell({
  children,
  initialSection = "overview",
}: {
  children: ReactNode;
  initialSection?: string;
}) {
  const [collapsed, setCollapsed] = useState(rememberedSidebarCollapsed);
  const [activeSection, setActiveSection] = useState(initialSection);
  const role = usePartnerRole();
  // Nav badges are live counts for both roles, not static placeholders --
  // re-render whenever Team/Property/Enquiry/Application/Message data, PM's
  // Rental/Payment/Maintenance data, or the Preview As selection changes.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  // These badges/counts read sessionStorage-backed mock data, which the
  // server can never see (SSR always gets the empty/default state). Gating
  // the computation behind `mounted` makes the server's render and the
  // client's FIRST render agree (both render with no badge at all); the
  // real, possibly-different count then appears in a normal post-mount
  // update, never during hydration itself -- avoiding a hydration mismatch
  // rather than just hiding one.
  const mounted = useMounted();

  const isAgent = role === "agent";
  const isPm = role === "property_manager";
  // Both hooks are called unconditionally every render (Rules of Hooks) --
  // only the RESULT is picked conditionally below.
  const agentIdentity = useDemoProfessional("agent");
  const pmIdentity = useDemoProfessional("property_manager");
  const agentProfessional = isAgent ? agentIdentity : undefined;
  const pmProfessional = isPm ? pmIdentity : undefined;
  const professional = agentProfessional ?? pmProfessional;
  const notificationCount = mounted && professional ? getProfessionalUnreadCount(professional.id) : 0;
  const dashboardNav = isAgent
    ? AGENT_NAV.map((item) => {
        if (!mounted || !agentProfessional) return item;
        if (item.section === "enquiries") {
          const newCount = getEnquiriesFor(agentProfessional.id).filter((e) => e.status === "New").length;
          return { ...item, badge: newCount > 0 ? String(newCount) : undefined };
        }
        if (item.section === "messages") {
          const unreadCount = getConversationsFor(agentProfessional.id).filter((c) => c.unread).length;
          return { ...item, badge: unreadCount > 0 ? String(unreadCount) : undefined };
        }
        return item;
      })
    : PROPERTY_MANAGER_NAV.map((item) => {
        if (!mounted || !pmProfessional) return item;
        if (item.section === "applications") {
          const actionable = getApplicationsFor(pmProfessional.id).filter((a) => a.status === "Under Review" || a.status === "Action Required").length;
          return { ...item, badge: actionable > 0 ? String(actionable) : undefined };
        }
        if (item.section === "finance") {
          // Finance Consolidation phase -- this badge lived on the old
          // "Payments" nav item; Finance's own "Payments" tab is what it
          // describes now.
          const overdue = getPaymentsFor(pmProfessional.id).filter((p) => p.status === "Overdue").length;
          return { ...item, badge: overdue > 0 ? String(overdue) : undefined };
        }
        if (item.section === "maintenance") {
          const open = getMaintenanceFor(pmProfessional.id).filter((m) => m.status === "Submitted" || m.status === "Under Review").length;
          return { ...item, badge: open > 0 ? String(open) : undefined };
        }
        if (item.section === "messages") {
          const unreadCount = getConversationsFor(pmProfessional.id).filter((c) => c.unread).length;
          return { ...item, badge: unreadCount > 0 ? String(unreadCount) : undefined };
        }
        return item;
      });

  useEffect(() => {
    const syncHash = () =>
      setActiveSection(window.location.hash.slice(1) || initialSection);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [initialSection]);

  return (
    <main className="bg-carbon-50 min-h-svh lg:fixed lg:inset-0 lg:block lg:min-h-0 lg:overflow-hidden lg:bg-black">
      <DashboardSidebar
        dashboardNav={dashboardNav}
        collapsed={collapsed}
        activeSection={activeSection}
        onCollapse={() =>
          setCollapsed((value) => {
            rememberedSidebarCollapsed = !value;
            return !value;
          })
        }
        onNavigate={setActiveSection}
      />
      <div
        className={`bg-carbon-50 min-h-svh min-w-0 lg:absolute lg:inset-y-0 lg:right-0 lg:min-h-0 lg:overflow-x-clip lg:overflow-y-auto lg:overscroll-contain lg:rounded-tl-[2rem] lg:rounded-bl-[2rem] lg:transition-[left] lg:duration-300 ${collapsed ? "lg:left-[84px]" : "lg:left-[280px]"}`}
      >
        <MobileDashboardNav
          dashboardNav={dashboardNav}
          activeSection={activeSection}
          onNavigate={setActiveSection}
          notificationCount={notificationCount}
          professional={professional}
        />
        <DashboardTopBar role={role} onNavigate={setActiveSection} notificationCount={notificationCount} professional={professional} />
        {children}
      </div>
    </main>
  );
}

function DashboardTopBar({
  role,
  onNavigate,
  notificationCount,
  professional,
}: {
  role: "property_manager" | "agent";
  onNavigate: (section: string) => void;
  notificationCount: number;
  professional: RegisteredProfessional | undefined;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="bg-carbon-50/95 sticky top-0 z-30 hidden h-20 px-6 backdrop-blur-md lg:block lg:px-10 xl:px-12">
      <div className="relative mx-auto flex h-full w-full max-w-[1360px] items-center justify-end gap-2 border-b border-black/8">
        <div
          id="dashboard-topbar-status"
          className="pointer-events-none absolute top-0 left-1/2 z-40 -translate-x-1/2"
        />
        <label className="mr-auto block w-full max-w-sm">
          <span className="sr-only">Search dashboard</span>
          <span className="catalogue-location-filter flex items-center gap-2 px-4">
            <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
            <input
              type="search"
              placeholder="Search"
              className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <VoiceInputButton />
          </span>
        </label>
        <Link
          href="/partner-dashboard/notifications"
          onClick={() => onNavigate("notifications")}
          aria-label="Notifications"
          className="relative mr-4 flex size-11 items-center justify-center rounded-full bg-transparent text-black"
        >
          <Bell aria-hidden="true" className="size-5" />
          {notificationCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-black text-[0.6rem] font-medium text-white ring-2 ring-white">
              {notificationCount}
            </span>
          ) : null}
        </Link>
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex size-12 items-center justify-center rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.14)] transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
          >
            {professional?.avatar ? (
              <Image
                src={professional.avatar}
                alt=""
                className="size-12 rounded-full object-cover"
              />
            ) : (
              <span className="font-bricolage flex size-12 items-center justify-center rounded-full bg-black text-lg font-medium text-white">
                {professional?.name.trim().charAt(0).toUpperCase() || (role === "agent" ? "A" : "P")}
              </span>
            )}
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute top-[calc(100%+0.75rem)] right-0 w-[min(360px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_20px_55px_rgba(0,0,0,0.16)]"
            >
              <ProfileMenuContent role={role} onNavigate={onNavigate} onClose={() => setProfileOpen(false)} professional={professional} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

// Shared by the desktop topbar's avatar dropdown and the mobile nav's
// profile button -- same content, same "Preview as" control, one
// implementation (Section 60: must work on both).
function ProfileMenuContent({
  role,
  onNavigate,
  onClose,
  professional,
}: {
  role: "property_manager" | "agent";
  onNavigate: (section: string) => void;
  onClose: () => void;
  professional: RegisteredProfessional | undefined;
}) {
  // Re-render whenever the preview selection (or any team-data mutation)
  // changes -- reuses subscribeToTeam rather than a new event, since
  // setPreviewProfessional already dispatches it (see team-data.ts).
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Final Presentation Readiness Cleanup -- the identity block (avatar,
  // name, email, role) now comes from the same hydration-safe
  // `professional` DashboardShell already resolves via useDemoProfessional
  // (which itself honors an active Preview As selection), instead of
  // recomputing it here and hardcoding a Renter photo regardless of who is
  // being previewed. `previewId` below is kept only to highlight the
  // active row inside the Prototype Preview picker.
  const activeProfessional = professional;
  const previewId = getPreviewProfessionalId();
  const agents = REGISTERED_PROFESSIONALS.filter((p) => p.role === "agent");
  const propertyManagers = REGISTERED_PROFESSIONALS.filter((p) => p.role === "property_manager");

  function choose(professionalId: string) {
    setPreviewProfessional(professionalId, setPartnerRole);
    setPreviewOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-4 border-b border-black/10 p-5">
        {activeProfessional?.avatar ? (
          <Image
            src={activeProfessional.avatar}
            alt=""
            className="size-12 shrink-0 rounded-full object-cover shadow-[0_4px_14px_rgba(0,0,0,0.14)]"
          />
        ) : (
          <span className="font-bricolage flex size-12 shrink-0 items-center justify-center rounded-full bg-black text-lg font-medium text-white shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
            {activeProfessional?.name.trim().charAt(0).toUpperCase() || (role === "agent" ? "A" : "P")}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-bricolage truncate text-lg font-medium">
            {activeProfessional?.name ?? (role === "agent" ? "Alex Agent" : "Alex Partner")}
          </p>
          <p className="text-carbon-500 truncate text-sm">
            {activeProfessional?.email ?? (role === "agent" ? "agent@gmail.com" : "partner@gmail.com")}
          </p>
          <p className="text-carbon-400 mt-0.5 text-xs">
            {role === "agent" ? "Agent" : "Property manager"}
          </p>
        </div>
      </div>

      <div className="border-b border-black/10 p-4">
        <p className="text-carbon-400 text-[11px] font-medium tracking-wide uppercase">Prototype Preview</p>
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
          className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-black/20 px-3 py-2.5 text-left transition-colors hover:border-black/35"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">Preview as</span>
            <span className="text-carbon-500 block truncate text-xs">
              {activeProfessional ? `${activeProfessional.name} · ${activeProfessional.role === "agent" ? "Agent" : "Property Manager"}` : "Default"}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${previewOpen ? "rotate-180" : ""}`} />
        </button>
        {previewOpen ? (
          <div className="mt-2 max-h-56 space-y-3 overflow-y-auto pr-1">
            <div>
              <p className="text-carbon-400 px-1 text-[10px] font-medium tracking-wide uppercase">Agents</p>
              <div className="mt-1 space-y-0.5">
                {agents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choose(p.id)}
                    aria-pressed={p.id === previewId}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${p.id === previewId ? "bg-black text-white" : "hover:bg-black/5"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-carbon-400 px-1 text-[10px] font-medium tracking-wide uppercase">Property Managers</p>
              <div className="mt-1 space-y-0.5">
                {propertyManagers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choose(p.id)}
                    aria-pressed={p.id === previewId}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${p.id === previewId ? "bg-black text-white" : "hover:bg-black/5"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            {previewId ? (
              <button
                type="button"
                onClick={() => {
                  clearPreviewProfessional();
                  setPreviewOpen(false);
                }}
                className="text-carbon-500 block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:text-black"
              >
                Reset to default
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 border-b border-black/10 p-2">
        <Link
          href="/partner-dashboard/settings"
          role="menuitem"
          onClick={() => {
            onNavigate("settings");
            onClose();
          }}
          className="flex h-12 items-center gap-3 rounded-xl bg-black/[0.045] px-3 font-medium transition-colors hover:bg-black/[0.08]"
        >
          <Settings aria-hidden="true" className="text-carbon-500 size-4" />
          My Account
        </Link>
        <Link
          href="/renter-dashboard/help"
          role="menuitem"
          onClick={onClose}
          className="flex h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors hover:bg-black/[0.045]"
        >
          <HelpCircle aria-hidden="true" className="text-carbon-500 size-4" />
          Help Center
        </Link>
        <Link
          href="/feedback"
          role="menuitem"
          onClick={onClose}
          className="flex h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors hover:bg-black/[0.045]"
        >
          <MessageSquarePlus aria-hidden="true" className="text-carbon-500 size-4" />
          Send Feedback
        </Link>
      </div>

      <div className="p-2">
        <Link
          href="/login"
          role="menuitem"
          onClick={() => {
            window.sessionStorage.removeItem("hauxhunt-authenticated-role");
            clearTier();
          }}
          className="flex h-12 items-center justify-between rounded-xl px-3 font-medium transition-colors hover:bg-black/[0.045]"
        >
          Log out
          <LogOut aria-hidden="true" className="text-carbon-500 size-4" />
        </Link>
      </div>
    </>
  );
}

function DashboardSidebar({
  dashboardNav,
  collapsed,
  activeSection,
  onCollapse,
  onNavigate,
}: {
  dashboardNav: DashboardNavItem[];
  collapsed: boolean;
  activeSection: string;
  onCollapse: () => void;
  onNavigate: (section: string) => void;
}) {
  return (
    <aside
      className={`sticky top-0 z-30 hidden h-full min-h-0 shrink-0 flex-col bg-black py-6 text-white transition-[width,padding] duration-300 lg:flex ${collapsed ? "w-[84px] overflow-visible px-3" : "w-[280px] overflow-hidden px-5"}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07]" />
      </div>
      <div
        className={`relative z-20 flex items-center ${collapsed ? "flex-col justify-center gap-4" : "justify-between"}`}
      >
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
            <span className="pointer-events-none absolute top-1/2 left-[calc(100%+1.6rem)] z-50 -translate-x-1 -translate-y-1/2 rounded-full border border-white/10 bg-[#242424] px-4 py-2 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              Expand sidebar
            </span>
          </button>
        ) : (
          <>
            <Link
              href="/"
              aria-label="HauxHunt home"
              className="shrink-0 invert transition-all w-auto"
            >
              <Wordmark height={42} />
            </Link>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              className="group relative flex size-9 shrink-0 items-center justify-center text-white/65 transition-colors hover:text-white"
            >
              <PanelLeftClose className="size-5" />
              <span className="pointer-events-none absolute top-[calc(100%+0.65rem)] right-0 z-50 -translate-y-1 rounded-full border border-white/10 bg-[#242424] px-4 py-2 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                Collapse sidebar
              </span>
            </button>
          </>
        )}
      </div>

      <nav aria-label="Partner dashboard" className="relative z-10 mt-7 flex-1">
        <ul className={`${collapsed ? "space-y-2" : "mt-2 space-y-1"}`}>
          {dashboardNav.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              active={activeSection === item.section}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
        <ul className="mt-2 space-y-2">
          {ACCOUNT_NAV.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              active={activeSection === item.section}
              onNavigate={onNavigate}
            />
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
            <p className="font-bricolage text-lg leading-5 font-medium tracking-[-0.025em]">
              HauxHunt on the go.
            </p>
            <p className="mt-2 text-xs leading-4 text-black/55">
              Manage listings and enquiries anywhere.
            </p>
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

function NavItem({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: DashboardNavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate: (section: string) => void;
}) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={() => onNavigate(item.section)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={`group relative flex h-11 items-center text-sm ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${
          active
            ? `bg-carbon-50 rounded-l-full rounded-r-none text-black before:absolute before:-top-5 before:right-0 before:size-5 before:rounded-br-full before:shadow-[7px_7px_0_7px_var(--color-carbon-50)] after:absolute after:right-0 after:-bottom-5 after:size-5 after:rounded-tr-full after:shadow-[7px_-7px_0_7px_var(--color-carbon-50)] ${collapsed ? "w-[calc(100%+0.75rem)] pr-3 pl-0" : "w-[calc(100%+1.25rem)] pr-8"}`
            : `text-white/58 hover:bg-white/[0.1] hover:text-white ${collapsed ? "rounded-[1rem]" : "rounded-xl"}`
        }`}
      >
        <item.icon
          aria-hidden="true"
          className={`size-[18px] shrink-0 transition-transform duration-200 ${collapsed && !active ? "group-hover:scale-110" : ""}`}
        />
        {!collapsed && (
          <span className="flex-1 whitespace-nowrap">{item.label}</span>
        )}
        {collapsed ? (
          <span className="pointer-events-none absolute top-1/2 left-[calc(100%+0.85rem)] z-50 -translate-x-1 -translate-y-1/2 rounded-full border border-white/10 bg-[#242424] px-4 py-2 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
            {item.label}
          </span>
        ) : null}
        {"badge" in item &&
          (!collapsed ? (
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-medium ${active ? "bg-black text-white" : "bg-white/10 text-white/65"}`}
            >
              {item.badge}
            </span>
          ) : (
            <span
              className={`absolute top-1 right-1 size-2 rounded-full ${active ? "bg-black" : "bg-white"}`}
            />
          ))}
      </Link>
    </li>
  );
}

function MobileDashboardNav({
  dashboardNav,
  activeSection,
  onNavigate,
  notificationCount,
  professional,
}: {
  dashboardNav: DashboardNavItem[];
  activeSection: string;
  onNavigate: (section: string) => void;
  notificationCount: number;
  professional: RegisteredProfessional | undefined;
}) {
  const role = usePartnerRole();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="border-b border-black/10 bg-white lg:hidden">
      <div className="flex items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" aria-label="HauxHunt home">
          <Wordmark height={36} />
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/partner-dashboard/notifications"
            onClick={() => onNavigate("notifications")}
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full border border-black/10"
          >
            <Bell aria-hidden="true" className="size-4" />
            {notificationCount > 0 ? <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-black ring-2 ring-white" /> : null}
          </Link>
          <Link
            href="/partner-dashboard/settings"
            onClick={() => onNavigate("settings")}
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-full border border-black/10"
          >
            <Settings aria-hidden="true" className="size-4" />
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label="Profile"
              className="flex size-9 items-center justify-center rounded-full bg-black text-white"
            >
              <UserRound aria-hidden="true" className="size-4" />
            </button>
            {profileOpen ? (
              <div
                role="menu"
                className="absolute top-[calc(100%+0.6rem)] right-0 z-40 w-[min(320px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_20px_55px_rgba(0,0,0,0.16)]"
              >
                <ProfileMenuContent role={role} onNavigate={onNavigate} onClose={() => setProfileOpen(false)} professional={professional} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <nav
        aria-label="Partner dashboard"
        className="overflow-x-auto px-5 pb-3 sm:px-6"
      >
        <ul className="flex min-w-max gap-2">
          {dashboardNav.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={() => onNavigate(item.section)}
                aria-current={
                  activeSection === item.section ? "page" : undefined
                }
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${activeSection === item.section ? "bg-black text-white" : "border border-black/10 bg-white text-black"}`}
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
