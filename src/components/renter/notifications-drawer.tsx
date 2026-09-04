"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  ArrowUpRight,
  Check,
  Settings,
  X,
} from "lucide-react";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  clearNotification,
  subscribeToNotifications,
  EMPTY_NOTIFICATIONS,
  EMPTY_UNREAD_COUNT,
  type Notification,
} from "@/lib/notifications";
import { useTranslation } from "@/components/language/use-translation";
import emptyIllustration from "@/assets/images/empty.png";

type Group = "Today" | "Yesterday" | "Earlier";

const GROUP_LABEL_KEYS: Record<Group, string> = {
  Today: "renterDashboard.notificationsDrawer.groupToday",
  Yesterday: "renterDashboard.notificationsDrawer.groupYesterday",
  Earlier: "renterDashboard.notificationsDrawer.groupEarlier",
};

function getGroup(timestamp: number): Group {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart.getTime() - 86_400_000;
  if (timestamp >= todayStart.getTime()) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  return "Earlier";
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

type Filter = "all" | "unread";

export function NotificationsDrawer({
  open,
  filter,
  onClose,
  onFilterChange,
}: {
  open: boolean;
  filter: Filter;
  onClose: () => void;
  onFilterChange: (f: Filter) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const notifications = useSyncExternalStore(
    subscribeToNotifications,
    getNotifications,
    () => EMPTY_NOTIFICATIONS,
  );

  const unreadCount = useSyncExternalStore(
    subscribeToNotifications,
    getUnreadNotificationCount,
    () => EMPTY_UNREAD_COUNT,
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Trap scroll on body while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleClick = useCallback(
    (n: Notification) => {
      markNotificationRead(n.id);
      onClose();
      if (n.actionHref) router.push(n.actionHref);
    },
    [router, onClose],
  );

  const shown =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const GROUPS: Group[] = ["Today", "Yesterday", "Earlier"];
  const grouped = GROUPS.map((g) => ({
    group: g,
    items: shown.filter((n) => getGroup(n.timestamp) === g),
  })).filter((g) => g.items.length > 0);

  if (!mounted) return null;

  return createPortal(
    <>
      {toast && (
        <p role="status" className="feedback-toast flex items-center justify-center gap-2">
          {toast}
        </p>
      )}
      {/* Backdrop — full screen */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel — full screen height */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("renterDashboard.notificationsDrawer.title")}
        className={`fixed inset-y-0 right-0 z-[70] flex w-full flex-col bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:w-1/2 sm:min-w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderRadius: "3rem 0 0 0" }}
      >
        {/* Header — extra top/left padding to clear the 5.5rem corner curve */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.08] px-8 pt-6 pb-3 sm:px-10">
          <div className="flex items-center gap-3">
            <h2 className="font-bricolage text-xl font-medium tracking-tight">
              {t("renterDashboard.notificationsDrawer.title")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/renter-dashboard/account?section=preferences"
              onClick={onClose}
              aria-label={t("renterDashboard.notificationsDrawer.settingsAria")}
              className="text-carbon-400 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-black/[0.055] hover:text-black"
            >
              <Settings className="size-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("renterDashboard.notificationsDrawer.closeAria")}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-black/[0.055]"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Filters + Mark all */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-8 py-3 sm:px-10">
          <div className="flex gap-1">
            {(["all", "unread"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                aria-pressed={filter === f}
                className={`h-8 rounded-full px-3.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-black text-white"
                    : "bg-black/[0.055] text-black hover:bg-black/10"
                }`}
              >
                {f === "all"
                  ? t("renterDashboard.notificationsDrawer.filterAll")
                  : t("renterDashboard.notificationsDrawer.filterUnread")}
                {f === "unread" && unreadCount > 0 ? (
                  <span className={`ml-1.5 inline-flex size-3.5 items-center justify-center rounded-full text-[0.55rem] font-bold ${
                    filter === "unread" ? "bg-white text-black" : "bg-black text-white"
                  }`}>
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {notifications.length > 0 ? (
            <div className="flex gap-3">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-carbon-500 text-xs font-medium underline underline-offset-4 hover:text-black"
                >
                  {t("renterDashboard.notificationsDrawer.markAllRead")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-carbon-500 text-xs font-medium underline underline-offset-4 hover:text-black"
              >
                {t("renterDashboard.notificationsDrawer.clearAll")}
              </button>
            </div>
          ) : null}
        </div>

        {/* Final Presentation Readiness Cleanup -- the drawer stays the quick-
            glance surface; this is the one link out to the full, already-built
            /renter-dashboard/notifications workspace (filters, full history),
            which previously had no entry point anywhere in the product. */}
        {notifications.length > 0 ? (
          <div className="shrink-0 px-8 pb-3 sm:px-10">
            <Link
              href="/renter-dashboard/notifications"
              onClick={onClose}
              className="text-carbon-500 inline-flex items-center gap-1 text-xs font-medium hover:text-black"
            >
              {t("renterDashboard.notificationsDrawer.viewAll")}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        ) : null}

        {/* Feed */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-8 sm:px-10">
          {grouped.length > 0 ? (
            grouped.map(({ group, items }) => (
              <section key={group} className="mb-6">
                <h3 className="mb-2 text-[0.65rem] font-semibold tracking-wider text-black/35 uppercase">
                  {t(GROUP_LABEL_KEYS[group])}
                </h3>
                <div className="flex flex-col gap-2">
                  {items.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => handleClick(n)}
                      onToast={showToast}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : filter === "unread" ? (
            <UnreadEmptyState />
          ) : (
            <AllEmptyState onClose={onClose} />
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Notification row
// ---------------------------------------------------------------------------

function NotificationRow({
  notification: n,
  onClick,
  onToast,
}: {
  notification: Notification;
  onClick: () => void;
  onToast: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex gap-3 rounded-2xl px-4 py-3.5 transition-colors ${
        !n.read
          ? "bg-zinc-100 ring-1 ring-black hover:bg-zinc-200/70"
          : "bg-zinc-50 hover:bg-zinc-100"
      }`}
      style={{ borderTopLeftRadius: "0.5rem", borderBottomRightRadius: "0.5rem" }}
    >
      {/* Hover action buttons — straddling left boundary */}
      {hovered && (
        <div className="absolute -left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearNotification(n.id);
              onToast(t("renterDashboard.notificationsDrawer.notificationCleared"));
            }}
            aria-label={t("renterDashboard.notificationsDrawer.clearAria")}
            className="flex size-4 items-center justify-center rounded-full bg-black/80 text-white backdrop-blur-sm transition-colors hover:bg-black"
          >
            <X className="size-2" />
          </button>
          {!n.read && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markNotificationRead(n.id);
                onToast(t("renterDashboard.notificationsDrawer.markedAsRead"));
              }}
              aria-label={t("renterDashboard.notificationsDrawer.markReadAria")}
              className="flex size-4 items-center justify-center rounded-full bg-black/80 text-white backdrop-blur-sm transition-colors hover:bg-black"
            >
              <Check className="size-2" />
            </button>
          )}
        </div>
      )}
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-black" : "font-medium text-black"}`}>
            {n.title}
          </p>
          <span className="shrink-0 text-[0.7rem] text-black/40">
            {formatTimestamp(n.timestamp)}
          </span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="text-xs leading-relaxed text-black/50">
            {n.body}
          </p>
          {n.actionLabel && n.actionHref ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="shrink-0 text-[0.7rem] font-medium underline underline-offset-4 hover:text-black/60 inline-flex items-center gap-0.5"
            >
              {n.actionLabel} <ArrowUpRight className="size-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Full-row click target */}
      <button
        type="button"
        onClick={onClick}
        aria-label={n.title}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/30"
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function AllEmptyState({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
      <Image
        src={emptyIllustration}
        alt=""
        className="h-36 w-auto object-contain"
      />
      <h3 className="font-bricolage mt-6 text-xl font-medium">
        {t("renterDashboard.notificationsDrawer.emptyAllTitle")}
      </h3>
      <p className="text-carbon-500 mt-2 max-w-[220px] text-sm leading-6">
        {t("renterDashboard.notificationsDrawer.emptyAllDescription")}
      </p>
      <button
        type="button"
        onClick={() => { onClose(); router.push("/renter-dashboard/properties"); }}
        className="mt-6 inline-flex h-10 items-center rounded-full bg-black px-5 text-sm font-medium text-white"
      >
        {t("renterDashboard.notificationsDrawer.browseHomes")}
      </button>
    </div>
  );
}

function UnreadEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
      <Image
        src={emptyIllustration}
        alt=""
        className="h-36 w-auto object-contain"
      />
      <h3 className="font-bricolage mt-6 text-xl font-medium">
        {t("renterDashboard.notificationsDrawer.emptyUnreadTitle")}
      </h3>
      <p className="text-carbon-500 mt-2 max-w-[220px] text-sm leading-6">
        {t("renterDashboard.notificationsDrawer.emptyUnreadDescription")}
      </p>
    </div>
  );
}
