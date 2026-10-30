"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import loginIllustration from "@/assets/images/login.png";
import listingIllustration from "@/assets/images/list.png";
import peopleIllustration from "@/assets/images/people.png";
import benefitIllustration from "@/assets/images/benefit.png";

const PARTNER_OPPORTUNITIES = [
  {
    id: "portfolio-income",
    title: "Help the right renters find your property.",
    description:
      "Present available homes to active renters with the price, location, photos, and details they need to make a decision.",
    image: peopleIllustration,
    alt: "An agency connecting with more property seekers",
  },
  {
    id: "more-placements",
    title: "Turn interest into direct conversations.",
    description:
      "Receive enquiries from interested renters, arrange visits, and keep every conversation connected to the right property.",
    image: listingIllustration,
    alt: "A clear property listing ready for renter enquiries",
  },
  {
    id: "empty-space",
    title: "Reduce vacancy and earn sooner.",
    description:
      "Publish an available home, set the rent, and reach serious renters sooner while staying in control of the listing.",
    image: benefitIllustration,
    alt: "Rental income earned from an occupied property",
  },
] as const;

function subscribeToAccountRole(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function PublicListingGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const accountRole = useSyncExternalStore(
    subscribeToAccountRole,
    () => window.sessionStorage.getItem("hauxhunt-authenticated-role"),
    () => undefined,
  );
  const returnTo = encodeURIComponent("/partner-dashboard/listings/new");

  useEffect(() => {
    if (
      accountRole === "property_manager" ||
      accountRole === "agent" ||
      accountRole === "agency"
    ) {
      router.replace("/partner-dashboard/listings/new");
    }
  }, [accountRole, router]);

  function closeDialog() {
    setOpen(false);
  }

  return (
    <>
      {accountRole !== undefined ? (
        <div className="mx-auto w-[calc(100%-2.5rem)] max-w-[1200px] py-14 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-6.5rem)] lg:py-20">
          <header className="mx-auto max-w-3xl text-center">
            <h1 className="font-bricolage text-4xl leading-[1.04] font-medium tracking-[-0.045em] sm:text-5xl">
              Put your properties to work.
            </h1>
            <p className="text-carbon-600 mx-auto mt-4 max-w-2xl leading-7">
              Reach active renters across Rwanda, Nigeria, and Kenya and turn
              available homes into reliable rental income.
            </p>
          </header>

          <div className="mt-12 space-y-5">
            {PARTNER_OPPORTUNITIES.map((opportunity, index) => (
              <section
                key={opportunity.id}
                className="grid overflow-hidden rounded-[2rem] lg:min-h-[330px] lg:grid-cols-2"
              >
                <div
                  className={`relative min-h-64 sm:min-h-72 ${index % 2 ? "lg:order-2" : ""}`}
                >
                  <Image
                    src={opportunity.image}
                    alt={opportunity.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-contain p-6 sm:p-9"
                  />
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
                  <h2 className="font-bricolage max-w-lg text-3xl leading-tight font-medium tracking-[-0.035em]">
                    {opportunity.title}
                  </h2>
                  <p className="text-carbon-600 mt-4 max-w-lg leading-7">
                    {opportunity.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted mt-7 inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full border bg-transparent px-6 font-medium transition-colors duration-150"
                  >
                    Start earning
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-auth-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 p-5"
            onClick={closeDialog}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
                  onClick={closeDialog}
                  aria-label="Close"
                  className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 bg-white/80"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-7 sm:p-9">
                <h2
                  id="listing-auth-title"
                  className="font-bricolage text-3xl leading-tight font-medium tracking-[-0.035em]"
                >
                  {accountRole === "renter"
                    ? "Switch to a partner account."
                    : "Sign in to start listing."}
                </h2>
                <p className="text-carbon-600 mt-3 text-sm leading-6">
                  {accountRole === "renter"
                    ? "Property listings are managed through Property Manager, Agent, or Agency accounts. Create a partner account to continue."
                    : "Log in or create a RentUp partner account before adding and managing a property listing."}
                </p>
                <div className="mt-7 flex gap-3">
                  <Link
                    href={`/register?returnTo=${returnTo}`}
                    className="font-bricolage flex h-12 flex-1 items-center justify-center rounded-full border border-black/20 px-5 font-medium"
                  >
                    {accountRole === "renter" ? "Become a partner" : "Sign up"}
                  </Link>
                  <Link
                    href={`/login?returnTo=${returnTo}`}
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
    </>
  );
}
