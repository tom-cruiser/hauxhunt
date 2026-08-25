"use client";

import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { Bell, ClipboardCheck, CreditCard, FileSignature, Home, UserCog, Wrench } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import {
  getOwnerNotifications,
  getOwnerUnreadNotificationCount,
  markAllOwnerNotificationsRead,
  markOwnerNotificationRead,
  subscribeToOwnerNotifications,
  type OwnerNotification,
  type OwnerNotificationCategory,
} from "@/lib/owner-notifications";

const CATEGORY_ICONS: Record<OwnerNotificationCategory, typeof Bell> = {
  application: ClipboardCheck,
  "rental-setup": FileSignature,
  rental: Home,
  payment: CreditCard,
  maintenance: Wrench,
  management: UserCog,
  listing: Home,
};

type Group = "Today" | "Yesterday" | "Earlier";

function getGroup(timestamp: number): Group {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  return "Earlier";
}

function formatTimestamp(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OwnerNotificationsPage() {
  const router = useRouter();
  const notifications = useSyncExternalStore(subscribeToOwnerNotifications, getOwnerNotifications, getOwnerNotifications);
  const unreadCount = useSyncExternalStore(subscribeToOwnerNotifications, getOwnerUnreadNotificationCount, getOwnerUnreadNotificationCount);

  const handleClick = useCallback(
    (n: OwnerNotification) => {
      markOwnerNotificationRead(n.id);
      if (n.actionHref) router.push(n.actionHref);
    },
    [router],
  );

  const groups: Group[] = ["Today", "Yesterday", "Earlier"];
  const grouped = groups.map((g) => ({ group: g, items: notifications.filter((n) => getGroup(n.timestamp) === g) })).filter((g) => g.items.length > 0);

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[760px]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-8">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">Notifications</h1>
              <p className="text-carbon-500 mt-2 text-sm">Approvals, rent, maintenance, and delegation updates across your portfolio.</p>
            </div>
            {unreadCount > 0 ? (
              <button type="button" onClick={markAllOwnerNotificationsRead} className="text-carbon-500 text-xs font-medium underline underline-offset-4 hover:text-black">
                Mark all as read
              </button>
            ) : null}
          </div>

          <div className="mt-6">
            {grouped.length > 0 ? (
              grouped.map(({ group, items }) => (
                <section key={group} className="mb-8">
                  <h2 className="mb-3 text-xs font-semibold tracking-wider text-black/40 uppercase">{group}</h2>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                    {items.map((n, index) => (
                      <NotificationRow key={n.id} notification={n} isLast={index === items.length - 1} onClick={() => handleClick(n)} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-black/6">
                  <Bell className="size-7 text-black/40" />
                </div>
                <h2 className="font-bricolage mt-6 text-2xl font-medium">You&apos;re all caught up</h2>
                <p className="text-carbon-500 mt-3 max-w-xs text-sm leading-6">Updates about your properties will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

function NotificationRow({
  notification: n,
  isLast,
  onClick,
}: {
  notification: OwnerNotification;
  isLast: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[n.category];
  return (
    <article
      className={`relative flex gap-4 px-5 py-4 transition-colors hover:bg-black/2.5 ${!n.read ? "bg-black/3.5" : "bg-white"} ${!isLast ? "border-b border-black/[0.07]" : ""}`}
    >
      {!n.read ? <span aria-label="Unread" className="absolute top-5 left-2 size-1.5 rounded-full bg-black" /> : null}
      <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${!n.read ? "bg-black text-white" : "bg-black/7 text-black"}`} aria-hidden="true">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {n.urgentLabel ? <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-black/50 uppercase">{n.urgentLabel}</p> : null}
        <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
        <p className="text-carbon-500 mt-0.5 text-sm leading-relaxed">{n.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-carbon-400 text-xs">{formatTimestamp(n.timestamp)}</span>
          {n.actionLabel && n.actionHref ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="text-xs font-medium underline underline-offset-4 hover:text-black/70"
            >
              {n.actionLabel} →
            </button>
          ) : null}
        </div>
      </div>
      <button type="button" onClick={onClick} aria-label={n.title} className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/30" tabIndex={-1} aria-hidden="true" />
    </article>
  );
}
