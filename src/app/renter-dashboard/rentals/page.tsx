"use client";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { BadgeCheck, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import emptyIllustration from "@/assets/images/empty.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { DEMO_LISTINGS } from "@/data/hero-search-demo";
import { RENTER_APPLICATIONS } from "@/data/renter-applications";
import {
  RENTER_RENTALS,
  type RentalStatus,
  type RenterRental,
} from "@/data/renter-rentals";
import {
  BASE_OWNER_PROPERTIES,
  RENTER_DEMO_NAME,
  getOwnerRentals,
  subscribeToOwnerRentals,
} from "@/lib/owner-data";
import {
  getIndependentProperty,
  resolveAnyPropertyLocation,
  resolveAnyPropertyTitle,
} from "@/lib/professional-properties";
import { getRentalSetupByAnyId, subscribeToPmWork } from "@/lib/pm-work";

const images: StaticImageData[] = [house1, house2, house3, house4];
type RentalTab = "current" | "past";
type StatusFilter = "all" | RentalStatus;
const STATUS_OPTIONS: StatusFilter[] = [
  "all",
  "Upcoming",
  "Active",
  "Ending Soon",
  "Ended",
];
const tabFor = (status: RentalStatus): RentalTab =>
  status === "Ended" ? "past" : "current";
const monthlyRentAmount = (rent: string) =>
  rent.replace(/\s*\/\s*month\s*$/i, "");
const subscribeToHydration = () => () => {};

// Cross-Role Lifecycle Synchronization phase -- Section 18: My Rentals now
// reflects the SAME OwnerRental records PM/Owner see, for matching ids
// (overlay) and for any new rental a PM's Rental Setup created (append) --
// never a second, disconnected renter-only rental list. Visual design and
// the existing table layout are unchanged; only the data source is fixed.
function resolvePropertyFacts(propertyId: string): {
  beds: number;
  baths: number;
  furnished: boolean;
} {
  const owned = BASE_OWNER_PROPERTIES.find((p) => p.id === propertyId);
  if (owned)
    return {
      beds: owned.bedrooms,
      baths: owned.bathrooms,
      furnished: owned.amenities.includes("Furnished"),
    };
  const independent = getIndependentProperty(propertyId);
  if (independent)
    return {
      beds: independent.bedrooms,
      baths: independent.bathrooms,
      furnished: independent.furnished,
    };
  const publicListing = DEMO_LISTINGS.find((item) => item.id === propertyId);
  if (publicListing)
    return {
      beds: publicListing.bedrooms,
      baths: 0,
      furnished: publicListing.amenities.includes("Furnished"),
    };
  return { beds: 0, baths: 0, furnished: false };
}

export function withSharedRentals(base: RenterRental[]): RenterRental[] {
  const live = getOwnerRentals()
    .filter((r) => r.renter === RENTER_DEMO_NAME)
    .reduce<ReturnType<typeof getOwnerRentals>>((unique, rental) => {
      const duplicateIndex = unique.findIndex(
        (item) =>
          item.propertyId === rental.propertyId &&
          item.start === rental.start &&
          item.end === rental.end &&
          item.rent === rental.rent,
      );
      if (duplicateIndex === -1) return [...unique, rental];

      const statusPriority: Record<RentalStatus, number> = {
        Ended: 0,
        Upcoming: 1,
        "Ending Soon": 2,
        Active: 3,
      };
      if (
        statusPriority[rental.status] >
        statusPriority[unique[duplicateIndex].status]
      ) {
        return unique.map((item, index) =>
          index === duplicateIndex ? rental : item,
        );
      }
      return unique;
    }, []);
  const overlaid: RenterRental[] = base.map((item) => {
    const match = live.find((r) => r.id === item.id);
    if (!match) return item;
    return {
      ...item,
      status: match.status,
      rent: match.rent,
      start: match.start,
      end: match.end,
      note: match.note,
    };
  });
  const knownIds = new Set(overlaid.map((r) => r.id));
  const added: RenterRental[] = live
    .filter((r) => !knownIds.has(r.id))
    .map((r, index) => {
      const facts = resolvePropertyFacts(r.propertyId);
      const draft = getRentalSetupByAnyId(r.id);
      const application = RENTER_APPLICATIONS.find(
        (item) => item.propertyId === r.propertyId,
      );
      const publicListing = DEMO_LISTINGS.find(
        (item) => item.id === r.propertyId,
      );
      const setupCompleted = draft?.status === "Completed";
      const startsInFuture = new Date(r.start).getTime() > Date.now();
      return {
        id: r.id,
        propertyId: r.propertyId,
        title:
          application?.title ??
          publicListing?.title ??
          resolveAnyPropertyTitle(r.propertyId),
        location:
          application?.location ??
          publicListing?.location ??
          resolveAnyPropertyLocation(r.propertyId),
        status: setupCompleted && startsInFuture ? "Upcoming" : r.status,
        beds: facts.beds,
        baths: facts.baths,
        furnishing: facts.furnished ? "Furnished" : "Unfurnished",
        rent: r.rent,
        nextPayment: setupCompleted
          ? "Setup paid · next rent due after move-in"
          : r.note,
        start: r.start,
        end: r.end,
        manager: draft?.initiatedBy ?? "Your property representative",
        role: draft
          ? `Verified ${draft.initiatedByRole}`
          : "Verified Property Manager",
        image: index % images.length,
        note: r.note,
      };
    });
  return [...overlaid, ...added];
}

export default function RentalsPage() {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  useEffect(() => subscribeToOwnerRentals(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [tab, setTab] = useState<RentalTab>("current");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [propertySearch, setPropertySearch] = useState("");
  const normalizedSearch = propertySearch.trim().toLocaleLowerCase();
  const filtersActive = statusFilter !== "all" || normalizedSearch.length > 0;
  const allRentals = hydrated
    ? withSharedRentals(RENTER_RENTALS)
    : RENTER_RENTALS;
  const rentals = allRentals.filter(
    (rental) =>
      (filtersActive || tabFor(rental.status) === tab) &&
      (statusFilter === "all" || rental.status === statusFilter) &&
      (!normalizedSearch ||
        rental.title.toLocaleLowerCase().includes(normalizedSearch)),
  );
  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <header className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            <h1 className="dashboard-page-title">My Rentals</h1>
            <p className="text-carbon-500 mt-2 text-sm">
              Manage the homes you&apos;re currently renting and review your
              rental history.
            </p>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div className="flex gap-7">
                {(["current", "past"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setTab(item);
                      setStatusFilter("all");
                      setPropertySearch("");
                    }}
                    className={`relative h-12 text-sm font-medium capitalize ${tab === item ? "text-black" : "text-black/45"}`}
                  >
                    {item}
                    {tab === item ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex w-full gap-3 pb-2 md:w-auto">
                <label className="catalogue-location-filter flex min-w-0 flex-1 items-center gap-2 px-4 md:w-72 md:flex-none">
                  <span className="sr-only">Search by property name</span>
                  <Search
                    aria-hidden="true"
                    className="text-carbon-500 size-4 shrink-0"
                  />
                  <input
                    type="search"
                    value={propertySearch}
                    onChange={(event) => setPropertySearch(event.target.value)}
                    placeholder="Search by property name"
                    className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <VoiceInputButton onTranscript={setPropertySearch} />
                </label>
                <label className="relative block w-44 sm:w-52">
                  <span className="sr-only">Filter by rental status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      const status = event.target.value as StatusFilter;
                      setStatusFilter(status);
                      if (status !== "all") setTab(tabFor(status));
                    }}
                    className="h-11 w-full appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All statuses" : status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
                  />
                </label>
              </div>
            </div>
          </div>
        </header>
        <section className="px-5 pt-5 pb-9 sm:px-6 lg:px-11 xl:px-[52px]">
          {rentals.length ? (
            <section className="mx-auto max-w-[1562px] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.055)]">
              <table className="block w-full text-left lg:table lg:table-fixed">
                <thead className="hidden border-b border-black/8 text-xs text-black lg:table-header-group">
                  <tr>
                    {[
                      "Property",
                      "Status",
                      "Monthly rent",
                      "Next payment",
                      "Rental period",
                      "Managed by",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-4 font-bold first:w-[25%] last:w-[13%] xl:px-4"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="block divide-y divide-black/8 lg:table-row-group">
                  {rentals.map((r) => (
                    <tr
                      key={r.id}
                      className="grid gap-4 p-5 transition-colors hover:bg-black/[0.025] sm:grid-cols-2 lg:table-row lg:p-0"
                    >
                      <td className="sm:col-span-2 lg:table-cell lg:px-3 lg:py-4 xl:px-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={images[r.image]}
                            alt={r.title}
                            className="size-14 shrink-0 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-medium break-words">{r.title}</p>
                            <p className="text-carbon-500 mt-1 text-xs break-words">
                              {r.location}
                              {r.beds ? ` · ${r.beds} bed` : ""}
                              {r.baths ? ` · ${r.baths} bath` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="flex items-start justify-between gap-4 lg:table-cell lg:px-3 lg:py-4 xl:px-4">
                        <span className="text-carbon-500 text-xs font-bold lg:hidden">
                          Status
                        </span>
                        <span className="text-right text-xs text-black lg:text-left">
                          {r.status === "Active"
                            ? "Active Rental"
                            : r.status === "Upcoming"
                              ? "Upcoming Rental"
                              : r.status === "Ended"
                                ? "Rental Ended"
                                : r.status}
                        </span>
                      </td>
                      <td className="flex items-start justify-between gap-4 text-sm lg:table-cell lg:px-3 lg:py-4 xl:px-4">
                        <span className="text-carbon-500 text-xs font-bold lg:hidden">
                          Monthly rent
                        </span>
                        <span className="text-right lg:text-left">
                          {monthlyRentAmount(r.rent)}
                        </span>
                      </td>
                      <td className="flex items-start justify-between gap-4 text-sm lg:table-cell lg:px-3 lg:py-4 xl:px-4">
                        <span className="text-carbon-500 text-xs font-bold lg:hidden">
                          Next payment
                        </span>
                        <span className="text-right break-words lg:text-left">
                          {r.status === "Ending Soon"
                            ? "Pending renewal"
                            : r.nextPayment}
                        </span>
                      </td>
                      <td className="flex items-start justify-between gap-4 text-sm lg:table-cell lg:px-3 lg:py-4 xl:px-4">
                        <span className="text-carbon-500 text-xs font-bold lg:hidden">
                          Rental period
                        </span>
                        <div className="text-right lg:text-left">
                          <p>{r.start}</p>
                          <p className="text-carbon-500 mt-1 text-xs">
                            to {r.end}
                          </p>
                        </div>
                      </td>
                      <td className="flex items-start justify-between gap-4 sm:col-span-2 lg:table-cell lg:px-3 lg:py-4 xl:px-4">
                        <span className="text-carbon-500 text-xs font-bold lg:hidden">
                          Managed by
                        </span>
                        <div className="min-w-0 text-right lg:text-left">
                          <p className="flex items-center justify-end gap-1.5 text-sm lg:justify-start">
                            <span className="break-words">{r.manager}</span>
                            <BadgeCheck className="size-4 shrink-0" />
                          </p>
                          <p className="text-carbon-500 mt-1 text-xs break-words">
                            {r.role.replace(/^Verified\s+/i, "")}
                          </p>
                        </div>
                      </td>
                      <td className="sm:col-span-2 lg:table-cell lg:px-3 lg:py-4 lg:text-right xl:px-4">
                        <Link
                          href={`/renter-dashboard/rentals/${r.id}`}
                          className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-full bg-black px-3 text-sm text-white sm:w-auto lg:h-auto lg:min-h-10 lg:whitespace-normal"
                        >
                          View More Info
                          <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : filtersActive ? (
            <div className="mx-auto flex min-h-[430px] max-w-[1562px] flex-col items-center justify-center bg-white px-6 text-center">
              <Image
                src={emptyIllustration}
                alt=""
                className="h-40 w-auto object-contain"
              />
              <h2 className="font-bricolage mt-5 text-2xl font-medium">
                No matching rentals
              </h2>
              <p className="text-carbon-500 mt-2 text-sm">
                Try another property name or rental status.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPropertySearch("");
                  setStatusFilter("all");
                }}
                className="mt-6 rounded-full border border-black/15 px-5 py-3 text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <RentalEmptyState past={tab === "past"} />
          )}
        </section>
      </main>
    </>
  );
}

function RentalEmptyState({ past }: { past: boolean }) {
  return (
    <div className="mx-auto flex min-h-[430px] max-w-[1562px] flex-col items-center justify-center bg-white px-6 text-center">
      <Image
        src={emptyIllustration}
        alt=""
        className="h-40 w-auto object-contain"
      />
      <h2 className="font-bricolage mt-5 text-2xl font-medium">
        {past ? "No Past Rentals" : "No Rentals Yet"}
      </h2>
      <p className="text-carbon-500 mt-2 max-w-lg text-sm leading-6">
        {past
          ? "Your previous HauxHunt rentals will appear here once a rental ends."
          : "Once you're invited to complete a rental agreement or manage rent through HauxHunt, your home will appear here."}
      </p>
      {!past ? (
        <div className="mt-6 flex gap-3">
          <Link
            href="/renter-dashboard/properties"
            className="h-10 rounded-full bg-black px-5 py-2.5 text-sm text-white"
          >
            Find a Home
          </Link>
          <Link
            href="/renter-dashboard/applications"
            className="h-10 rounded-full border border-black/15 px-5 py-2.5 text-sm"
          >
            View Applications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
