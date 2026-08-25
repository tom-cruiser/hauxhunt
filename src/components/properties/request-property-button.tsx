"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import loginIllustration from "@/assets/images/login.png";
import { useTranslation } from "@/components/language/use-translation";

export function RequestPropertyButton({
  className,
  label,
  showIcon = true,
}: {
  className?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleClick() {
    const role = window.sessionStorage.getItem("hauxhunt-authenticated-role");
    if (role) {
      window.location.assign("/renter-dashboard/saved-searches?tab=requests");
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleClick()}
        className={className}
      >
        {label ?? t("common.requestProperty")}
        {showIcon && <ArrowUpRight aria-hidden="true" className="size-4" />}
      </button>

      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[160] flex items-center justify-center bg-black/30 p-5"
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="request-auth-title"
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
                  onClick={(e) => e.stopPropagation()}
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
                      aria-label={t("common.close")}
                      className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 bg-white/80"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <div className="p-7 sm:p-9">
                    <h2
                      id="request-auth-title"
                      className="font-bricolage text-3xl leading-tight font-medium tracking-[-0.035em]"
                    >
                      {t("requestPropertyDialog.title")}
                    </h2>
                    <p className="text-carbon-600 mt-3 text-sm leading-6">
                      {t("requestPropertyDialog.description")}
                    </p>
                    <div className="mt-7 flex gap-3">
                      <Link
                        href={`/register?returnTo=${encodeURIComponent("/renter-dashboard/saved-searches?tab=requests")}`}
                        className="font-bricolage flex h-12 flex-1 items-center justify-center rounded-full border border-black/20 px-5 font-medium"
                      >
                        {t("common.signUp")}
                      </Link>
                      <Link
                        href={`/login?returnTo=${encodeURIComponent("/renter-dashboard/saved-searches?tab=requests")}`}
                        className="font-bricolage flex h-12 flex-1 items-center justify-center rounded-full bg-black px-5 font-medium text-white"
                      >
                        {t("common.logIn")}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
