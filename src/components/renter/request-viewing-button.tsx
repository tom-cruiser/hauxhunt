"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import scheduleIllustration from "@/assets/images/schedule.png";
import loginIllustration from "@/assets/images/login.png";
import { addViewingRequest } from "@/hooks/use-viewing-requests";
import {
  applyViewingFeeCap,
  PAID_TENANT_VIEWING_FEE_CAP_RWF,
} from "@/lib/access-control";
import { isPaidTier, useTier } from "@/hooks/use-tier";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

const TIMES = ["09:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];

/**
 * Stand-in for a real per-listing viewing fee, which doesn't exist in the
 * data model yet (no `ViewingRequest`/property field carries one — see
 * `src/hooks/use-viewing-requests.ts`). Deterministic on `propertyId` only
 * so the same property always quotes the same "market rate" rather than a
 * different number every render.
 */
function demoMarketFeeRwf(propertyId: string): number {
  let hash = 0;
  for (const char of propertyId) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 6000;
  }
  return 3000 + hash;
}

export function RequestViewingButton({
  propertyId,
  title,
  location,
  compact = false,
}: {
  propertyId: string;
  title: string;
  location: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [date, setDate] = useState("2026-08-24");
  const [time, setTime] = useState("10:30 AM");
  const [note, setNote] = useState("");
  const [mounted, setMounted] = useState(false);

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
  const tier = useTier();
  const marketFeeRwf = useMemo(() => demoMarketFeeRwf(propertyId), [propertyId]);
  const viewingFeeRwf = applyViewingFeeCap(marketFeeRwf, tier);
  const feeIsCapped = viewingFeeRwf < marketFeeRwf;

  function submit() {
    const result = addViewingRequest({
      propertyId,
      title,
      location,
      date,
      time,
      note,
    });
    setDuplicate(!result.created);
    if (!result.created) {
      setDate(result.request.date);
      setTime(result.request.time);
    }
    setSent(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setDuplicate(false);
          setOpen(true);
        }}
        className={`${compact ? "h-11 gap-1 px-2" : "mt-6 h-12 gap-2 px-6"} flex w-full items-center justify-center rounded-full bg-black text-sm font-medium whitespace-nowrap text-white`}
      >
        <CalendarDays className="size-4" /> Request Viewing
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 p-5"
          onMouseDown={() => setOpen(false)}
        >
          {isGuest ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="viewing-auth-title"
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
                  id="viewing-auth-title"
                  className="font-bricolage text-3xl leading-tight font-medium tracking-[-0.035em]"
                >
                  Sign in to request a viewing
                </h2>
                <p className="text-carbon-600 mt-3 text-sm leading-6">
                  Create an account or log in to schedule a viewing and connect with the property representative.
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
          ) : (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-viewing-title"
              onMouseDown={(event) => event.stopPropagation()}
              className="grid w-full max-w-xl overflow-hidden bg-white shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
            >
              <div className="relative flex h-36 items-center justify-center bg-black/[0.06] p-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close request viewing dialog"
                  className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black"
                >
                  <X className="size-5" />
                </button>
                <Image
                  src={scheduleIllustration}
                  alt="Calendar and clock illustration"
                  className="h-28 w-auto object-contain"
                />
              </div>
              <div className="p-5 sm:p-6">
                <div>
                  <h2
                    id="request-viewing-title"
                    className="font-bricolage text-2xl font-medium tracking-[-0.025em]"
                  >
                    {sent
                      ? duplicate
                        ? "Viewing already requested"
                        : "Viewing request sent"
                      : "Request a Viewing"}
                  </h2>
                  {!sent ? (
                    <p className="text-carbon-500 mt-2 text-sm">
                      {title} · {location}
                    </p>
                  ) : null}
                  {!sent ? (
                    <p className="mt-3 text-sm">
                      <span className="font-medium">
                        Viewing fee: {viewingFeeRwf.toLocaleString()} RWF
                      </span>
                      {feeIsCapped ? (
                        <span className="text-carbon-500">
                          {" "}
                          (capped for Paid members — market rate is{" "}
                          {marketFeeRwf.toLocaleString()} RWF)
                        </span>
                      ) : isPaidTier(tier) ? (
                        <span className="text-carbon-500">
                          {" "}
                          — already under your Paid cap of{" "}
                          {PAID_TENANT_VIEWING_FEE_CAP_RWF.toLocaleString()}{" "}
                          RWF.
                        </span>
                      ) : (
                        <span className="text-carbon-500">
                          {" "}
                          — market rate. Paid members never pay more than{" "}
                          {PAID_TENANT_VIEWING_FEE_CAP_RWF.toLocaleString()}{" "}
                          RWF.
                        </span>
                      )}
                    </p>
                  ) : null}
                </div>
                {sent ? (
                  <div className="mt-4">
                    <p className="text-carbon-600 text-sm leading-6">
                      {duplicate
                        ? "You already have a pending viewing request for this property. Open My Viewings to review or change it."
                        : "Your requested time has been sent to the property representative. We'll let you know when it's confirmed."}
                    </p>
                    <div className="mt-4 py-3">
                      <p className="text-carbon-500 text-xs">Property</p>
                      <p className="font-bricolage mt-1 font-medium">{title}</p>
                      <p className="text-carbon-500 mt-1 text-sm">{location}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4">
                        <div>
                          <p className="text-carbon-500 flex items-center gap-1.5 text-xs">
                            <CalendarDays className="size-3.5" /> Requested date
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {formatViewingDate(date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-carbon-500 flex items-center gap-1.5 text-xs">
                            <Clock3 className="size-3.5" /> Requested time
                          </p>
                          <p className="mt-1 text-sm font-medium">{time}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="h-11 rounded-full border border-black/15 px-5 text-sm font-medium"
                      >
                        Back to Listing
                      </button>
                      <Link
                        href="/renter-dashboard/visits"
                        className="inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white"
                      >
                        View My Viewings
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Select a date
                      </span>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-black/15 px-4 text-sm outline-none focus:border-black"
                      />
                    </label>
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium">Select a time</p>
                      <div className="grid grid-cols-4 gap-2">
                        {TIMES.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setTime(slot)}
                            className={`h-10 rounded-full border text-sm ${time === slot ? "border-black bg-black text-white" : "border-black/15"}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium">
                        Optional message
                      </span>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="I'd like to ask about parking and the minimum lease period."
                        className="min-h-16 w-full resize-none rounded-2xl border border-black/15 p-3 text-sm outline-none focus:border-black"
                      />
                    </label>
                    <div className="mt-5 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="h-11 rounded-full border border-black/15 px-5 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submit}
                        className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white"
                      >
                        Request Viewing
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

function formatViewingDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
}
