"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import loginIllustration from "@/assets/images/login.png";
import { recordSentMessage, slugify } from "@/lib/message-threads";
import { canMessageAgent } from "@/lib/access-control";
import {
  getAgentsMessagedThisMonth,
  recordAgentMessaged,
} from "@/lib/tenant-messaging-limit";
import { useTier } from "@/hooks/use-tier";
import { UpgradeModal } from "@/components/tier/upgrade-modal";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function ContactPropertyManagerForm({
  managerName,
  propertyTitle,
  propertyId,
}: {
  managerName: string;
  propertyTitle?: string;
  propertyId?: string;
}) {
  const [sent, setSent] = useState(false);
  const threadId = `landlord-${slugify(propertyTitle || managerName)}`;
  const [open, setOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [country, setCountry] = useState<"UG" | "RW" | "NG">("UG");
  const [mounted, setMounted] = useState(false);
  const countryCodes = { UG: "+256", RW: "+250", NG: "+234" } as const;
  const tier = useTier();

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem("hauxhunt-authenticated-role"),
    () => null,
  );

  const isGuest = !role;
  const returnTo = mounted && typeof window !== "undefined"
    ? encodeURIComponent(window.location.pathname + window.location.search)
    : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGuest) {
      setOpen(true);
      return;
    }
    // Tenant tier gate: free tenants may message up to 3 distinct
    // agents/landlords per month (access-control.ts). Re-messaging one
    // already on the list never counts twice.
    const agentsMessaged = getAgentsMessagedThisMonth();
    if (!canMessageAgent(tier, threadId, agentsMessaged)) {
      setLimitOpen(true);
      return;
    }
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") ?? "");
    recordAgentMessaged(threadId);
    recordSentMessage(
      {
        id: threadId,
        name: managerName,
        role: "Property Manager",
        showPhone: true,
        subtitle: propertyTitle ? `${propertyTitle} · Property Manager` : "Property Manager",
        metaContext: "Listing Enquiry",
        type: "manager",
        context: {
          type: "property-enquiry",
          propertyName: propertyTitle,
          propertyId,
        },
      },
      message
    );
    form.reset();
    setCountry("UG");
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="font-bricolage text-carbon-900 mb-2 block text-sm font-medium">
          Your name
        </span>
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Your name"
          className="contact-field-control border-border-default text-carbon-900 placeholder:text-carbon-400 h-11 w-full rounded-xl border bg-white px-4 text-sm transition-colors outline-none focus:border-black"
        />
      </label>

      <fieldset>
        <legend className="font-bricolage text-carbon-900 mb-2 text-sm font-medium">
          Phone number
        </legend>
        <div className="grid grid-cols-[82px_1fr] gap-2">
          <label className="sr-only" htmlFor="contact-country">
            Country
          </label>
          <span className="relative">
            <select
              id="contact-country"
              name="country"
              value={country}
              onChange={(event) =>
                setCountry(event.target.value as "UG" | "RW" | "NG")
              }
              className="contact-field-control border-border-default text-carbon-900 h-11 w-full appearance-none rounded-xl border bg-white py-0 pr-8 pl-3 text-sm outline-none focus:border-black"
            >
              <option value="UG">UG</option>
              <option value="RW">RW</option>
              <option value="NG">NG</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="text-carbon-500 pointer-events-none absolute top-1/2 left-10 size-4 -translate-y-1/2"
            />
          </span>
          <label className="border-border-default flex h-11 min-w-0 items-center rounded-xl border bg-white focus-within:border-black">
            <span className="border-border-subtle text-carbon-500 border-r px-3 text-sm">
              {countryCodes[country]}
            </span>
            <span className="sr-only">Phone number</span>
            <input
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="700000000"
              className="contact-field-control text-carbon-900 placeholder:text-carbon-400 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="font-bricolage text-carbon-900 mb-2 block text-sm font-medium">
          Your message
        </span>
        <textarea
          name="message"
          required
          rows={4}
          placeholder={`Write a message to ${managerName}`}
          className="contact-field-control border-border-default text-carbon-900 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm leading-6 transition-colors outline-none focus:border-black"
        />
      </label>

      <button
        type="submit"
        className="font-bricolage bg-carbon-900 flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-medium text-white transition-colors hover:bg-black"
      >
        {sent ? <Check aria-hidden="true" className="size-4" /> : null}
        {sent ? "Message sent" : "Send message"}
      </button>

      {sent ? (
        <div role="status" className="rounded-2xl border border-black/10 bg-black/2 p-5 text-center">
          <p className="font-bricolage text-base font-semibold text-black">Message Sent</p>
          <p className="text-carbon-600 mt-1 text-sm">
            Your message was sent to {managerName}.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href={`/renter-dashboard/messages?chat=${threadId}`}
              className="font-bricolage flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white"
            >
              View Conversation
            </Link>
          </div>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 p-5"
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-auth-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
          >
            <div className="relative flex h-48 items-center justify-center bg-black/[0.045] px-8 pt-3">
              <Image
                src={loginIllustration}
                alt=""
                className="h-full w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 bg-white/80"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="p-7 sm:p-9">
              <h2
                id="contact-auth-title"
                className="font-bricolage text-3xl leading-tight font-medium tracking-[-0.035em]"
              >
                Sign in to send a message
              </h2>
              <p className="text-carbon-600 mt-3 text-sm leading-6">
                Create an account or log in to send enquiries, ask questions, and connect directly with the property manager.
              </p>
              <div className="mt-7 flex justify-end gap-3">
                <Link
                  href={`/register?returnTo=${returnTo}`}
                  className="font-bricolage flex h-12 items-center justify-center rounded-full border border-black/20 px-5 font-medium"
                >
                  Create Account
                </Link>
                <Link
                  href={`/login?returnTo=${returnTo}`}
                  className="font-bricolage flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <UpgradeModal
        feature="tenant.agentMessaging"
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
      />
    </form>
  );
}
