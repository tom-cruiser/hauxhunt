"use client";

import { Lock, X } from "lucide-react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

import { GATED_FEATURES, type GatedFeature } from "@/lib/access-control";
import { useMounted } from "@/hooks/use-mounted";

/**
 * The paid-upgrade prompt shown wherever a free-tier user hits a gated
 * action. Copy and the upgrade destination come from the `GATED_FEATURES`
 * registry (`src/lib/access-control.ts`) so every locked control that
 * references the same `feature` id shows identical wording — same portal +
 * `AnimatePresence` shape already used for the auth prompts in
 * `listing-card.tsx` / `request-property-button.tsx`.
 */
export function UpgradeModal({
  feature,
  open,
  onClose,
}: {
  feature: GatedFeature;
  open: boolean;
  onClose: () => void;
}) {
  const copy = GATED_FEATURES[feature];
  const mounted = useMounted();

  if (!mounted) return null;
  const host = document.getElementById("toast-portal") ?? document.body;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl bg-white p-7 text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-9"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 text-black/55 transition-colors hover:border-black/40 hover:text-black"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
            <span className="flex size-12 items-center justify-center rounded-full bg-black text-white">
              <Lock aria-hidden="true" className="size-5" />
            </span>
            <h2
              id="upgrade-modal-title"
              className="font-bricolage mt-5 text-2xl leading-tight font-medium tracking-[-0.02em]"
            >
              {copy.title}
            </h2>
            <p className="text-carbon-600 mt-3 text-sm leading-6">
              {copy.description}
            </p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="font-bricolage h-11 flex-1 rounded-full border border-black/20 text-sm font-medium transition-colors hover:bg-black/[0.04]"
              >
                Not now
              </button>
              <Link
                href={copy.upgradeHref}
                className="font-bricolage flex h-11 flex-1 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition-colors hover:bg-black/80"
              >
                Upgrade to Paid
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    host,
  );
}
