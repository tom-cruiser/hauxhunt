"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileCheck2,
  MapPin,
  Mic,
  Search,
} from "lucide-react";

import { Wordmark } from "@/components/layout/wordmark";
import {
  CurrencySelector,
  formatCurrencyRange,
  useDisplayCurrency,
} from "@/components/currency/currency-selector";
import { ListingCard } from "@/components/sections/featured-listings/listing-card";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { TrendingLocations } from "@/components/sections/trending-locations/trending-locations";
import { useScrolled } from "@/hooks/use-scrolled";
import { getTotalUnreadCount } from "@/lib/message-threads";
import {
  getUnreadNotificationCount,
  subscribeToNotifications,
} from "@/lib/notifications";
import { NotificationsDrawer } from "@/components/renter/notifications-drawer";
import heroImage from "@/assets/images/house-isolated-field.jpg";
import houseOne from "@/assets/images/house1.jpg";
import houseTwo from "@/assets/images/house2.jpg";
import houseThree from "@/assets/images/house3.jpg";
import houseFour from "@/assets/images/house4.jpg";
import houseFive from "@/assets/images/house5.jpg";
import houseSix from "@/assets/images/house6.jpeg";
import julienProfile from "@/assets/images/julien.jpg";
import emptyIllustration from "@/assets/images/empty.png";
import { clearTier } from "@/hooks/use-tier";

const LISTINGS = [
  {
    id: "kacyiru-2br",
    title: "Bright two-bedroom apartment",
    location: "Kacyiru, Kigali",
    price: "USD 520",
    period: "per month",
    bedrooms: 2,
    bathrooms: 2,
    area: 112,
    furnished: true,
    saves: 38,
    image: houseOne,
    href: "/properties/kacyiru-2br",
  },
  {
    id: "kibagabaga-modern-family-home",
    title: "Modern family home",
    location: "Kibagabaga, Kigali",
    price: "USD 830",
    period: "per month",
    bedrooms: 3,
    bathrooms: 2,
    area: 186,
    furnished: false,
    saves: 62,
    image: houseTwo,
    href: "/properties/kibagabaga-modern-family-home",
  },
  {
    id: "nyarutarama-2br",
    title: "Quiet compound apartment",
    location: "Nyarutarama, Kigali",
    price: "USD 660",
    period: "per month",
    bedrooms: 2,
    bathrooms: 2,
    area: 128,
    furnished: true,
    saves: 45,
    image: houseThree,
    href: "/properties/nyarutarama-2br",
  },
  {
    id: "remera-3br",
    title: "Garden family residence",
    location: "Remera, Kigali",
    price: "USD 540",
    period: "per month",
    bedrooms: 3,
    bathrooms: 2,
    area: 164,
    furnished: false,
    saves: 27,
    image: houseFour,
    href: "/properties/remera-3br",
  },
  {
    id: "maitama-quiet-city-villa",
    title: "Quiet city villa",
    location: "Maitama, Abuja",
    price: "USD 2,500",
    period: "per month",
    bedrooms: 5,
    bathrooms: 5,
    area: 310,
    furnished: false,
    saves: 81,
    image: houseFive,
    href: "/properties/maitama-quiet-city-villa",
  },
  {
    id: "ikoyi-waterfront-apartment",
    title: "Waterfront apartment",
    location: "Ikoyi, Lagos",
    price: "USD 1,700",
    period: "per month",
    bedrooms: 3,
    bathrooms: 3,
    area: 184,
    furnished: true,
    saves: 34,
    image: houseSix,
    href: "/properties/ikoyi-waterfront-apartment",
  },
  {
    id: "gacuriro-townhouse",
    title: "Secure compound townhouse",
    location: "Gacuriro, Kigali",
    price: "USD 920",
    period: "per month",
    bedrooms: 4,
    bathrooms: 3,
    area: 214,
    furnished: false,
    saves: 29,
    image: houseOne,
    href: "/properties/wuse-1br",
  },
  {
    id: "kimihurura-city-apartment",
    title: "City-view apartment",
    location: "Kimihurura, Kigali",
    price: "USD 740",
    period: "per month",
    bedrooms: 2,
    bathrooms: 2,
    area: 132,
    furnished: true,
    saves: 51,
    image: houseTwo,
    href: "/properties/lekki-2br",
  },
  {
    id: "kigali-heights-studio",
    title: "Furnished executive studio",
    location: "Kacyiru, Kigali",
    price: "USD 410",
    period: "per month",
    bedrooms: 1,
    bathrooms: 1,
    area: 68,
    furnished: true,
    saves: 44,
    image: houseThree,
    href: "/properties/ikoyi-3br",
  },
  {
    id: "kanombe-family-house",
    title: "Spacious family house",
    location: "Kanombe, Kigali",
    price: "USD 610",
    period: "per month",
    bedrooms: 4,
    bathrooms: 3,
    area: 226,
    furnished: false,
    saves: 23,
    image: houseFour,
    href: "/properties/lekki-contemporary-duplex",
  },
  {
    id: "rebero-hillside-home",
    title: "Hillside home with views",
    location: "Rebero, Kigali",
    price: "USD 1,050",
    period: "per month",
    bedrooms: 4,
    bathrooms: 4,
    area: 248,
    furnished: true,
    saves: 67,
    image: houseFive,
    href: "/properties/nyarutarama-garden-penthouse",
  },
  {
    id: "gisenyi-lakefront-residence",
    title: "Lakefront residence",
    location: "Gisenyi, Rwanda",
    price: "USD 590",
    period: "per month",
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    furnished: true,
    saves: 45,
    image: houseSix,
    href: "/properties/gisenyi-lakefront-residence",
  },
] as const;

const RENTER_NAV_GROUPS = [
  {
    label: "Find a Home",
    links: [
      ["Listings", "/renter-dashboard/properties"],
      ["My Favourites", "/renter-dashboard/saved"],
      ["Saved Searches", "/renter-dashboard/saved-searches"],
      ["My Viewings", "/renter-dashboard/visits"],
      ["Applications", "/renter-dashboard/applications"],
    ],
  },
  {
    label: "My Home",
    links: [
      ["My Rentals", "/renter-dashboard/rentals"],
      ["Payments", "/renter-dashboard/payments"],
      ["Maintenance", "/renter-dashboard/maintenance"],
    ],
  },
  {
    label: "Find a Flatmate",
    links: [
      ["Browse Flatmates", "/flatmates?from=renter"],
      ["My Flatmate Profile", "/renter-dashboard/flatmates/profile"],
      ["Matches / Interested People", "/renter-dashboard/flatmates/matches"],
    ],
  },
] as const;

const PROFILE_LINKS = [
  ["My Account", "/renter-dashboard/account"],
  ["Help Center", "/renter-dashboard/help"],
  ["Send Feedback", "/feedback"],
] as const;

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ReverseGeocodeResult = {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function RenterDashboardPage() {
  const router = useRouter();
  // Mock, session-only count (not a real synced inbox) — same source the
  // shared nav bar reads, kept in sync here since this page has its own
  // bespoke header rather than <RenterCatalogueTopBar />.
  const unreadMessageCount = useSyncExternalStore(
    subscribeToStorage,
    () => getTotalUnreadCount(),
    () => 0
  );
  const unreadNotificationCount = useSyncExternalStore(
    subscribeToNotifications,
    getUnreadNotificationCount,
    () => 0,
  );
  const displayCurrency = useDisplayCurrency();
  const { scrolled, sentinelRef, threshold } = useScrolled(40);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const [listingPage, setListingPage] = useState(1);
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("Any Type");
  const [priceFilter, setPriceFilter] = useState("Any Price");
  const [bedroomFilter, setBedroomFilter] = useState("Any");
  const [bathroomFilter, setBathroomFilter] = useState("Any");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceTranscriptRef = useRef("");
  const filteredListings = LISTINGS.filter((listing) => {
    const locationMatches = listing.location
      .toLowerCase()
      .includes(locationFilter.trim().toLowerCase());
    const listingType = listing.title.toLowerCase().includes("apartment")
      ? "Apartment"
      : listing.title.toLowerCase().includes("studio")
        ? "Studio"
        : listing.title.toLowerCase().includes("villa")
          ? "Villa"
          : "House";
    const typeMatches = typeFilter === "Any Type" || typeFilter === listingType;
    const numericPrice = Number(listing.price.replace(/[^0-9.]/g, ""));
    const priceMatches =
      priceFilter === "Any Price" ||
      (priceFilter === "Under USD 500" && numericPrice < 500) ||
      (priceFilter === "USD 500–1,000" &&
        numericPrice >= 500 &&
        numericPrice <= 1000) ||
      (priceFilter === "USD 1,000–2,000" &&
        numericPrice > 1000 &&
        numericPrice <= 2000) ||
      (priceFilter === "Above USD 2,000" && numericPrice > 2000);
    const bedroomsMatch =
      bedroomFilter === "Any" ||
      (bedroomFilter === "4+"
        ? listing.bedrooms >= 4
        : listing.bedrooms === Number(bedroomFilter));
    const bathroomsMatch =
      bathroomFilter === "Any" ||
      (bathroomFilter === "4+"
        ? listing.bathrooms >= 4
        : listing.bathrooms === Number(bathroomFilter));
    return (
      locationMatches &&
      typeMatches &&
      priceMatches &&
      bedroomsMatch &&
      bathroomsMatch
    );
  });
  const listingOffset = filteredListings.length
    ? ((listingPage - 1) * 4) % filteredListings.length
    : 0;
  const visibleListings = [
    ...filteredListings.slice(listingOffset),
    ...filteredListings.slice(0, listingOffset),
  ];

  useEffect(() => {
    const closeProfileOnOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeProfileOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeProfileOnOutsideClick);
  }, []);

  const useCurrentLocation = () => {
    const demoAddress = "31 KG 152 St, Kigali";
    setUsingCurrentLocation(true);
    setSearchQuery(demoAddress);

    if (!navigator.geolocation) {
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const endpoint = new URL(
            "https://nominatim.openstreetmap.org/reverse",
          );
          endpoint.searchParams.set("format", "jsonv2");
          endpoint.searchParams.set("lat", String(coords.latitude));
          endpoint.searchParams.set("lon", String(coords.longitude));
          endpoint.searchParams.set("zoom", "18");
          endpoint.searchParams.set("addressdetails", "1");
          endpoint.searchParams.set("layer", "address");
          endpoint.searchParams.set("accept-language", "en");
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error("Address lookup failed");
          const result = (await response.json()) as ReverseGeocodeResult;
          const address = result.address;
          const street = [
            address?.house_number,
            address?.road ?? address?.pedestrian,
          ]
            .filter(Boolean)
            .join(" ");
          const area = address?.neighbourhood ?? address?.suburb;
          const city = address?.city ?? address?.town ?? address?.village;
          const readableAddress =
            [street, area, city].filter(Boolean).join(", ") ||
            result.display_name?.split(",").slice(0, 3).join(",").trim();
          if (!readableAddress) throw new Error("No street address found");
          setSearchQuery(readableAddress);
        } catch {
          setSearchQuery(demoAddress);
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const toggleVoiceSearch = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setUsingCurrentLocation(false);
      setSearchQuery("Voice search is not supported in this browser");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      voiceTranscriptRef.current = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    recognition.onend = () => {
      if (voiceTranscriptRef.current) {
        setUsingCurrentLocation(false);
        setSearchQuery(voiceTranscriptRef.current);
      }
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    voiceTranscriptRef.current = "";
    setListening(true);
    recognition.start();
  };

  const submitHomeSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    const params = new URLSearchParams({ q: query, from: "renter" });
    if (usingCurrentLocation) params.set("source", "location");
    router.push(`/search?${params.toString()}`);
  };

  const clearExploreFilters = () => {
    setLocationFilter("");
    setTypeFilter("Any Type");
    setPriceFilter("Any Price");
    setBedroomFilter("Any");
    setBathroomFilter("Any");
    setListingPage(1);
  };

  return (
    <main className="min-h-svh bg-white text-black">
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 w-px"
        style={{ height: threshold }}
      />
      <section className="relative min-h-[590px] bg-black text-white">
        <Image
          src={heroImage}
          alt="Modern home standing in an open field"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60" />

        <header
          className={`fixed inset-x-0 top-0 z-50 transition-[height,background-color] duration-300 ease-out ${scrolled ? "nav-surface h-16 text-black" : "h-20 bg-transparent text-white lg:h-24"}`}
        >
          <div className="mx-auto grid h-full w-[calc(100%-2.5rem)] max-w-[1562px] grid-cols-[auto_1fr_auto] items-center gap-4 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-5.5rem)] lg:grid-cols-[1fr_auto_1fr] lg:gap-10 xl:w-[calc(100%-6.5rem)]">
            <Link
              href="/renter-dashboard"
              aria-label="HauxHunt renter dashboard"
              className={`shrink-0 transition-[filter] duration-300 ${scrolled ? "" : "invert"}`}
            >
              <Wordmark height={scrolled ? 38 : 48} />
            </Link>
            <nav className="hidden items-center gap-5 justify-self-center text-sm font-medium lg:flex xl:gap-7">
              {RENTER_NAV_GROUPS.map((group) => (
                <RenterNavDropdown
                  key={group.label}
                  group={group}
                  open={openNavMenu === group.label}
                  onToggle={() =>
                    setOpenNavMenu((current) =>
                      current === group.label ? null : group.label,
                    )
                  }
                  onOpen={() => setOpenNavMenu(group.label)}
                  onClose={() => setOpenNavMenu(null)}
                />
              ))}
              <Link
                href="/renter-dashboard/messages"
                className="relative inline-flex items-center transition-opacity hover:opacity-60"
              >
                Messages
                {unreadMessageCount > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 flex size-4 items-center justify-center rounded-full text-[0.55rem] font-bold ${scrolled ? "bg-black text-white" : "bg-white text-black"}`}
                  >
                    {unreadMessageCount}
                  </span>
                )}
              </Link>
            </nav>
            <div className="flex items-center gap-2 justify-self-end sm:gap-4">
              <CurrencySelector inverse={!scrolled} openOnHover />
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={`Notifications${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} unread` : ""}`}
                aria-expanded={notifOpen}
                className={`relative flex size-11 items-center justify-center rounded-full transition-colors ${scrolled ? "hover:bg-black/[0.055]" : "hover:bg-white/10"}`}
              >
                <Bell className="size-5" />
                {unreadNotificationCount > 0 ? (
                  <span
                    className={`absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[0.55rem] font-bold ${scrolled ? "bg-black text-white" : "bg-white text-black"}`}
                  >
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </button>
              <NotificationsDrawer
                open={notifOpen}
                filter={notifFilter}
                onClose={() => setNotifOpen(false)}
                onFilterChange={setNotifFilter}
              />
              <div
                ref={profileMenuRef}
                className="relative"
                onMouseEnter={() => setProfileOpen(true)}
                onMouseLeave={() => setProfileOpen(false)}
                onFocus={() => setProfileOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    setProfileOpen(false);
                }}
              >
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex h-12 items-center gap-2 rounded-full pl-1 sm:pr-2"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <Image
                    src={julienProfile}
                    alt="Julien Mugisha"
                    className={`size-10 rounded-full object-cover ring-2 ${scrolled ? "ring-black/10" : "ring-white/25"}`}
                  />
                  <span className="hidden text-sm font-medium sm:block">
                    Julien
                  </span>
                  <ChevronDown
                    className={`hidden size-4 transition-transform sm:block ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {profileOpen ? <ProfileMenu /> : null}
              </div>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[590px] max-w-[1040px] flex-col items-center justify-center px-5 pt-20 text-center lg:pt-24">
          <h1 className="font-bricolage text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.94] font-medium tracking-[-0.055em]">
            Find a home that fits your life.
          </h1>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitHomeSearch();
            }}
            className="mt-9 flex w-full max-w-[900px] flex-col overflow-hidden rounded-[1.35rem] bg-white text-black shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:h-16 sm:flex-row sm:rounded-full"
          >
            <div className="relative flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locationLoading}
                aria-label="Use my current location"
                title="Use my current location"
                className="text-carbon-400 ml-3 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[0.055] hover:text-black disabled:opacity-40"
              >
                <MapPin aria-hidden="true" className="size-5" />
              </button>
              <input
                type="search"
                aria-label="Search homes"
                placeholder="Try ‘3-bedroom apartment in Kacyiru under USD 800’"
                value={searchQuery}
                onChange={(event) => {
                  setUsingCurrentLocation(false);
                  setSearchQuery(event.target.value);
                }}
                style={{ border: 0, boxShadow: "none", outline: "none" }}
                className="h-16 min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 text-sm shadow-none ring-0 outline-none placeholder:text-black/35 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none sm:text-base [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
            </div>
            <button
              type="button"
              onClick={toggleVoiceSearch}
              aria-label={
                listening ? "Stop voice search" : "Start voice search"
              }
              title={listening ? "Stop listening" : "Search by voice"}
              className={`my-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors ${listening ? "text-red-600" : "text-black/55 hover:text-black"}`}
            >
              <Mic className="size-5" />
            </button>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              aria-label="Search"
              className="m-2 flex h-12 items-center justify-center rounded-full bg-black px-6 text-white transition-opacity hover:opacity-75 disabled:pointer-events-none disabled:opacity-35"
            >
              <Search className="size-5" />
            </button>
          </form>
        </div>
      </section>

      <section
        id="explore-homes"
        className="mx-auto w-[calc(100%-2.5rem)] max-w-[1562px] scroll-mt-16 py-12 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-5.5rem)] lg:py-16 xl:w-[calc(100%-6.5rem)]"
      >
        <div className="flex flex-col gap-6 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
              Explore houses on HauxHunt
            </h2>
          </div>
          <Link
            href="/renter-dashboard/properties"
            className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border px-5 text-base font-medium transition-colors duration-150 lg:self-auto"
          >
            View all properties
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-7 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(250px,1.5fr)_repeat(4,minmax(135px,0.7fr))]">
          <FilterTextField
            label="Location"
            placeholder="Search city, town, or district"
            value={locationFilter}
            onChange={(value) => {
              setLocationFilter(value);
              setListingPage(1);
            }}
          />
          <FilterSelect
            label="Property type"
            value={typeFilter}
            options={["Any Type", "House", "Apartment", "Villa", "Land"]}
            onChange={(value) => {
              setTypeFilter(value);
              setListingPage(1);
            }}
          />
          <FilterSelect
            label="Price range"
            value={priceFilter}
            options={[
              "Any Price",
              "Under USD 500",
              "USD 500–1,000",
              "USD 1,000–2,000",
              "Above USD 2,000",
            ]}
            optionLabels={{
              "Any Price": "Any Price",
              "Under USD 500": formatCurrencyRange(null, 500, displayCurrency),
              "USD 500–1,000": formatCurrencyRange(500, 1000, displayCurrency),
              "USD 1,000–2,000": formatCurrencyRange(
                1000,
                2000,
                displayCurrency,
              ),
              "Above USD 2,000": formatCurrencyRange(
                2000,
                null,
                displayCurrency,
              ),
            }}
            onChange={(value) => {
              setPriceFilter(value);
              setListingPage(1);
            }}
          />
          <FilterSelect
            label="Bedrooms"
            value={bedroomFilter}
            options={["Any", "1", "2", "3", "4+"]}
            onChange={(value) => {
              setBedroomFilter(value);
              setListingPage(1);
            }}
          />
          <FilterSelect
            label="Bathrooms"
            value={bathroomFilter}
            options={["Any", "1", "2", "3", "4+"]}
            onChange={(value) => {
              setBathroomFilter(value);
              setListingPage(1);
            }}
          />
        </div>

        {visibleListings.length ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                {...listing}
                href={`${listing.href}?from=renter`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-3xl bg-black/[0.04] px-6 py-16 text-center">
            <Image
              src={emptyIllustration}
              alt="No houses found"
              className="mx-auto h-44 w-auto object-contain"
            />
            <h3 className="font-bricolage mt-5 text-2xl font-medium">
              No houses match these filters
            </h3>
            <p className="text-carbon-500 mt-3 text-sm">
              Try another location or broaden your property preferences.
            </p>
            <button
              type="button"
              onClick={clearExploreFilters}
              className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white"
            >
              Clear filters
            </button>
          </div>
        )}
        {filteredListings.length === LISTINGS.length ? (
          <nav
            aria-label="Property pagination"
            className="mt-12 flex items-center justify-center gap-2"
          >
            <button
              type="button"
              onClick={() => setListingPage((page) => Math.max(1, page - 1))}
              disabled={listingPage === 1}
              aria-label="Previous page"
              className="flex size-11 items-center justify-center rounded-full border border-black/15 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft className="size-4" />
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setListingPage(page)}
                aria-current={listingPage === page ? "page" : undefined}
                className={`flex size-11 items-center justify-center rounded-full text-sm font-medium transition-colors ${listingPage === page ? "bg-black text-white" : "border border-black/15 hover:bg-black/[0.05]"}`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setListingPage((page) => Math.min(3, page + 1))}
              disabled={listingPage === 3}
              aria-label="Next page"
              className="flex size-11 items-center justify-center rounded-full border border-black/15 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowRight className="size-4" />
            </button>
          </nav>
        ) : null}

        <TrendingLocations audience="renter" variant="embedded" />

        <section className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
                Your favourite homes
              </h2>
              <p className="text-carbon-500 mt-3 text-sm">
                Keep your strongest options close while you compare.
              </p>
            </div>
            <Link
              href="/renter-dashboard/saved"
              className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors duration-150"
            >
              View favourite homes <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {LISTINGS.slice(0, 3).map((listing) => (
              <Link
                key={`saved-${listing.id}`}
                href={`${listing.href}?from=renter`}
                className="flex min-w-0 items-center gap-4 rounded-2xl bg-black/[0.04] p-3 transition-colors hover:bg-black/[0.07]"
              >
                <Image
                  src={listing.image}
                  alt=""
                  className="size-24 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <h3 className="font-bricolage truncate font-medium">
                    {listing.title}
                  </h3>
                  <p className="text-carbon-500 mt-1 truncate text-sm">
                    {listing.location}
                  </p>
                  <p className="mt-3 text-sm font-medium">
                    {listing.price} · {listing.period}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-5 lg:grid-cols-2">
          <RenterActivityCard
            icon={CalendarDays}
            title="Upcoming visits"
            description="Two property visits are scheduled this week."
            property="Modern family home"
            update="Tue, 11 Aug · 4:30 PM · Visit scheduled"
            href="/renter-dashboard/visits"
            action="View visits"
          />
          <RenterActivityCard
            icon={FileCheck2}
            title="Application updates"
            description="Stay on top of decisions and requested information."
            property="Bright two-bedroom apartment"
            update="Under review · Updated today"
            href="/renter-dashboard/applications"
            action="View applications"
          />
        </section>

        <section className="mt-20 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
          <article className="relative overflow-hidden rounded-[2rem] bg-black px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12 lg:py-12">
            <div className="relative z-10">
              <h2 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
                Still looking for the right home?
              </h2>
              <p className="mt-4 max-w-2xl text-white/60">
                Tell us what you need and let verified property managers and
                agents respond with relevant options.
              </p>
            </div>
            <Link
              href="/renter-dashboard/saved-searches?tab=requests"
              className="font-bricolage relative z-10 mt-7 inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-6 font-medium text-black transition-opacity hover:opacity-80 lg:mt-0"
            >
              Create a property request <ArrowUpRight className="size-4" />
            </Link>
            <div className="pointer-events-none absolute -right-12 -bottom-28 size-72 rounded-full border border-white/15" />
          </article>

          <article className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-black/25 px-7 py-10 text-center">
            <BriefcaseBusiness className="size-8" strokeWidth={1.6} />
            <h2 className="font-bricolage mt-6 text-2xl font-medium tracking-[-0.03em]">
              Become an agent
            </h2>
            <p className="text-carbon-500 mt-3 max-w-xs text-sm leading-6">
              Join HauxHunt and help renters find homes across Rwanda, Nigeria,
              and Kenya.
            </p>
            <Link
              href="/register"
              className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors duration-150"
            >
              Apply now <ArrowUpRight className="size-4" />
            </Link>
          </article>
        </section>
      </section>
    </main>
  );
}

function RenterNavDropdown({
  group,
  open,
  onToggle,
  onOpen,
  onClose,
}: {
  group: (typeof RENTER_NAV_GROUPS)[number];
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onFocus={onOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onClose();
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
      >
        {group.label}
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 pt-[0.8rem]">
          <div
            role="menu"
            className="overflow-hidden rounded-2xl bg-white p-2 text-black shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
          >
            {group.links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                role="menuitem"
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-normal transition-colors hover:bg-black/[0.055] focus:bg-black/[0.055] focus:outline-none"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileMenu() {
  return (
    <div className="absolute top-full right-0 z-50 w-[290px] pt-3">
      <div
        role="menu"
        className="overflow-hidden rounded-2xl bg-white text-black shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
      >
        <div className="border-b border-black/10 px-5 py-5">
          <p className="font-bricolage text-lg font-medium">Julien Mugisha</p>
          <p className="text-carbon-500 mt-0.5 text-sm">renter@gmail.com</p>
        </div>
        <div className="p-2">
          {PROFILE_LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              role="menuitem"
              className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm transition-colors hover:bg-black/[0.055]"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="border-t border-black/10 p-2">
          <Link
            href="/login"
            role="menuitem"
            onClick={() => {
              window.sessionStorage.removeItem("hauxhunt-authenticated-role");
              clearTier();
            }}
            className="flex h-11 items-center rounded-xl px-3 text-sm hover:bg-black/[0.055]"
          >
            Log Out
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterTextField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="md:col-span-2 xl:col-span-1">
      <span className="text-carbon-900 mb-2 block text-sm font-medium">
        {label}
      </span>
      <span className="catalogue-location-filter flex items-center gap-2 px-4">
        <Search aria-hidden="true" className="text-carbon-500 size-4" />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ boxShadow: "none", outline: "none" }}
          className="catalogue-filter-control min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm shadow-none ring-0 outline-none placeholder:text-black/35 focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <VoiceInputButton onTranscript={onChange} />
      </span>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  optionLabels = {},
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-carbon-900 mb-2 block text-sm font-medium">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="catalogue-filter-control text-carbon-900 h-12 w-full appearance-none rounded-full border-0 bg-white pr-11 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels[option] ?? option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-black/55" />
      </span>
    </label>
  );
}

function RenterActivityCard({
  icon: Icon,
  title,
  description,
  property,
  update,
  href,
  action,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  property: string;
  update: string;
  href: string;
  action: string;
}) {
  return (
    <article className="rounded-[1.75rem] bg-black/[0.04] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="font-bricolage text-2xl font-medium tracking-[-0.03em]">
            {title}
          </h2>
          <p className="text-carbon-500 mt-2 text-sm">{description}</p>
        </div>
        <Icon className="size-5" />
      </div>
      <div className="mt-8 rounded-2xl bg-white p-5">
        <p className="font-bricolage font-medium">{property}</p>
        <p className="text-carbon-500 mt-2 flex items-center gap-2 text-sm">
          <Clock3 className="size-4" /> {update}
        </p>
      </div>
      <Link
        href={href}
        className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors duration-150"
      >
        {action} <ArrowUpRight className="size-4" />
      </Link>
    </article>
  );
}
