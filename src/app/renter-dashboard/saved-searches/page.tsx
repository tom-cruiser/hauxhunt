"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Bed,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Pencil,
  Plus,
  Search,
  Sofa,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import emptyIllustration from "@/assets/images/empty.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { type SavedSearch, useSavedSearches } from "@/hooks/use-saved-searches";
import { PropertyRequestForm } from "@/components/properties/property-request-form";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { LockedFeature } from "@/components/tier/locked-feature";
import {
  type PropertyRequest,
  usePropertyRequests,
} from "@/hooks/use-property-requests";

type Tab = "searches" | "requests";
type DialogState = {
  type: "rename" | "edit" | "delete";
  search: SavedSearch;
} | null;

export default function SavedSearchesPage() {
  const { searches, updateSearch, deleteSearch } = useSavedSearches();
  const { requests, addRequest, removeRequest } = usePropertyRequests();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [tab, setTab] = useState<Tab>("searches");
  const [creating, setCreating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "requests") setTab("requests");
  }, []);

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            <div className="flex flex-wrap items-center justify-between gap-5 border-b border-black/10 pb-0">
              <div className="pb-5">
                <h1 className="dashboard-page-title text-carbon-900">
                  {tab === "searches" ? "Saved Searches" : "My Requests"}
                </h1>
                <p className="text-carbon-500 mt-3 max-w-2xl text-sm leading-6">
                  {tab === "searches"
                    ? "Keep track of the searches that matter to you and get notified when new homes match your preferences."
                    : "Tell us what you need and let verified property partners respond with relevant options."}
                </p>
              </div>
              {tab === "searches" ? (
                <Link
                  href="/renter-dashboard/properties"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  <Plus className="size-4" /> New Search
                </Link>
              ) : !creating ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  <Plus className="size-4" /> Create a property request
                </button>
              ) : null}
            </div>
            {/* Tabs */}
            <div className="flex gap-7">
              {(["searches", "requests"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setCreating(false); }}
                  className={`relative flex h-12 items-center text-sm font-medium capitalize ${
                    tab === t ? "text-black" : "text-black/45"
                  }`}
                >
                  {t === "searches" ? "Saved Searches" : "My Requests"}
                  {tab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pt-5 pb-9 sm:px-6 lg:px-11 lg:pb-12 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {tab === "requests" ? (
              <div className="mt-6">
                {creating ? (
                  <PropertyRequestForm
                    key={formKey}
                    onSubmitted={(data) => {
                      addRequest({
                        purpose: data.purpose ?? "",
                        country: data.country ?? "",
                        city: data.city ?? "",
                        neighbourhood: data.neighbourhood,
                        propertyType: data.propertyType ?? "",
                        bedrooms: data.bedrooms ?? "",
                        minimumBudget: data.minimumBudget ?? "",
                        maximumBudget: data.maximumBudget ?? "",
                        moveInDate: data.moveInDate ?? "",
                        furnishing: data.furnishing,
                        fullName: data.fullName ?? "",
                        phone: data.phone ?? "",
                        email: data.email ?? "",
                        notes: data.notes,
                      });
                      setCreating(false);
                      setFormKey((k) => k + 1);
                    }}
                  />
                ) : requests.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {requests.map((req) => (
                      <RequestCard
                        key={req.id}
                        request={req}
                        onDelete={() => removeRequest(req.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                    <Image
                      src={emptyIllustration}
                      alt=""
                      className="h-44 w-auto object-contain"
                    />
                    <h2 className="font-bricolage mt-6 text-3xl font-medium tracking-[-0.035em]">
                      No property requests yet
                    </h2>
                    <p className="text-carbon-500 mt-3 max-w-xl text-sm leading-6">
                      Tell us what you need and let verified property partners
                      respond with relevant options.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white"
                    >
                      <Plus className="size-4" /> Create a property request
                    </button>
                  </div>
                )}
              </div>
            ) : searches.length ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {searches.map((savedSearch) => (
                    <SavedSearchCard
                      key={savedSearch.id}
                      search={savedSearch}
                      onEdit={() =>
                        setDialog({ type: "edit", search: savedSearch })
                      }
                      onRename={() =>
                        setDialog({ type: "rename", search: savedSearch })
                      }
                      onDelete={() =>
                        setDialog({ type: "delete", search: savedSearch })
                      }
                      onToggleAlerts={() => {
                        updateSearch(savedSearch.id, {
                          alert:
                            savedSearch.alert === "paused"
                              ? "instant"
                              : "paused",
                        });
                      }}
                    />
                  ))}
                </div>
                <p className="text-carbon-400 mt-3 text-right text-[10px]">
                  © OpenStreetMap contributors
                </p>
              </>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <Image
                  src={emptyIllustration}
                  alt=""
                  className="h-44 w-auto object-contain"
                />
                <h2 className="font-bricolage mt-6 text-3xl font-medium tracking-[-0.035em]">
                  Save a search and let HauxHunt keep looking
                </h2>
                <p className="text-carbon-500 mt-3 max-w-xl text-sm leading-6">
                  Save your preferred location, budget and property preferences
                  so you can easily return to them and discover new matching
                  homes.
                </p>
                <Link
                  href="/renter-dashboard/properties"
                  className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white"
                >
                  <Search className="size-4" /> Find a Home
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      {dialog ? (
        <SearchDialog
          state={dialog}
          onClose={() => setDialog(null)}
          onSave={(updates) => {
            updateSearch(dialog.search.id, updates);
            setDialog(null);
          }}
          onDelete={() => {
            deleteSearch(dialog.search.id);
            setDialog(null);
          }}
        />
      ) : null}
    </>
  );
}

function RequestCard({
  request,
  onDelete,
}: {
  request: PropertyRequest;
  onDelete: () => void;
}) {
  const tier = useTier();
  const date = new Date(request.submittedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const chips = [
    { icon: Bed, label: `${request.bedrooms} bed${request.bedrooms === "1" ? "" : "s"}` },
    { icon: DollarSign, label: `$${request.minimumBudget}–$${request.maximumBudget}/mo` },
    ...(request.furnishing ? [{ icon: Sofa, label: request.furnishing }] : []),
    ...(request.moveInDate ? [{ icon: CalendarDays, label: `Move-in ${request.moveInDate}` }] : []),
  ];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.11)]">
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bricolage text-lg font-medium leading-tight tracking-[-0.02em]">
              {request.propertyType} in {request.city}
            </h2>
            {request.neighbourhood ? (
              <p className="text-carbon-400 mt-0.5 text-xs">{request.neighbourhood}, {request.country}</p>
            ) : (
              <p className="text-carbon-400 mt-0.5 text-xs">{request.country}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full border border-black/10 bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-black/50">
              Pending
            </span>
            {isPaidTier(tier) ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">
                Priority alert sent
              </span>
            ) : (
              <LockedFeature
                feature="tenant.redAlert"
                variant="badge"
                label="Priority alert"
              />
            )}
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          {chips.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-black/70"
            >
              <Icon className="size-3 shrink-0 text-black/40" />
              {label}
            </span>
          ))}
        </div>

        {/* Notes */}
        {request.notes && (
          <p className="text-carbon-500 line-clamp-2 text-sm leading-relaxed">{request.notes}</p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-black/[0.06] pt-4">
          <span className="text-carbon-400 text-xs">Submitted {date}</span>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/35 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-3" /> Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function SavedSearchCard({
  search,
  onEdit,
  onRename,
  onDelete,
  onToggleAlerts,
}: {
  search: SavedSearch;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleAlerts: () => void;
}) {
  const [latitude, longitude] = getSearchCoordinates(search.location);
  const mapDelta = 0.035;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - mapDelta}%2C${latitude - mapDelta}%2C${longitude + mapDelta}%2C${latitude + mapDelta}&layer=mapnik`;
  const params = new URLSearchParams({
    location: search.location.split(",")[0].replace(" / nearby", ""),
    type: search.type,
    bedrooms: search.bedrooms.match(/\d+/)?.[0] ?? "",
    savedSearch: search.name,
    matches: String(search.matches),
    newMatches: String(search.newMatches),
  });

  return (
    <article className="grid overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-white/70 backdrop-blur-xl sm:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative min-h-32 overflow-hidden bg-[#d9e5df]">
        <iframe
          title={`Map of ${search.location}`}
          src={mapUrl}
          loading="lazy"
          className="absolute -top-24 right-0 left-0 h-[calc(100%+12rem)] w-full border-0"
        />
      </div>
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-bricolage text-xl leading-tight font-medium tracking-[-0.025em]">
              {search.name}{" "}
              <span className="text-carbon-400 font-sans text-xs font-normal whitespace-nowrap">
                – 8/15/2026
              </span>
            </h2>
            <p className="mt-2 text-sm">
              {[search.bedrooms, search.type, search.price]
                .filter((value) => !value.startsWith("Any"))
                .join(", ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onToggleAlerts}
              aria-label={
                search.alert === "paused" ? "Resume alerts" : "Pause alerts"
              }
              className="flex size-9 items-center justify-center rounded-full text-black/60 hover:bg-black/[0.055] hover:text-black"
            >
              {search.alert === "paused" ? (
                <BellOff className="size-4" />
              ) : (
                <Bell className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onRename}
              aria-label={`Rename ${search.name}`}
              className="flex size-9 items-center justify-center rounded-full text-black/60 hover:bg-black/[0.055] hover:text-black"
            >
              <Pencil className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-carbon-500">
            {search.matches
              ? `${search.matches} matching homes`
              : "No matching homes right now"}
          </span>
          {search.newMatches > 0 ? (
            <span className="rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
              {search.newMatches} new
            </span>
          ) : null}
          <span className="text-carbon-500">
            {search.alert === "paused"
              ? "Alerts paused"
              : `${search.alert[0].toUpperCase()}${search.alert.slice(1)} alerts`}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs underline decoration-black/25 underline-offset-4 hover:decoration-black"
          >
            Edit criteria
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-end gap-5 pt-3">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-medium text-red-600 transition-opacity hover:opacity-65"
          >
            Delete Search
          </button>
          <Link
            href={`/renter-dashboard/properties?${params.toString()}`}
            className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-60"
          >
            See Results <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function getSearchCoordinates(location: string): [number, number] {
  const normalized = location.toLowerCase();
  if (normalized.includes("kacyiru")) return [-1.944, 30.083];
  if (normalized.includes("nyarutarama")) return [-1.929, 30.102];
  if (normalized.includes("cbd")) return [-1.9441, 30.0619];
  if (normalized.includes("gisenyi")) return [-1.7028, 29.2564];
  return [-1.9441, 30.0619];
}

function SearchDialog({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: NonNullable<DialogState>;
  onClose: () => void;
  onSave: (updates: Partial<SavedSearch>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(state.search.name);
  const [location, setLocation] = useState(state.search.location);
  const [type, setType] = useState(state.search.type);
  const [bedrooms, setBedrooms] = useState(state.search.bedrooms);
  const title =
    state.type === "delete"
      ? "Delete saved search?"
      : state.type === "rename"
        ? "Rename saved search"
        : "Edit Search";

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 p-5"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-9"
      >
        <div className="flex items-start justify-between gap-5">
          <h2
            id="search-dialog-title"
            className="font-bricolage text-3xl font-medium tracking-[-0.035em]"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-black/15"
          >
            <X className="size-4" />
          </button>
        </div>
        {state.type === "delete" ? (
          <p className="text-carbon-500 mt-4 text-sm leading-6">
            <strong className="font-medium text-black">
              “{state.search.name}”
            </strong>{" "}
            will be removed from your saved searches and you will stop receiving
            alerts for it.
          </p>
        ) : (
          <div className="mt-7 space-y-4">
            <Field label="Search name" value={name} onChange={setName} />
            {state.type === "edit" ? (
              <>
                <Field
                  label="Location"
                  value={location}
                  onChange={setLocation}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Home type" value={type} onChange={setType} />
                  <Field
                    label="Bedrooms"
                    value={bedrooms}
                    onChange={setBedrooms}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-black/15 px-5 text-sm font-medium"
          >
            Cancel
          </button>
          {state.type === "delete" ? (
            <button
              type="button"
              onClick={onDelete}
              className="h-11 rounded-full bg-red-600 px-6 text-sm font-medium text-white"
            >
              Delete Search
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                onSave({
                  name: name.trim() || state.search.name,
                  ...(state.type === "edit"
                    ? { location, type, bedrooms }
                    : {}),
                })
              }
              className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white"
            >
              {state.type === "rename" ? "Save" : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-black/15 px-4 text-sm outline-none focus:border-black"
      />
    </label>
  );
}
