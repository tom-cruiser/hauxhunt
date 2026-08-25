"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequestPropertyButton } from "@/components/properties/request-property-button";
import { ChevronLeft, List, LocateFixed, Map } from "lucide-react";
import { HistoryBackButton } from "@/components/navigation/history-back-button";
import type { Map as LeafletMap, Marker } from "leaflet";
import {
  Children,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "leaflet/dist/leaflet.css";
import emptyIllustration from "@/assets/images/empty.png";
import {
  formatDisplayPrice,
  useDisplayCurrency,
} from "@/components/currency/currency-selector";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
      character,
  );
}

type RenterMapCatalogueProps = {
  children: ReactNode;
  hiddenChildren: ReactNode;
  controls?: ReactNode;
  filters?: ReactNode;
  pagination?: ReactNode;
  requestCard?: ReactNode;
  resultCount: number;
  resultLabel: string;
  coordinates: Array<[number, number]>;
  priceValues: number[];
  markerCards: Array<{
    title: string;
    location: string;
    usdAmount: number;
    image: string;
    href: string;
  }>;
  pageStart: number;
  pageSize: number;
  initialCenter: [number, number];
  initialZoom?: number;
  fitMarkersOnLoad?: boolean;
  focusedMarkerIndex?: number;
  initiallyVisible?: boolean;
  filtersUnderTopBar?: boolean;
  context?: ReactNode;
  // Renter Listings back button -- only the renter-dashboard usage of this
  // catalogue passes this (see catalogue-page.tsx); the guest /properties
  // and /rent?map=1 usages leave it unset, since "back to the renter
  // dashboard" wouldn't make sense for a signed-out visitor.
  backHref?: string;
};

export function RenterMapCatalogue({
  children,
  hiddenChildren,
  controls,
  filters,
  pagination,
  requestCard,
  resultCount,
  resultLabel,
  coordinates,
  priceValues,
  markerCards,
  pageStart,
  pageSize,
  initialCenter,
  initialZoom = 12,
  fitMarkersOnLoad = false,
  focusedMarkerIndex,
  initiallyVisible = true,
  filtersUnderTopBar = false,
  context,
  backHref,
}: RenterMapCatalogueProps) {
  const router = useRouter();
  const currency = useDisplayCurrency();
  const [mapVisible, setMapVisible] = useState(initiallyVisible);
  const [locationState, setLocationState] = useState<
    "idle" | "locating" | "ready" | "unavailable"
  >("idle");
  const [currentCoordinates, setCurrentCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [visibleIndexes, setVisibleIndexes] = useState<number[]>(() =>
    coordinates.map((_, index) => index),
  );
  const markerCoordinates = useMemo(
    () =>
      coordinates.map(([latitude, longitude], index): [number, number] => [
        latitude + ((index % 3) - 1) * 0.0015,
        longitude + ((Math.floor(index / 3) % 3) - 1) * 0.0015,
      ]),
    [coordinates],
  );
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const currentLocationMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapVisible || !mapElementRef.current || mapRef.current) return;

    let cancelled = false;
    let map: LeafletMap | null = null;

    void import("leaflet").then((L) => {
      if (cancelled || !mapElementRef.current) return;

      map = L.map(mapElementRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(initialCenter, initialZoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      markerCoordinates.forEach((coordinate, index) => {
        const priceLabel = formatDisplayPrice(
          priceValues[index] ?? 0,
          currency,
        );
        const property = markerCards[index];
        const markerWidth = Math.max(
          70,
          Math.min(132, priceLabel.length * 7 + 24),
        );
        const propertyIcon = L.divIcon({
          className: "",
          html: `<span style="box-sizing:border-box;display:flex;width:${markerWidth}px;height:32px;align-items:center;justify-content:center;border-radius:999px;background:#000;border:3px solid #fff;padding:0 10px;box-shadow:0 4px 14px rgba(0,0,0,.3);color:#fff;font-family:var(--font-sans),sans-serif;font-size:11px;font-weight:600;line-height:1;letter-spacing:-.01em;white-space:nowrap">${escapeHtml(priceLabel)}</span>`,
          iconSize: [markerWidth, 32],
          iconAnchor: [markerWidth / 2, 16],
        });
        const marker = L.marker(coordinate, { icon: propertyIcon }).addTo(map!);
        if (property) {
          marker.bindPopup(
            `<article class="hauxhunt-map-preview"><img src="${escapeHtml(property.image)}" alt=""/><div><strong>${escapeHtml(`${formatDisplayPrice(property.usdAmount, currency)} / month`)}</strong><h3>${escapeHtml(property.title)}</h3><p>${escapeHtml(property.location)}</p></div></article>`,
            {
              className: "hauxhunt-map-popup",
              closeButton: false,
              autoClose: true,
              closeOnClick: false,
              autoPan: true,
              keepInView: true,
              autoPanPaddingTopLeft: [24, 84],
              autoPanPaddingBottomRight: [24, 24],
              offset: [0, -14],
              maxWidth: 250,
              minWidth: 250,
            },
          );
          marker.on("mouseover", () => marker.openPopup());
          marker.on("mouseout", () => marker.closePopup());
          marker.on("click", () => {
            window.location.assign(property.href);
          });
          if (index === focusedMarkerIndex) {
            marker.openPopup();
          }
        }
      });

      if (fitMarkersOnLoad && markerCoordinates.length > 0) {
        if (markerCoordinates.length === 1) {
          map.setView(markerCoordinates[0], initialZoom, { animate: false });
        } else {
          map.fitBounds(L.latLngBounds(markerCoordinates), {
            paddingTopLeft: [56, 92],
            paddingBottomRight: [56, 56],
            maxZoom: 14,
            animate: false,
          });
        }
      }

      const syncVisibleListings = () => {
        const mapSize = map!.getSize();
        const markerHalfWidth = 35;
        const markerHalfHeight = 15;
        setVisibleIndexes(
          markerCoordinates.flatMap((coordinate, index) => {
            const point = map!.latLngToContainerPoint(coordinate);
            const fullyVisible =
              point.x >= markerHalfWidth &&
              point.x <= mapSize.x - markerHalfWidth &&
              point.y >= markerHalfHeight &&
              point.y <= mapSize.y - markerHalfHeight;
            return fullyVisible ? [index] : [];
          }),
        );
      };

      const clearLocationFilter = () => {
        const input = mapElementRef.current
          ?.closest("section")
          ?.querySelector<HTMLInputElement>('input[name="location"]');
        if (input?.value) input.value = "";

        const url = new URL(window.location.href);
        if (url.searchParams.has("location")) {
          url.searchParams.delete("location");
          url.searchParams.delete("page");
          router.replace(`${url.pathname}${url.search}${url.hash}`, {
            scroll: false,
          });
        }
      };

      map.on("moveend zoomend", syncVisibleListings);
      map.on("dragstart zoomstart", clearLocationFilter);
      syncVisibleListings();
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [
    initialCenter,
    initialZoom,
    fitMarkersOnLoad,
    focusedMarkerIndex,
    currency,
    mapVisible,
    markerCards,
    markerCoordinates,
    priceValues,
    router,
  ]);

  useEffect(() => {
    if (!currentCoordinates || !mapRef.current) return;

    const showCurrentLocation = async () => {
      const L = await import("leaflet");
      const coordinate: [number, number] = [
        currentCoordinates.latitude,
        currentCoordinates.longitude,
      ];
      mapRef.current?.setView(coordinate, 15, { animate: true });
      currentLocationMarkerRef.current?.remove();
      const locationIcon = L.divIcon({
        className: "",
        html: '<span style="position:relative;display:flex;width:38px;height:38px;align-items:center;justify-content:center"><span style="position:absolute;width:38px;height:38px;border-radius:999px;background:rgba(66,133,244,.18)"></span><span style="position:relative;width:16px;height:16px;border-radius:999px;background:#4285f4;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span></span>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      currentLocationMarkerRef.current = L.marker(coordinate, {
        icon: locationIcon,
      }).addTo(mapRef.current!);
    };

    void showCurrentLocation();
  }, [currentCoordinates]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }

    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationState("ready");
      },
      () => setLocationState("unavailable"),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }

  const listingCards = Children.toArray(children);
  const hiddenListingCards = Children.toArray(hiddenChildren);

  function toggleMapVisibility() {
    const nextVisible = !mapVisible;
    setMapVisible(nextVisible);

    const url = new URL(window.location.href);
    if (nextVisible) url.searchParams.delete("mapHidden");
    else url.searchParams.set("mapHidden", "1");
    router.replace(`${url.pathname}${url.search}${url.hash}`, {
      scroll: false,
    });

    document
      .querySelectorAll<HTMLInputElement>('input[name="mapHidden"]')
      .forEach((input) => {
        input.value = nextVisible ? "" : "1";
      });
  }

  return (
    <section className="bg-carbon-50 flex h-full min-h-0 flex-col border-t border-black/10">
      {filtersUnderTopBar ? (
        <div className="bg-carbon-50 shrink-0 px-5 py-3 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {backHref ? (
              <HistoryBackButton
                fallbackHref={backHref}
                className="text-carbon-600 hover:text-carbon-900 mb-2 inline-flex h-8 items-center gap-1 text-sm font-medium"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Back
              </HistoryBackButton>
            ) : null}
            {context}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">{filters}</div>
              <div className="flex shrink-0 items-center gap-2">{controls}</div>
              <button
                type="button"
                onClick={toggleMapVisibility}
                aria-pressed={mapVisible}
                className="inline-flex h-10 shrink-0 items-center gap-2 border border-black/10 bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-black/[0.055]"
              >
                {mapVisible ? (
                  <List aria-hidden="true" className="size-4" />
                ) : (
                  <Map aria-hidden="true" className="size-4" />
                )}
                {mapVisible ? "Hide map" : "View on map"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {!filtersUnderTopBar ? (
        <button
          type="button"
          onClick={toggleMapVisibility}
          aria-pressed={mapVisible}
          className="fixed top-[7.65rem] right-5 z-40 inline-flex h-10 items-center gap-2 border border-black/10 bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-black/[0.055] sm:right-6 lg:right-11 xl:right-[52px]"
        >
          {mapVisible ? (
            <List aria-hidden="true" className="size-4" />
          ) : (
            <Map aria-hidden="true" className="size-4" />
          )}
          {mapVisible ? "Hide map" : "View on map"}
        </button>
      ) : null}
      <div
        className={`min-h-0 flex-1 ${
          mapVisible
            ? "grid lg:grid-cols-[minmax(520px,0.95fr)_minmax(520px,1.05fr)]"
            : "mx-auto w-full max-w-[1562px]"
        }`}
      >
        <div
          className={`h-full overflow-y-auto px-5 pb-6 sm:px-6 lg:px-7 ${
            mapVisible
              ? "lg:border-r lg:border-black/10"
              : "lg:px-11 xl:px-[52px]"
          }`}
        >
          {!filtersUnderTopBar || !mapVisible ? (
            <div
              className={`bg-carbon-50 border-b border-black/10 ${filtersUnderTopBar ? "mb-3 py-2" : "mb-5 py-4"} ${
                mapVisible
                  ? "sticky top-0 z-20 -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7"
                  : "relative px-0"
              }`}
            >
              {!filtersUnderTopBar ? (
                <div
                  className={
                    mapVisible
                      ? "[&_.catalogue-typed-filter]:hidden [&>form]:grid-cols-4"
                      : ""
                  }
                >
                  {filters}
                </div>
              ) : null}
              <div
                className={`${filtersUnderTopBar ? "mt-1" : "mt-4"} flex flex-wrap items-center justify-between gap-3`}
              >
                {!mapVisible ? (
                  <div>
                    <p className="font-bricolage text-lg font-medium">
                      {resultCount}{" "}
                      {resultCount === 1 ? "property" : "properties"}
                    </p>
                    <p className="text-carbon-500 text-xs">{resultLabel}</p>
                  </div>
                ) : (
                  <span />
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!mapVisible && !filtersUnderTopBar ? controls : null}
                </div>
              </div>
            </div>
          ) : null}
          {(
            mapVisible
              ? visibleIndexes.length === 0
              : hiddenListingCards.length === 0
          ) ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
              <Image
                src={emptyIllustration}
                alt="No properties available in this location"
                className="h-36 w-auto object-contain"
              />
              <h2 className="font-bricolage text-carbon-900 mt-5 text-2xl font-medium">
                No properties match these filters
              </h2>
              <p className="text-carbon-500 mt-2 max-w-md text-sm leading-6">
                Try adjusting or clearing some filters to see more available
                properties.
              </p>
              <RequestPropertyButton
                label="Request a property"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white transition-opacity hover:opacity-75"
              />
            </div>
          ) : (
            <div
              className={
                mapVisible
                  ? "grid gap-4 sm:grid-cols-2"
                  : "grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              }
            >
              {mapVisible
                ? visibleIndexes.map((index) => listingCards[index])
                : hiddenListingCards.slice(pageStart, pageStart + pageSize)}
            </div>
          )}
          {!mapVisible ? pagination : null}
          {!mapVisible ? requestCard : null}
        </div>

        {mapVisible ? (
          <div className="relative hidden h-full min-h-0 overflow-hidden bg-[#e8ece9] lg:block">
            <div ref={mapElementRef} className="absolute inset-0 z-0" />
            <button
              type="button"
              onClick={useCurrentLocation}
              className="absolute top-5 right-5 z-20 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              <LocateFixed className="size-4" />
              {locationState === "locating"
                ? "Finding location..."
                : locationState === "ready"
                  ? "Using current location"
                  : locationState === "unavailable"
                    ? "Location unavailable"
                    : "Use current location"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
