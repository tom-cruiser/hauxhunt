"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import loginIllustration from "@/assets/images/login.png";
import { useSavedProperty } from "@/hooks/use-saved-properties";

export function SavePropertyButton({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const { saved, toggleSaved: persistSaved } = useSavedProperty(propertyId);
  const [feedback, setFeedback] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    const connectPortal = window.setTimeout(() => setPortalReady(true), 0);
    return () => window.clearTimeout(connectPortal);
  }, []);

  const portalTarget =
    typeof window !== "undefined"
      ? (document.getElementById("toast-portal") ?? document.body)
      : null;

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function toggleSaved() {
    const authenticatedRole = window.sessionStorage.getItem(
      "hauxhunt-authenticated-role",
    );
    if (!authenticatedRole) {
      setAuthPromptOpen(true);
      return;
    }

    const nextSaved = persistSaved();
    setFeedback(
      nextSaved
        ? "Home added to your favourites"
        : "Home removed from your favourites",
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={
          saved
            ? `Remove ${propertyTitle} from favourites`
            : `Add ${propertyTitle} to favourites`
        }
        aria-pressed={saved}
        onClick={toggleSaved}
        className="border-border-default text-carbon-900 flex size-10 items-center justify-center rounded-full border bg-white transition-colors hover:bg-black/5"
      >
        <Heart
          aria-hidden="true"
          className="size-[18px]"
          fill={saved ? "currentColor" : "none"}
        />
      </button>

      {portalReady && portalTarget
        ? createPortal(
            <>
              <AnimatePresence>
                {feedback ? (
                  <motion.div
                    role="status"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="feedback-toast"
                  >
                    {feedback}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {authPromptOpen ? (
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="property-save-auth-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[160] flex items-center justify-center bg-black/30 p-5"
                    onClick={() => setAuthPromptOpen(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 18, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.98 }}
                      className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="relative flex h-48 items-center justify-center bg-black/[0.045] px-8 pt-3">
                        <Image
                          src={loginIllustration}
                          alt=""
                          className="h-full w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setAuthPromptOpen(false)}
                          aria-label="Close"
                          className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 bg-white/80"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <div className="p-7 sm:p-9">
                        <h2
                          id="property-save-auth-title"
                          className="font-bricolage text-3xl leading-tight font-medium tracking-[-0.035em]"
                        >
                          Keep favourite homes with an account.
                        </h2>
                        <p className="text-carbon-600 mt-3 text-sm leading-6">
                          Log in or create a RentUp account to add this home
                          to your favourites and find it again later.
                        </p>
                        <div className="mt-7 flex gap-3">
                          <Link
                            href={`/register?returnTo=${encodeURIComponent("/renter-dashboard/saved")}&save=${encodeURIComponent(propertyId)}${saved ? "&already=1" : ""}`}
                            className="font-bricolage flex h-12 flex-1 items-center justify-center rounded-full border border-black/20 px-5 font-medium"
                          >
                            Sign up
                          </Link>
                          <Link
                            href={`/login?returnTo=${encodeURIComponent("/renter-dashboard/saved")}&save=${encodeURIComponent(propertyId)}${saved ? "&already=1" : ""}`}
                            className="font-bricolage flex h-12 flex-1 items-center justify-center rounded-full bg-black px-5 font-medium text-white"
                          >
                            Log in
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>,
            portalTarget,
          )
        : null}
    </>
  );
}
