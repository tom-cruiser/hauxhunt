import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { RequestPropertyButton } from "@/components/properties/request-property-button";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Search,
} from "lucide-react";

import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import house5 from "@/assets/images/house5.jpg";
import house6 from "@/assets/images/house6.jpeg";
import emptyIllustration from "@/assets/images/empty.png";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AutoSubmitFilterForm } from "@/components/listings/auto-submit-filter-form";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { ListingCard } from "@/components/sections/featured-listings/listing-card";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { RenterMapCatalogue } from "@/components/renter/renter-map-catalogue";
import { SaveSearchAction } from "@/components/renter/save-search-action";
import { HistoryBackButton } from "@/components/navigation/history-back-button";
import { CurrencyFilterSelect } from "@/components/currency/currency-selector";
import { DEMO_LISTINGS, type MockListing } from "@/data/hero-search-demo";

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

const LISTING_COORDINATES: Record<string, [number, number]> = {
  "kacyiru-2br": [-1.944, 30.083],
  "nyarutarama-2br": [-1.929, 30.102],
  "remera-3br": [-1.958, 30.112],
  "wuse-1br": [9.0765, 7.3986],
  "lekki-2br": [6.4474, 3.4723],
  "ikoyi-3br": [6.4541, 3.4346],
  "kibagabaga-modern-family-home": [-1.935, 30.13],
  "lekki-contemporary-duplex": [6.4418, 3.4812],
  "gisenyi-lakefront-residence": [-1.7028, 29.2564],
  "nyarutarama-garden-penthouse": [-1.925, 30.108],
  "maitama-quiet-city-villa": [9.0877, 7.4934],
  "ikoyi-waterfront-apartment": [6.4478, 3.4278],
  "karongi-hillside-family-house": [-2.0535, 29.3499],
  "gisenyi-lake-view-apartment": [-1.6958, 29.263],
};

const LOCATION_MAP_CENTERS: Record<string, [number, number]> = {
  kigali: [-1.9441, 30.0619],
  kacyiru: [-1.944, 30.083],
  nyarutarama: [-1.929, 30.102],
  remera: [-1.958, 30.112],
  kibagabaga: [-1.935, 30.13],
  gisenyi: [-1.7028, 29.2564],
  karongi: [-2.0535, 29.3499],
  lagos: [6.5244, 3.3792],
  lekki: [6.4474, 3.4723],
  ikoyi: [6.4541, 3.4346],
  abuja: [9.0765, 7.3986],
  wuse: [9.0765, 7.3986],
  maitama: [9.0877, 7.4934],
};

export type CatalogueSearchParams = Record<
  string,
  string | string[] | undefined
>;

type CataloguePageProps = {
  purpose: "rent" | "all";
  searchParams: CatalogueSearchParams;
  audience?: "guest" | "renter";
};

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? "");
}

function listingType(listing: MockListing) {
  if (
    [
      "gisenyi-lakefront-residence",
      "gisenyi-lake-view-apartment",
      "ikoyi-waterfront-apartment",
      "ikoyi-3br",
    ].includes(listing.id)
  )
    return "Beach Front Apartments";
  const text = listing.title.toLowerCase();
  if (text.includes("shared apartment")) return "Shared apartment";
  if (text.includes("studio")) return "Studio apartment";
  if (text.includes("penthouse")) return "Penthouse";
  if (text.includes("single room")) return "Single room";
  if (text.includes("mansion")) return "Mansion";
  if (text.includes("hotel")) return "Hotel";
  if (text.includes("apartment")) return "Apartment";
  if (text.includes("duplex")) return "Duplex";
  if (text.includes("villa")) return "Villa";
  return "House";
}

export function CataloguePage({
  purpose,
  searchParams,
  audience = "guest",
}: CataloguePageProps) {
  const locationValue = valueOf(searchParams.location);
  const location = locationValue.toLowerCase();
  const type = valueOf(searchParams.type);
  const priceRange = valueOf(searchParams.price);
  const bedroomsValue = valueOf(searchParams.bedrooms);
  const bathroomsValue = valueOf(searchParams.bathrooms);
  const sort = valueOf(searchParams.sort);
  const focusedListingId = valueOf(searchParams.focus);
  const savedSearchName = valueOf(searchParams.savedSearch);
  const savedSearchMatches = valueOf(searchParams.matches);
  const savedSearchNewMatches = valueOf(searchParams.newMatches);
  const mapMode =
    purpose === "all" ||
    audience === "renter" ||
    valueOf(searchParams.map) === "1";
  const mapHidden = valueOf(searchParams.mapHidden) === "1";
  const requestedPage = Number.parseInt(valueOf(searchParams.page), 10) || 1;
  const bedrooms = Number.parseInt(bedroomsValue, 10) || 0;
  const bathrooms = Number.parseInt(bathroomsValue, 10) || 0;
  const pathname =
    audience === "renter"
      ? "/renter-dashboard/properties"
      : purpose === "rent"
        ? "/rent"
        : "/properties";

  const filterListings = (filterByLocation: boolean) =>
    DEMO_LISTINGS.filter(
      (listing) =>
        (listing.purpose ?? "rent") === (purpose === "all" ? "rent" : purpose),
    )
      .filter(
        (listing) =>
          !filterByLocation ||
          !location ||
          listing.location.toLowerCase().includes(location) ||
          listing.matchLocations.some((item) => item.includes(location)),
      )
      .filter((listing) => !type || listingType(listing) === type)
      .filter((listing) => {
        if (!priceRange) return true;
        const [minimum, maximum] = priceRange
          .split("-")
          .map((value) => Number(value));
        return (
          listing.price >= minimum &&
          (!Number.isFinite(maximum) || listing.price <= maximum)
        );
      })
      .filter(
        (listing) =>
          !bedrooms ||
          (bedroomsValue === "5+"
            ? listing.bedrooms >= 5
            : listing.bedrooms === bedrooms),
      )
      .filter(
        (listing) =>
          !bathrooms ||
          (bathroomsValue === "5+"
            ? Math.max(1, listing.bedrooms - 1) >= 5
            : Math.max(1, listing.bedrooms - 1) === bathrooms),
      )
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        return a.id.localeCompare(b.id);
      });

  const listings = filterListings(true);
  const mapListings = mapMode
    ? location
      ? listings
      : filterListings(false)
    : listings;
  const focusedMarkerIndex = mapListings.findIndex(
    (listing) => listing.id === focusedListingId,
  );
  const focusedCoordinates =
    focusedMarkerIndex >= 0
      ? (LISTING_COORDINATES[mapListings[focusedMarkerIndex].id] ?? null)
      : null;

  const hasFilters = Boolean(
    location || type || priceRange || bedrooms || bathrooms,
  );
  const initialMapCenter =
    focusedCoordinates ??
    Object.entries(LOCATION_MAP_CENTERS).find(([name]) =>
      location.includes(name),
    )?.[1] ??
    LOCATION_MAP_CENTERS.kigali;
  const listingsPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(listings.length / listingsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const pageStart = (currentPage - 1) * listingsPerPage;
  const visibleListings = listings.slice(
    pageStart,
    pageStart + listingsPerPage,
  );

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (locationValue) params.set("location", locationValue);
    if (type) params.set("type", type);
    if (priceRange) params.set("price", priceRange);
    if (bedroomsValue) params.set("bedrooms", bedroomsValue);
    if (bathroomsValue) params.set("bathrooms", bathroomsValue);
    if (sort) params.set("sort", sort);
    if (mapMode && audience === "guest") params.set("map", "1");
    if (mapHidden) params.set("mapHidden", "1");
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function mapViewHref() {
    const params = new URLSearchParams();
    params.set("map", "1");
    if (locationValue) params.set("location", locationValue);
    if (type) params.set("type", type);
    if (priceRange) params.set("price", priceRange);
    if (bedroomsValue) params.set("bedrooms", bedroomsValue);
    if (bathroomsValue) params.set("bathrooms", bathroomsValue);
    if (sort) params.set("sort", sort);
    return `${pathname}?${params.toString()}`;
  }

  const title =
    audience === "renter"
      ? "All properties"
      : purpose === "rent"
        ? "Houses for rent"
        : "All properties";
  const description =
    purpose === "rent"
      ? "Explore long-term rentals across Rwanda, Nigeria, and Kenya, with clear details and trusted property representatives."
      : "Explore all available rental homes across Rwanda, Nigeria, and Kenya.";

  function renderListingCard(listing: MockListing, index: number) {
    return (
      <ListingCard
        key={listing.id}
        title={listing.title}
        location={listing.location}
        price={`${listing.currency} ${listing.price.toLocaleString()}`}
        period={
          (listing.purpose ?? "rent") === "rent" ? "per month" : "total price"
        }
        bedrooms={listing.bedrooms}
        bathrooms={Math.max(1, listing.bedrooms - 1)}
        area={Math.max(60, listing.bedrooms * 52)}
        furnished={listing.amenities.includes("Furnished")}
        saves={12 + ((index * 17) % 71)}
        image={LISTING_IMAGES[listing.id] ?? house1}
        href={`/properties/${listing.id}${audience === "renter" ? "?from=renter" : ""}`}
        requiresLogin={audience === "guest"}
      />
    );
  }

  return (
    <>
      {audience === "renter" ? <RenterCatalogueTopBar /> : <Navbar />}
      <main
        className={`bg-carbon-50 pt-16 ${
          mapMode ? "flex h-svh flex-col overflow-hidden" : "min-h-svh"
        }`}
      >
        {mapMode && (audience === "renter" || purpose === "all") ? null : (
          <section
            className={`bg-white px-5 sm:px-6 lg:px-11 xl:px-[52px] ${
              mapMode ? "py-4" : "pt-8 pb-12"
            }`}
          >
            <div className="mx-auto max-w-[1562px]">
              {mapMode ? (
                <HistoryBackButton
                  fallbackHref="/"
                  className="text-carbon-600 hover:text-carbon-900 mb-1 inline-flex h-8 items-center gap-1 text-sm font-medium"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Back
                </HistoryBackButton>
              ) : null}
              <div className="flex items-center justify-between gap-5">
                <h1 className="dashboard-page-title text-carbon-900">
                  {title}
                </h1>
                {purpose === "rent" && !mapMode ? (
                  <Link
                    href={mapViewHref()}
                    className="border-border-default text-carbon-900 inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-medium transition-colors hover:bg-black/5"
                  >
                    <MapPinned aria-hidden="true" className="size-[18px]" />
                    <span>View on map</span>
                  </Link>
                ) : null}
              </div>
              {audience === "guest" && !mapMode ? (
                <p className="text-carbon-600 mt-5 max-w-none text-lg leading-7 whitespace-nowrap">
                  {description}
                </p>
              ) : null}
            </div>
          </section>
        )}

        {!mapMode ? (
          <section
            aria-label={`${title} filters`}
            className="border-b border-black/10 bg-white px-5 py-5 sm:px-6 lg:px-11 xl:px-[52px]"
          >
            <AutoSubmitFilterForm
              key={`${locationValue}|${type}|${priceRange}|${bedroomsValue}|${bathroomsValue}`}
              action={pathname}
              className="mx-auto grid max-w-[1562px] grid-cols-[minmax(260px,2.2fr)_repeat(4,minmax(92px,0.65fr))] items-center gap-2"
            >
              <label>
                <span className="sr-only">Location</span>
                <span className="catalogue-location-filter flex items-center gap-2 px-4">
                  <button
                    type="submit"
                    aria-label="Search location"
                    className="text-carbon-500 hover:text-carbon-900 shrink-0 transition-colors"
                  >
                    <Search aria-hidden="true" className="size-4" />
                  </button>
                  <input
                    name="location"
                    defaultValue={locationValue}
                    data-no-auto-submit="true"
                    data-submit-when-empty="true"
                    placeholder="Search city, town, or district"
                    className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <VoiceInputButton />
                </span>
              </label>

              <FilterSelect
                label="Property type"
                placeholder="Home Type"
                name="type"
                value={type}
                options={[
                  "House",
                  "Beach Front Apartments",
                  "Apartment",
                  "Duplex",
                  "Single room",
                  "Penthouse",
                  "Shared apartment",
                  "Studio apartment",
                  "Mansion",
                  "Villa",
                  "Hotel",
                ]}
                hideLabel
                pill
              />
              <CurrencyFilterSelect
                label="Price range"
                placeholder="Price"
                name="price"
                value={priceRange}
                ranges={[
                  { value: "0-500", minimumUsd: null, maximumUsd: 500 },
                  { value: "501-1000", minimumUsd: 500, maximumUsd: 1000 },
                  { value: "1001-2000", minimumUsd: 1000, maximumUsd: 2000 },
                  {
                    value: "2001-Infinity",
                    minimumUsd: 2000,
                    maximumUsd: null,
                  },
                ]}
                hideLabel
                pill
              />
              <FilterSelect
                label="Bedrooms"
                placeholder="Bedrooms"
                name="bedrooms"
                value={bedroomsValue}
                options={["1", "2", "3", "4", "5+"]}
                hideLabel
                pill
              />
              <FilterSelect
                label="Bathrooms"
                placeholder="Bathrooms"
                name="bathrooms"
                value={bathroomsValue}
                options={["1", "2", "3", "4", "5+"]}
                hideLabel
                pill
              />
            </AutoSubmitFilterForm>
          </section>
        ) : null}

        <section
          className={
            mapMode
              ? "min-h-0 flex-1 overflow-hidden"
              : "px-5 pt-8 pb-14 sm:px-6 lg:px-11 lg:pt-10 lg:pb-20 xl:px-[52px]"
          }
        >
          <div className={mapMode ? "h-full" : "mx-auto max-w-[1562px]"}>
            <div
              className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${mapMode ? "hidden" : ""}`}
            >
              <div>
                <p className="font-bricolage text-carbon-900 text-2xl font-medium">
                  {listings.length} {listings.length === 1 ? "house" : "houses"}
                </p>
                <p className="text-carbon-500 mt-1 text-sm">
                  {location
                    ? `Showing properties matching “${locationValue}”`
                    : "Available across Rwanda, Nigeria, and Kenya"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {hasFilters && (
                  <Link
                    href={pathname}
                    className="rounded-full border border-black/20 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black hover:text-white"
                  >
                    Clear filters
                  </Link>
                )}
                <AutoSubmitFilterForm
                  key={`sort-${sort}`}
                  action={pathname}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="location" value={locationValue} />
                  <input type="hidden" name="type" value={type} />
                  <input type="hidden" name="price" value={priceRange} />
                  <input type="hidden" name="bedrooms" value={bedroomsValue} />
                  <input
                    type="hidden"
                    name="bathrooms"
                    value={bathroomsValue}
                  />
                  <label
                    htmlFor="catalogue-sort"
                    className="text-sm font-medium"
                  >
                    Sort:
                  </label>
                  <span className="relative block">
                    <select
                      id="catalogue-sort"
                      name="sort"
                      defaultValue={sort}
                      className="catalogue-filter-control h-11 appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                    >
                      <option value="">Newest</option>
                      <option value="price-low">Price: low to high</option>
                      <option value="price-high">Price: high to low</option>
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-black/55"
                    />
                  </span>
                </AutoSubmitFilterForm>
              </div>
            </div>

            {mapMode ? (
              <RenterMapCatalogue
                filtersUnderTopBar
                backHref={audience === "renter" ? "/renter-dashboard" : undefined}
                requestCard={
                  <div className="listing-request-glass relative mt-8 flex flex-col gap-7 overflow-hidden rounded-2xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 1400 280"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-2xl text-white opacity-[0.12]"
                    >
                      <defs>
                        <path id="renter-request-wave" d="M-100 35 C230 -55 410 30 625 155 S1010 310 1500 75" />
                      </defs>
                      <g fill="none" stroke="currentColor" strokeWidth="1">
                        {Array.from({ length: 12 }, (_, i) => (
                          <use key={i} href="#renter-request-wave" transform={`translate(0 ${i * 13})`} />
                        ))}
                      </g>
                    </svg>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/50"
                    />
                    <div className="relative z-10">
                      <h3 className="font-bricolage text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-normal tracking-[-0.035em] text-white">
                        Still looking for the right home?
                      </h3>
                      <p className="text-body-m mt-3 max-w-[68ch] text-white/65">
                        Tell us what you need and let verified property managers and
                        agents respond with relevant options.
                      </p>
                    </div>
                    <Link
                      href="/renter-dashboard/saved-searches?tab=requests"
                      className="font-bricolage bg-carbon-0 text-carbon-900 hover:bg-carbon-100 relative z-10 inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full px-6 text-base font-medium transition-colors duration-150 lg:self-auto"
                    >
                      Post a request
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                }
                context={
                  savedSearchName ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3">
                      <span className="rounded-full bg-black px-3 py-1 text-[11px] font-medium text-white">
                        Saved Search
                      </span>
                      <p className="font-bricolage text-lg font-medium">
                        {savedSearchName}
                      </p>
                      {savedSearchMatches ? (
                        <span className="text-carbon-500 text-sm">
                          {savedSearchMatches} matching homes
                        </span>
                      ) : null}
                      {Number(savedSearchNewMatches) > 0 ? (
                        <span className="text-sm font-medium">
                          {savedSearchNewMatches} new listings since your last
                          visit
                        </span>
                      ) : null}
                    </div>
                  ) : undefined
                }
                resultCount={listings.length}
                pageStart={pageStart}
                pageSize={listingsPerPage}
                initialCenter={initialMapCenter}
                initialZoom={focusedCoordinates ? 16 : location ? 14 : 12}
                fitMarkersOnLoad={Boolean(location) && !focusedCoordinates}
                focusedMarkerIndex={
                  focusedMarkerIndex >= 0 ? focusedMarkerIndex : undefined
                }
                initiallyVisible={!mapHidden}
                coordinates={mapListings.map(
                  (listing) =>
                    LISTING_COORDINATES[listing.id] ?? [-1.9441, 30.0619],
                )}
                priceValues={mapListings.map((listing) => listing.price)}
                markerCards={mapListings.map((listing) => ({
                  title: listing.title,
                  location: listing.location,
                  usdAmount: listing.price,
                  image: (LISTING_IMAGES[listing.id] ?? house1).src,
                  href: `/properties/${listing.id}${audience === "renter" ? "?from=renter" : ""}`,
                }))}
                hiddenChildren={listings.map(renderListingCard)}
                resultLabel={
                  location
                    ? `Showing properties matching “${locationValue}”`
                    : "Available across Rwanda, Nigeria, and Kenya"
                }
                pagination={
                  listings.length > listingsPerPage ? (
                    <CataloguePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageHref={pageHref}
                    />
                  ) : undefined
                }
                controls={
                  <>
                    {audience === "renter" && hasFilters ? (
                      <SaveSearchAction
                        location={locationValue}
                        type={type}
                        price={priceRange}
                        bedrooms={bedroomsValue}
                        bathrooms={bathroomsValue}
                      />
                    ) : null}
                    {hasFilters ? (
                      <Link
                        href={
                          audience === "guest"
                            ? `${pathname}?map=1${mapHidden ? "&mapHidden=1" : ""}`
                            : mapHidden
                              ? `${pathname}?mapHidden=1`
                              : pathname
                        }
                        className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
                      >
                        Clear filters
                      </Link>
                    ) : null}
                    <AutoSubmitFilterForm
                      key={`renter-sort-${sort}`}
                      action={pathname}
                      className="flex items-center gap-2"
                    >
                      {audience === "guest" ? (
                        <input type="hidden" name="map" value="1" />
                      ) : null}
                      <input
                        type="hidden"
                        name="mapHidden"
                        value={mapHidden ? "1" : ""}
                      />
                      <input
                        type="hidden"
                        name="location"
                        value={locationValue}
                      />
                      <input type="hidden" name="type" value={type} />
                      <input type="hidden" name="price" value={priceRange} />
                      <input
                        type="hidden"
                        name="bedrooms"
                        value={bedroomsValue}
                      />
                      <input
                        type="hidden"
                        name="bathrooms"
                        value={bathroomsValue}
                      />
                      <span className="relative block">
                        <select
                          aria-label="Sort properties"
                          name="sort"
                          defaultValue={sort}
                          className="catalogue-filter-control h-11 appearance-none rounded-full border-0 bg-white pr-9 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                        >
                          <option value="">Newest</option>
                          <option value="price-low">Price: low to high</option>
                          <option value="price-high">Price: high to low</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                      </span>
                    </AutoSubmitFilterForm>
                  </>
                }
                filters={
                  <AutoSubmitFilterForm
                    key={`renter-filters-${locationValue}|${type}|${priceRange}|${bedroomsValue}|${bathroomsValue}`}
                    action={pathname}
                    className="grid grid-cols-[minmax(260px,2.2fr)_repeat(4,minmax(92px,0.65fr))] gap-2"
                  >
                    <input
                      type="hidden"
                      name="mapHidden"
                      value={mapHidden ? "1" : ""}
                    />
                    {audience === "guest" ? (
                      <input type="hidden" name="map" value="1" />
                    ) : null}
                    <label className="catalogue-location-filter catalogue-typed-filter flex min-w-0 items-center gap-2 px-4">
                      <button
                        type="submit"
                        aria-label="Search location"
                        className="text-carbon-500 hover:text-carbon-900 shrink-0 transition-colors"
                      >
                        <Search aria-hidden="true" className="size-4" />
                      </button>
                      <input
                        name="location"
                        defaultValue={locationValue}
                        data-no-auto-submit="true"
                        data-submit-when-empty="true"
                        placeholder="Search location"
                        className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                      <VoiceInputButton />
                    </label>
                    <FilterSelect
                      label="Type"
                      placeholder="Home Type"
                      name="type"
                      value={type}
                      options={[
                        "House",
                        "Beach Front Apartments",
                        "Apartment",
                        "Duplex",
                        "Single room",
                        "Penthouse",
                        "Shared apartment",
                        "Studio apartment",
                        "Mansion",
                        "Villa",
                        "Hotel",
                      ]}
                      hideLabel
                      pill
                    />
                    <CurrencyFilterSelect
                      label="Price"
                      placeholder="Price"
                      name="price"
                      value={priceRange}
                      ranges={[
                        { value: "0-500", minimumUsd: null, maximumUsd: 500 },
                        {
                          value: "501-1000",
                          minimumUsd: 500,
                          maximumUsd: 1000,
                        },
                        {
                          value: "1001-2000",
                          minimumUsd: 1000,
                          maximumUsd: 2000,
                        },
                        {
                          value: "2001-Infinity",
                          minimumUsd: 2000,
                          maximumUsd: null,
                        },
                      ]}
                      hideLabel
                      pill
                    />
                    <FilterSelect
                      label="Bedrooms"
                      placeholder="Bedrooms"
                      name="bedrooms"
                      value={bedroomsValue}
                      options={["1", "2", "3", "4", "5+"]}
                      hideLabel
                      pill
                    />
                    <FilterSelect
                      label="Bathrooms"
                      placeholder="Bathrooms"
                      name="bathrooms"
                      value={bathroomsValue}
                      options={["1", "2", "3", "4", "5+"]}
                      hideLabel
                      pill
                    />
                  </AutoSubmitFilterForm>
                }
              >
                {mapListings.map(renderListingCard)}
              </RenterMapCatalogue>
            ) : listings.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {visibleListings.map((listing, index) =>
                  renderListingCard(listing, pageStart + index),
                )}
              </div>
            ) : (
              <div className="px-6 py-20 text-center">
                <Image
                  src={emptyIllustration}
                  alt="No houses found"
                  className="mx-auto h-44 w-auto object-contain"
                />
                <h2 className="font-bricolage text-carbon-900 mt-5 text-3xl font-medium">
                  No houses match these filters
                </h2>
                <p className="text-carbon-600 mx-auto mt-3 max-w-md">
                  Try another location or broaden the property details to see
                  more available houses.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <RequestPropertyButton
                    label="Request a property"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-6 font-medium text-white transition-opacity hover:opacity-75"
                  />
                </div>
              </div>
            )}

            {!mapMode && listings.length > listingsPerPage ? (
              <CataloguePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageHref={pageHref}
              />
            ) : null}

          </div>
        </section>
      </main>
      {audience === "guest" && !mapMode ? <Footer /> : null}
    </>
  );
}

function CataloguePagination({
  currentPage,
  totalPages,
  pageHref,
}: {
  currentPage: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  return (
    <nav
      aria-label="Listing pages"
      className="mt-12 flex items-center justify-center gap-2"
    >
      <PaginationArrow
        href={pageHref(currentPage - 1)}
        label="Previous page"
        disabled={currentPage === 1}
        icon={ChevronLeft}
      />
      {Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return (
          <Link
            key={page}
            href={pageHref(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`flex size-11 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
              page === currentPage
                ? "border-black bg-black text-white"
                : "border-black/15 bg-white text-black hover:border-black"
            }`}
          >
            {page}
          </Link>
        );
      })}
      <PaginationArrow
        href={pageHref(currentPage + 1)}
        label="Next page"
        disabled={currentPage === totalPages}
        icon={ChevronRight}
      />
    </nav>
  );
}

type PaginationArrowProps = {
  href: string;
  label: string;
  disabled: boolean;
  icon: typeof ChevronLeft;
};

function PaginationArrow({
  href,
  label,
  disabled,
  icon: Icon,
}: PaginationArrowProps) {
  if (disabled) {
    return (
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full border border-black/10 text-black/25"
      >
        <Icon className="size-4" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full border border-black/15 bg-white transition-colors hover:border-black hover:bg-black hover:text-white"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Link>
  );
}

type FilterSelectProps = {
  label: string;
  placeholder: string;
  name: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  hideLabel?: boolean;
  pill?: boolean;
};

function FilterSelect({
  label,
  placeholder,
  name,
  value,
  options,
  optionLabels = {},
  hideLabel = false,
  pill = false,
}: FilterSelectProps) {
  return (
    <label>
      <span
        className={
          hideLabel
            ? "sr-only"
            : "text-carbon-900 mb-2 block text-sm font-medium"
        }
      >
        {label}
      </span>
      <span className="relative block">
        <select
          name={name}
          defaultValue={value}
          className={`catalogue-filter-control text-carbon-900 w-full appearance-none rounded-full border-0 bg-white pr-11 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0 ${pill ? "h-11" : "h-12"}`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels[option] ?? option}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-black/55"
        />
      </span>
    </label>
  );
}
