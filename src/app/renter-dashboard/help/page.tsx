"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  ChevronLeft,
  CreditCard,
  Home,
  LifeBuoy,
  type LucideIcon,
  MessageCircle,
  Search,
  Settings,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import maintenanceImage from "@/assets/images/maintenance.png";
import cardImage from "@/assets/images/card.png";
import agreedImage from "@/assets/images/agreed.png";
import matchImage from "@/assets/images/match.png";
import settingsImage from "@/assets/images/settings.png";
import listImage from "@/assets/images/list.png";
import getstartedImage from "@/assets/images/getstarted.png";
import applicationImage from "@/assets/images/application-received.png";
import messageImage from "@/assets/images/chat.png";
import supportImage from "@/assets/images/support.png";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { Wordmark } from "@/components/layout/wordmark";

const CATEGORIES: { slug: string; icon: LucideIcon; title: string; description: string; articles: number; image?: string }[] = [
  {
    slug: "getting-started",
    icon: Home,
    title: "Getting Started",
    description: "Set up your account and find your first home on HauxHunt.",
    articles: 8,
  },
  {
    slug: "search-and-listings",
    icon: Search,
    title: "Search & Listings",
    description: "Browse properties, save searches, and request viewings.",
    articles: 12,
  },
  {
    slug: "applications",
    icon: BookOpen,
    title: "Apply to Rentals",
    description: "How to apply to properties and track your applications.",
    articles: 7,
  },
  {
    slug: "payments",
    icon: CreditCard,
    title: "Pay Rent Online",
    description: "Rent payments, receipts, and managing payment methods.",
    articles: 10,
  },
  {
    slug: "maintenance",
    icon: Wrench,
    title: "Maintenance",
    description: "Report issues and track repair requests for your rental.",
    articles: 6,
  },
  {
    slug: "flatmates",
    icon: Users,
    title: "Flatmates",
    description: "Create a profile and connect with potential flatmates.",
    articles: 5,
  },
  {
    slug: "account",
    icon: Settings,
    title: "Account & Settings",
    description: "Manage your profile, security, and notification preferences.",
    articles: 9,
  },
  {
    slug: "messages",
    icon: MessageCircle,
    title: "Messages",
    description: "Communicate with landlords and property managers.",
    articles: 4,
  },
  {
    slug: "trust-and-safety",
    icon: Shield,
    title: "Trust & Safety",
    description: "How to avoid fraud and report suspicious activity.",
    articles: 6,
  },
  {
    slug: "support",
    icon: LifeBuoy,
    title: "Customer Support",
    description: "Can't find what you're looking for? Our team is here to help.",
    articles: 4,
  },
] ;

// Owner Account Polish phase -- Section 24/27: this hub page is the one
// shared Help Center (reused as-is, not duplicated, per the audit -- its
// category/article content is a real, substantial dataset that a second
// Owner-only copy would have needlessly forked). The only adjustment is
// this header: a Renter session keeps the exact catalogue top bar it
// always had; any other authenticated role (Owner today) gets a minimal,
// role-neutral header that returns to their own dashboard instead of
// showing renter-shopping navigation that doesn't apply to them. The
// category cards, search, and every /help/{slug} article underneath are
// completely unchanged for every viewer.
function roleDashboardHome(role: string | null): string {
  if (role === "owner") return "/owner-dashboard";
  if (role === "agent" || role === "property_manager") return "/partner-dashboard";
  return "/renter-dashboard";
}

function MinimalHelpTopBar({ backHref }: { backHref: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-black/10 bg-white px-5 sm:px-6 lg:px-11">
      <Link href={backHref} aria-label="HauxHunt home">
        <Wordmark height={28} />
      </Link>
      <Link href={backHref} className="text-carbon-600 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to Dashboard
      </Link>
    </header>
  );
}

// Hydration-safe: before mount, server and client agree there's no role
// yet (so a Renter's own experience never flickers -- see the render logic
// below), matching this codebase's established useDemoProfessional pattern.
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const mounted = useMounted();
  const role = mounted ? window.sessionStorage.getItem("hauxhunt-authenticated-role") : null;

  const filtered = query.trim()
    ? CATEGORIES.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()),
      )
    : CATEGORIES;

  const audienceLabel = role === "owner" ? "For Property Owners" : role === "agent" ? "For Agents" : role === "property_manager" ? "For Property Managers" : "For Renters";

  return (
    <>
      {role === "renter" || role === null ? <RenterCatalogueTopBar /> : <MinimalHelpTopBar backHref={roleDashboardHome(role)} />}
      <main className="min-h-svh bg-[#f5f5f5] pt-16 text-black">
        {/* Search hero */}
        <section className="px-5 pt-14 pb-16 text-center sm:pt-16 sm:pb-20">
          <h1 className="font-bricolage text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            What are you looking for?
          </h1>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto mt-8 flex max-w-2xl items-center gap-3"
          >
            <span className="catalogue-location-filter flex min-w-0 flex-1 items-center gap-2 px-4" style={{ height: "3.25rem" }}>
              <button
                type="submit"
                aria-label="Search help topics"
                className="text-carbon-500 hover:text-carbon-900 shrink-0 transition-colors"
              >
                <Search aria-hidden="true" className="size-4" />
              </button>
              <input
                type="search"
                placeholder="Search help topics by keyword"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35 [&::-webkit-search-cancel-button]:hidden"
              />
              <VoiceInputButton onTranscript={setQuery} />
            </span>
            <button
              type="submit"
              className="h-[3.25rem] shrink-0 rounded-full bg-black px-8 text-sm font-medium text-white transition-opacity hover:opacity-80"
            >
              Search
            </button>
          </form>
        </section>

        {/* Category grid */}
        <section className="mx-auto max-w-[1100px] px-5 pb-20 sm:px-8">
          <h2 className="font-bricolage mb-8 text-center text-2xl font-bold tracking-[-0.03em]">
            {audienceLabel}
          </h2>

          {filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(({ slug, icon: Icon, title, description, articles }) => (
                <Link
                  key={slug}
                  href={`/renter-dashboard/help/${slug}`}
                  className="flex flex-col rounded-2xl bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.035)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                >
                  {/* Large icon */}
                  {slug === "maintenance" ? (
                    <Image
                      src={maintenanceImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "getting-started" ? (
                    <Image
                      src={getstartedImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "payments" ? (
                    <Image
                      src={cardImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "trust-and-safety" ? (
                    <Image
                      src={agreedImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "flatmates" ? (
                    <Image
                      src={matchImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "account" ? (
                    <Image
                      src={settingsImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "search-and-listings" ? (
                    <Image
                      src={listImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "applications" ? (
                    <Image
                      src={applicationImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "messages" ? (
                    <Image
                      src={messageImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : slug === "support" ? (
                    <Image
                      src={supportImage}
                      alt=""
                      className="mb-6 h-20 w-20 self-center object-contain"
                    />
                  ) : (
                    <span className="mb-6 flex h-20 w-20 items-center justify-center self-center rounded-full bg-black/[0.06]">
                      <Icon className="size-10 text-black" strokeWidth={1.5} />
                    </span>
                  )}
                  <h3 className="font-bricolage text-lg font-bold">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-black/55">{description}</p>
                  <p className="mt-5 text-sm font-medium text-black/40">
                    {articles} articles
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-black/45">
              No results for &ldquo;{query}&rdquo;.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
