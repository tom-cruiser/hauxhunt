"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";

const CATEGORY_DATA: Record<
  string,
  { title: string; description: string; articles: { slug: string; title: string; summary: string }[] }
> = {
  "getting-started": {
    title: "Getting Started",
    description: "Everything you need to set up your account and start finding a home.",
    articles: [
      { slug: "create-account", title: "How to create a RentUp account", summary: "Step-by-step guide to signing up as a renter." },
      { slug: "complete-profile", title: "Completing your renter profile", summary: "Add your preferences so we can show you the best matches." },
      { slug: "verify-identity", title: "Verifying your identity", summary: "Why we verify renters and how to complete the process." },
      { slug: "download-app", title: "Downloading the RentUp app", summary: "Get the app on iOS and Android." },
      { slug: "set-currency", title: "Changing your display currency", summary: "View prices in USD, RWF, NGN, or KES." },
      { slug: "notifications", title: "Setting up notifications", summary: "Stay updated on new listings and application changes." },
      { slug: "dashboard-overview", title: "Overview of your renter dashboard", summary: "A tour of all the sections in your dashboard." },
      { slug: "delete-account", title: "Deleting your account", summary: "How to permanently remove your RentUp account." },
    ],
  },
  "search-and-listings": {
    title: "Search & Listings",
    description: "Find properties, filter results, and request viewings.",
    articles: [
      { slug: "search-properties", title: "How to search for properties", summary: "Use filters and voice search to find your ideal home." },
      { slug: "save-property", title: "How to save a property to favourites", summary: "Keep track of homes you're interested in." },
      { slug: "save-search", title: "Saving a search for alerts", summary: "Get notified when new properties match your criteria." },
      { slug: "request-viewing", title: "Requesting a property viewing", summary: "Schedule a visit directly through RentUp." },
      { slug: "property-details", title: "Understanding a property listing", summary: "What each field on a listing page means." },
      { slug: "map-view", title: "Using the map view", summary: "Browse properties on an interactive map." },
      { slug: "property-request", title: "Creating a property request", summary: "Let agents come to you with matching properties." },
      { slug: "listing-unavailable", title: "What to do if a listing is unavailable", summary: "Steps to take when a property is no longer listed." },
      { slug: "currency-display", title: "Viewing prices in your currency", summary: "Switch between supported currencies on any listing." },
      { slug: "trending-locations", title: "Trending locations on RentUp", summary: "Discover popular areas in Kigali, Lagos, and Nairobi." },
      { slug: "furnished-vs-unfurnished", title: "Furnished vs unfurnished listings", summary: "What to expect from each type of listing." },
      { slug: "contact-landlord", title: "Contacting a landlord or agent", summary: "How to reach out about a property you're interested in." },
    ],
  },
  "applications": {
    title: "Applications",
    description: "Submit and track your rental applications.",
    articles: [
      { slug: "submit-application", title: "How to submit a rental application", summary: "A guide to applying for a property on RentUp." },
      { slug: "application-status", title: "Checking your application status", summary: "Understand what each status means." },
      { slug: "documents-required", title: "Documents required for an application", summary: "What landlords typically ask for." },
      { slug: "withdraw-application", title: "Withdrawing an application", summary: "How to cancel an application you've submitted." },
      { slug: "multiple-applications", title: "Applying to multiple properties", summary: "Can you apply to more than one property at a time?" },
      { slug: "application-declined", title: "What to do if your application is declined", summary: "Next steps after a rejection." },
      { slug: "rental-invitation", title: "Accepting a rental invitation", summary: "What happens when a landlord invites you to rent." },
    ],
  },
  "payments": {
    title: "Payments & Billing",
    description: "Manage rent payments, receipts, and payment methods.",
    articles: [
      { slug: "pay-rent", title: "How to pay rent through RentUp", summary: "Step-by-step guide to making a rent payment." },
      { slug: "payment-methods", title: "Supported payment methods", summary: "Mobile money, cards, and bank transfers." },
      { slug: "add-payment-method", title: "Adding a payment method", summary: "How to add mobile money, a card, or a bank account." },
      { slug: "payment-failed", title: "What to do if a payment fails", summary: "Troubleshooting failed transactions." },
      { slug: "receipts", title: "Downloading payment receipts", summary: "Access and download your rent receipts." },
      { slug: "payment-history", title: "Viewing your payment history", summary: "See all past transactions in one place." },
      { slug: "late-payment", title: "Late payment fees and policies", summary: "What happens if rent is paid after the due date." },
      { slug: "refunds", title: "Requesting a refund", summary: "When and how refunds are processed." },
      { slug: "currency-conversion", title: "Currency conversion and exchange rates", summary: "How RentUp handles multi-currency payments." },
      { slug: "security-deposit", title: "Security deposits on RentUp", summary: "How deposits are collected and returned." },
    ],
  },
  "maintenance": {
    title: "Maintenance",
    description: "Report issues and track repair requests for your rental.",
    articles: [
      { slug: "report-issue", title: "How to report a maintenance issue", summary: "Submit a request directly from your dashboard." },
      { slug: "track-request", title: "Tracking a maintenance request", summary: "Follow the progress of your repair." },
      { slug: "urgent-issues", title: "Reporting urgent maintenance issues", summary: "What to do in an emergency." },
      { slug: "add-photos", title: "Adding photos to a maintenance request", summary: "Help your property manager understand the issue faster." },
      { slug: "cancel-request", title: "Cancelling a maintenance request", summary: "How to withdraw a request you no longer need." },
      { slug: "contact-manager", title: "Contacting your property manager about maintenance", summary: "Message your manager directly from a request." },
    ],
  },
  "flatmates": {
    title: "Flatmates",
    description: "Find compatible flatmates and manage your profile.",
    articles: [
      { slug: "create-profile", title: "How to create a flatmate profile", summary: "Set up your profile to appear in flatmate searches." },
      { slug: "browse-flatmates", title: "Browsing flatmate profiles", summary: "Find people looking for a shared home." },
      { slug: "match-score", title: "Understanding your match score", summary: "How RentUp calculates compatibility." },
      { slug: "contact-flatmate", title: "Contacting a potential flatmate", summary: "How to reach out to someone you're interested in." },
      { slug: "remove-profile", title: "Removing your flatmate profile", summary: "How to unpublish your profile." },
    ],
  },
  "messages": {
    title: "Messages",
    description: "Communicate with landlords, agents, and property managers.",
    articles: [
      { slug: "send-message", title: "Sending a message on RentUp", summary: "How to start a conversation with a landlord or agent." },
      { slug: "message-notifications", title: "Message notifications", summary: "Get alerted when you receive a new message." },
      { slug: "block-user", title: "Blocking a user", summary: "How to stop receiving messages from someone." },
      { slug: "report-message", title: "Reporting an inappropriate message", summary: "Flag messages that violate our community guidelines." },
    ],
  },
  "trust-and-safety": {
    title: "Trust & Safety",
    description: "How to avoid fraud and report suspicious activity on RentUp.",
    articles: [
      { slug: "avoid-fraud", title: "How to avoid rental fraud", summary: "Tips for spotting and avoiding scams." },
      { slug: "report-listing", title: "Reporting a suspicious listing", summary: "Flag listings that seem fraudulent or misleading." },
      { slug: "report-user", title: "Reporting a user", summary: "How to report someone who has behaved inappropriately." },
      { slug: "safe-payments", title: "Making safe payments", summary: "Only pay through RentUp to stay protected." },
      { slug: "data-privacy", title: "Your data and privacy", summary: "How RentUp handles your personal information." },
      { slug: "account-security", title: "Keeping your account secure", summary: "Best practices for a safe RentUp account." },
    ],
  },
  "support": {
    title: "Customer Support",
    description: "Can't find what you're looking for? Our support team is here to help.",
    articles: [
      { slug: "contact-support", title: "How to contact support", summary: "Ways to reach the RentUp support team." },
      { slug: "response-times", title: "Support response times", summary: "When to expect a reply from our team." },
      { slug: "submit-complaint", title: "Submitting a complaint", summary: "How to formally raise an issue with RentUp." },
      { slug: "feedback", title: "Sending product feedback", summary: "Share ideas and suggestions with our product team." },
    ],
  },
  "account": {
    title: "Account & Settings",
    description: "Manage your profile, security, and notification preferences.",
    articles: [
      { slug: "update-profile", title: "Updating your personal information", summary: "Change your name, email, phone, and country." },
      { slug: "change-password", title: "Changing your password", summary: "Keep your account secure with a strong password." },
      { slug: "two-factor", title: "Setting up two-factor authentication", summary: "Add an extra layer of security to your account." },
      { slug: "active-sessions", title: "Managing active sessions", summary: "See and log out of devices where you're signed in." },
      { slug: "notification-preferences", title: "Notification preferences", summary: "Control which alerts you receive and how." },
      { slug: "change-language", title: "Changing your language", summary: "Switch between English, French, and Kinyarwanda." },
      { slug: "change-currency", title: "Changing your display currency", summary: "Set your preferred currency for prices." },
      { slug: "privacy-settings", title: "Privacy settings", summary: "Control what information is visible to others." },
      { slug: "delete-account", title: "Deleting your account", summary: "Permanently remove your account and data." },
    ],
  },
};

export default function HelpCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const data = CATEGORY_DATA[category];
  if (!data) notFound();

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="px-5 pt-9 pb-7 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[860px]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-black/45">
              <Link href="/renter-dashboard/help" className="hover:text-black">Help Center</Link>
              <ChevronRight className="size-3.5" />
              <span className="text-black">{data.title}</span>
            </nav>
            <h1 className="dashboard-page-title mt-4">{data.title}</h1>
            <p className="text-carbon-500 mt-2 text-sm">{data.description}</p>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[860px]">
            <div className="divide-y divide-black/10 rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
              {data.articles.map(({ slug, title, summary }) => (
                <Link
                  key={slug}
                  href={`/renter-dashboard/help/${category}/${slug}`}
                  className="flex items-start justify-between gap-4 px-6 py-5 transition-colors hover:bg-black/[0.03] first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-carbon-500 mt-1 text-sm">{summary}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-black/35" />
                </Link>
              ))}
            </div>

            <div className="mt-10 rounded-[1.5rem] bg-black px-7 py-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div>
                <p className="font-bricolage text-lg font-medium">Didn&apos;t find what you need?</p>
                <p className="mt-1 text-sm text-white/60">Our support team is happy to help.</p>
              </div>
              <Link
                href="/renter-dashboard/messages?chat=hauxhunt-concierge"
                className="mt-5 inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-opacity hover:opacity-80 sm:mt-0"
              >
                Contact Support <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
