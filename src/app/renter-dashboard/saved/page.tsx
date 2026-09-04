"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import house5 from "@/assets/images/house5.jpg";
import house6 from "@/assets/images/house6.jpeg";
import emptyIllustration from "@/assets/images/empty.png";
import { ListingCard } from "@/components/sections/featured-listings/listing-card";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { DEMO_LISTINGS } from "@/data/hero-search-demo";
import { useSavedProperties } from "@/hooks/use-saved-properties";
import { useTranslation } from "@/components/language/use-translation";

const LISTING_IMAGES: Record<string, StaticImageData> = {
  "kacyiru-2br": house1,
  "nyarutarama-2br": house2,
  "remera-3br": house3,
  "wuse-1br": house4,
  "lekki-2br": house5,
  "ikoyi-3br": house6,
  "kibagabaga-modern-family-home": house1,
  "lekki-contemporary-duplex": house2,
  "gisenyi-lakefront-residence": house3,
  "nyarutarama-garden-penthouse": house4,
  "maitama-quiet-city-villa": house5,
  "ikoyi-waterfront-apartment": house6,
  "karongi-hillside-family-house": house2,
  "gisenyi-lake-view-apartment": house3,
  "kibagabaga-family-home-sale": house1,
  "remera-garden-house-sale": house3,
  "gisenyi-lake-residence-sale": house2,
};

export default function SavedHomesPage() {
  const { propertyIds } = useSavedProperties();
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [saveFeedback, setSaveFeedback] = useState("");

  useEffect(() => {
    const saveStatus = new URLSearchParams(window.location.search).get("saved");
    if (saveStatus !== "1" && saveStatus !== "already") return;

    const showFeedback = window.setTimeout(() => {
      setSaveFeedback(
        saveStatus === "already"
          ? "This home is already in your favourites"
          : "Home added to your favourites",
      );
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("saved");
      window.history.replaceState(
        {},
        "",
        `${cleanUrl.pathname}${cleanUrl.search}`,
      );
    }, 0);
    const hideFeedback = window.setTimeout(() => setSaveFeedback(""), 3000);
    return () => {
      window.clearTimeout(showFeedback);
      window.clearTimeout(hideFeedback);
    };
  }, []);
  const orderedPropertyIds =
    sortOrder === "newest" ? [...propertyIds].reverse() : propertyIds;
  const savedListings = orderedPropertyIds.flatMap((id) => {
    const listing = DEMO_LISTINGS.find((property) => property.id === id);
    return listing ? [listing] : [];
  });

  return (
    <>
      {saveFeedback ? (
        <div role="status" className="feedback-toast">
          {saveFeedback}
        </div>
      ) : null}
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16">
        <section className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px] border-b border-black/10 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="dashboard-page-title text-carbon-900">
                Favourite Homes
              </h1>
              {savedListings.length ? (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <span>Sort:</span>
                  <span className="relative block">
                    <select
                      value={sortOrder}
                      onChange={(event) =>
                        setSortOrder(event.target.value as "newest" | "oldest")
                      }
                      className="catalogue-filter-control h-11 appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-black/55"
                    />
                  </span>
                </label>
              ) : null}
            </div>
            <p className="text-carbon-500 mt-3 max-w-xl text-sm leading-6">
              Keep promising homes together, revisit their details, and remove
              any that no longer fit.
            </p>
          </div>
        </section>

        <section className="px-5 pt-4 pb-10 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {savedListings.length ? (
              <>
                <p className="text-carbon-500 mb-4 text-sm">
                  {savedListings.length}{" "}
                  {savedListings.length === 1
                    ? "favourite home"
                    : "favourite homes"}
                </p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {savedListings.map((property, index) => (
                    <ListingCard
                      key={property.id}
                      propertyId={property.id}
                      title={property.title}
                      location={property.location}
                      price={`${property.currency} ${property.price.toLocaleString()}`}
                      period="per month"
                      bedrooms={property.bedrooms}
                      bathrooms={Math.max(1, property.bedrooms - 1)}
                      area={62 + index * 18}
                      furnished={property.amenities.includes("Furnished")}
                      saves={12 + ((index * 17) % 71)}
                      image={LISTING_IMAGES[property.id] ?? house1}
                      href={`/properties/${property.id}?from=renter`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
                <Image
                  src={emptyIllustration}
                  alt="No favourite homes"
                  className="h-44 w-auto object-contain"
                />
                <h2 className="font-bricolage text-carbon-900 mt-5 text-2xl font-medium">
                  No favourite homes yet
                </h2>
                <p className="text-carbon-500 mt-2 max-w-md text-sm leading-6">
                  Tap the heart on a home you like and it will appear here for
                  easy comparison.
                </p>
                <Link
                  href="/renter-dashboard/properties"
                  className="font-bricolage mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white"
                >
                  Explore homes{" "}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
