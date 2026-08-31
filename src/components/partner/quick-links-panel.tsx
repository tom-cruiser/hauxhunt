"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Overview Redesign phase -- Joseph's prototype overview had an "Inbox and
// drafts" sidebar panel of quick-link rows, each a dead <button> holding a
// static count ("Unread enquiries 7", "Saved drafts 3" ...). This is the same
// visual row, but every item is a real navigable Link and every value is
// supplied by the caller from its own real, already-scoped data -- never a
// hardcoded number.

export type QuickLinkItem = {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
};

export function QuickLinksPanel({ items }: { items: QuickLinkItem[] }) {
  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
      <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-tight">Quick links</h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex w-full items-center gap-3 rounded-2xl border border-black/10 p-3 text-left transition-colors hover:border-black/30 hover:bg-black/[0.025]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
              <item.icon aria-hidden="true" className="size-4" />
            </span>
            <span className="font-bricolage text-carbon-900 flex-1 text-sm font-medium">{item.label}</span>
            <span className="font-bricolage text-carbon-900 text-sm font-medium">{item.value}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
