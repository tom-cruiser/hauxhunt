"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Eye,
  Heart,
  KeyRound,
  MousePointerClick,
} from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";

type Range = "7 days" | "30 days" | "90 days" | "This year";
type Metric = "Views" | "Saves" | "Viewing requests" | "Applications";

const PROPERTIES = [
  { id: "all", title: "All properties" },
  { id: "kacyiru-2br", title: "Kacyiru Residence" },
  { id: "nyarutarama-2br", title: "Nyarutarama Garden Apartment" },
  { id: "remera-3br", title: "Remera Family House" },
  { id: "kibagabaga-modern-family-home", title: "Modern Family Home" },
  { id: "kimironko-1br", title: "Kimironko Apartment" },
];

const RANGE_FACTOR: Record<Range, number> = {
  "7 days": 0.25,
  "30 days": 1,
  "90 days": 2.8,
  "This year": 9.6,
};

const BASE_TOTALS: Record<Metric, number> = {
  Views: 3_000,
  Saves: 780,
  "Viewing requests": 400,
  Applications: 180,
};

const WEIGHTS: Record<Metric, number[]> = {
  Views: [7, 8, 7, 9, 8, 10, 9, 11, 10, 11, 12, 13],
  Saves: [6, 7, 6, 8, 7, 9, 8, 10, 9, 10, 11, 12],
  "Viewing requests": [5, 6, 5, 7, 6, 8, 7, 9, 8, 9, 10, 11],
  Applications: [4, 5, 4, 6, 5, 7, 6, 8, 7, 8, 9, 10],
};

const PROPERTY_ROWS = [
  {
    id: "kacyiru-2br",
    title: "Kacyiru Residence",
    views: 860,
    requests: 122,
    applications: 52,
    conversion: 6.0,
  },
  {
    id: "nyarutarama-2br",
    title: "Nyarutarama Garden Apartment",
    views: 740,
    requests: 108,
    applications: 49,
    conversion: 6.6,
  },
  {
    id: "remera-3br",
    title: "Remera Family House",
    views: 620,
    requests: 82,
    applications: 37,
    conversion: 6.0,
  },
  {
    id: "kibagabaga-modern-family-home",
    title: "Modern Family Home",
    views: 510,
    requests: 59,
    applications: 28,
    conversion: 5.5,
  },
  {
    id: "kimironko-1br",
    title: "Kimironko Apartment",
    views: 270,
    requests: 29,
    applications: 14,
    conversion: 5.2,
  },
];

const RENTAL_INCOME = [
  {
    id: "kacyiru-2br",
    shortTitle: "Kacyiru",
    title: "Kacyiru Residence",
    monthly: 850_000,
  },
  {
    id: "nyarutarama-2br",
    shortTitle: "Nyarutarama",
    title: "Nyarutarama Garden Apartment",
    monthly: 920_000,
  },
  {
    id: "remera-3br",
    shortTitle: "Remera",
    title: "Remera Family House",
    monthly: 780_000,
  },
  {
    id: "kibagabaga-modern-family-home",
    shortTitle: "Kibagabaga",
    title: "Modern Family Home",
    monthly: 830_000,
  },
  {
    id: "kimironko-1br",
    shortTitle: "Kimironko",
    title: "Kimironko Apartment",
    monthly: 480_000,
  },
];

export default function OwnerPerformancePage() {
  const [range, setRange] = useState<Range>("30 days");
  const [propertyId, setPropertyId] = useState("all");
  const factor = RANGE_FACTOR[range];
  const propertyFactor =
    propertyId === "all"
      ? 1
      : (PROPERTY_ROWS.find((item) => item.id === propertyId)?.views ?? 0) /
        3_000;
  const totals = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(BASE_TOTALS).map(([key, value]) => [
          key,
          Math.round(value * factor * propertyFactor),
        ]),
      ) as Record<Metric, number>,
    [factor, propertyFactor],
  );
  const signedRentals = Math.max(1, Math.round(100 * factor * propertyFactor));

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="flex flex-col gap-6 border-b border-black/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">
                Performance
              </h1>
              <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
                Understand listing traffic, conversion, rental outcomes, and
                portfolio performance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="relative">
                <span className="sr-only">Filter by property</span>
                <select
                  value={propertyId}
                  onChange={(event) => setPropertyId(event.target.value)}
                  className="h-11 appearance-none rounded-full border-0 bg-white py-0 pr-11 pl-4 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.06)] outline-none"
                >
                  {PROPERTIES.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
              </label>
              <label className="relative">
                <span className="sr-only">Filter by date</span>
                <select
                  value={range}
                  onChange={(event) => setRange(event.target.value as Range)}
                  className="h-11 appearance-none rounded-full border-0 bg-white py-0 pr-11 pl-4 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.06)] outline-none"
                >
                  {(Object.keys(RANGE_FACTOR) as Range[]).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <ChevronDown className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
              </label>
            </div>
          </header>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Eye}
              label="Property views"
              value={totals.Views}
              note="Listing detail visits"
            />
            <MetricCard
              icon={Heart}
              label="Saved"
              value={totals.Saves}
              note={`${percent(totals.Saves, totals.Views)}% of views`}
            />
            <MetricCard
              icon={MousePointerClick}
              label="Viewing requests"
              value={totals["Viewing requests"]}
              note={`${percent(totals["Viewing requests"], totals.Views)}% of views`}
            />
            <MetricCard
              icon={KeyRound}
              label="Signed rentals"
              value={signedRentals}
              note={`${percent(signedRentals, totals.Applications)}% of applications`}
            />
          </div>

          <div className="mt-7">
            <TrafficChart totals={totals} range={range} />
          </div>

          <div className="mt-7">
            <RentalIncomeChart range={range} propertyId={propertyId} />
          </div>

          <div className="mt-7 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            <SummaryPanel
              title="Occupancy"
              rows={[
                ["Occupied", "3"],
                ["Upcoming", "1"],
                ["Vacant", "1"],
                ["Occupancy rate", "60%"],
              ]}
            />
            <SummaryPanel
              title="Rental outcomes"
              rows={[
                ["Active rentals", "3"],
                ["Renewals pending", "1"],
                ["Ending soon", "1"],
                ["Average vacancy", "18 days"],
              ]}
            />
            <SummaryPanel
              title="Rent collection"
              rows={[
                ["Expected", "RWF 3,130,000"],
                ["Received", "RWF 2,350,000"],
                ["Overdue", "RWF 780,000"],
                ["Collection rate", "75.1%"],
              ]}
            />
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <div className="flex items-center justify-between">
        <p className="text-carbon-500 text-xs">{label}</p>
        <Icon className="size-4" />
      </div>
      <p className="font-bricolage mt-4 text-3xl font-medium tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-carbon-500 mt-1 text-xs">{note}</p>
    </article>
  );
}

function TrafficChart({
  totals,
  range,
}: {
  totals: Record<Metric, number>;
  range: Range;
}) {
  const [metric, setMetric] = useState<Metric>("Views");
  const [hovered, setHovered] = useState<number | null>(null);
  const seriesByMetric = Object.fromEntries(
    (Object.keys(totals) as Metric[]).map((item) => [
      item,
      distribute(totals[item], WEIGHTS[item]),
    ]),
  ) as Record<Metric, number[]>;
  const series = seriesByMetric[metric];
  const maximum = Math.ceil(Math.max(...series) / 50) * 50 || 1;
  const yAxisValues = Array.from({ length: 5 }, (_, index) =>
    Math.round(maximum - (maximum * index) / 4),
  );
  const anchorDate = new Date(2026, 7, 24);
  const dayDates = (span: number) =>
    Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchorDate);
      date.setDate(
        anchorDate.getDate() - Math.round(span - (index * span) / 11),
      );
      return date;
    });
  const periodAxis: Record<Range, { interval: string; dates: Date[] }> = {
    "7 days": { interval: "Daily", dates: dayDates(11) },
    "30 days": { interval: "Daily", dates: dayDates(29) },
    "90 days": { interval: "Weekly", dates: dayDates(89) },
    "This year": {
      interval: "Monthly",
      dates: Array.from(
        { length: 12 },
        (_, index) =>
          new Date(
            anchorDate.getFullYear(),
            anchorDate.getMonth() - (11 - index),
            1,
          ),
      ),
    },
  };
  const axis = periodAxis[range];
  const xAxisLabels = axis.dates.map((date) =>
    range === "This year"
      ? date.toLocaleDateString("en-GB", { month: "short" })
      : date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
  );
  const hoveredDate =
    hovered === null
      ? ""
      : `${axis.dates[hovered].toLocaleDateString("en-GB", { weekday: "long" })} ${axis.dates[hovered].getDate()}, ${axis.dates[hovered].toLocaleDateString("en-GB", { month: "short" })} ${axis.dates[hovered].getFullYear()}`;
  const points = series.map((value, index) => ({
    x: (index / 11) * 800,
    y: 210 - (value / maximum) * 170,
  }));
  const path = points.reduce(
    (result, point, index) =>
      index === 0
        ? `M${point.x} ${point.y}`
        : `${result} C${(points[index - 1].x + point.x) / 2} ${points[index - 1].y}, ${(points[index - 1].x + point.x) / 2} ${point.y}, ${point.x} ${point.y}`,
    "",
  );
  const left =
    hovered === null
      ? "0"
      : `calc(${(hovered / 11) * 100}% + ${(1 - hovered / 11) * 3}rem)`;
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.055)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-bricolage text-xl font-medium">Traffic trend</h2>
          <p className="text-carbon-500 mt-1 text-sm">
            {axis.interval} activity · {range}
          </p>
        </div>
        <div className="flex flex-wrap rounded-full bg-black/[0.04] p-1">
          {(Object.keys(totals) as Metric[]).map((item) => (
            <button
              key={item}
              onClick={() => setMetric(item)}
              className={`h-9 rounded-full px-3 text-xs font-medium ${metric === item ? "bg-black text-white" : "text-black/45"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div
        className="relative mt-7 h-64 overflow-hidden"
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setHovered(
            Math.round(
              (Math.max(
                0,
                Math.min(event.clientX - bounds.left - 48, bounds.width - 48),
              ) /
                Math.max(bounds.width - 48, 1)) *
                11,
            ),
          );
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="absolute inset-y-0 left-0 z-10 flex w-10 flex-col justify-between bg-white/75 text-right text-[0.62rem] text-black/35">
          {yAxisValues.map((value, index) => (
            <span key={`${value}-${index}`}>{value.toLocaleString()}</span>
          ))}
        </div>
        <div className="absolute inset-0 left-12 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="border-t border-black/[0.06]" />
          ))}
        </div>
        <svg
          viewBox="0 0 800 240"
          preserveAspectRatio="none"
          className="relative z-10 ml-12 h-full w-[calc(100%-3rem)]"
        >
          <defs>
            <linearGradient
              id="ownerPerformanceArea"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="black" stopOpacity=".14" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L800 240 L0 240 Z`}
            fill="url(#ownerPerformanceArea)"
          />
          <path
            d={path}
            fill="none"
            stroke="black"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {hovered !== null ? (
          <>
            <span
              className="absolute inset-y-0 z-20 w-px bg-black/20"
              style={{ left }}
            />
            <div
              className={`absolute top-3 z-30 w-64 border border-black/10 bg-white p-5 shadow-xl ${hovered < 3 ? "" : hovered > 8 ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left }}
            >
              <p className="text-carbon-500 text-sm">{hoveredDate}</p>
              <div className="mt-4 space-y-3">
                {(Object.keys(totals) as Metric[]).map((item) => (
                  <p key={item} className="flex justify-between gap-3 text-sm">
                    <span className="text-carbon-500">{item}</span>
                    <strong>
                      {seriesByMetric[item][hovered].toLocaleString()}
                    </strong>
                  </p>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="ml-12 flex justify-between text-[0.62rem] text-black/35">
        {xAxisLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </section>
  );
}

function RentalIncomeChart({
  range,
  propertyId,
}: {
  range: Range;
  propertyId: string;
}) {
  const incomeFactor: Record<Range, number> = {
    "7 days": 0.25,
    "30 days": 1,
    "90 days": 3,
    "This year": 12,
  };
  const rows = RENTAL_INCOME.filter(
    (property) => propertyId === "all" || property.id === propertyId,
  ).map((property) => ({
    ...property,
    amount: Math.round(property.monthly * incomeFactor[range]),
  }));
  const maximum = Math.max(...rows.map((property) => property.amount), 1);
  const chartMaximum = maximum * 1.12;

  return (
    <section className="max-w-[760px] rounded-[1.75rem] bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.055)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-bricolage text-xl font-medium">
            Rental income by property
          </h2>
          <p className="text-carbon-500 mt-1 text-sm">
            Gross rent generated for the selected period.
          </p>
        </div>
        <span className="text-xs font-medium">RWF</span>
      </div>
      <div className="mt-8 px-5 pt-7 sm:px-8">
        <div className="flex h-60 items-end justify-around gap-3 border-b-2 border-black px-1 sm:gap-6 sm:px-4">
          {rows.map((property) => (
            <div
              key={property.id}
              className="relative flex h-full min-w-0 flex-1 items-end justify-center"
              title={`${property.title}: RWF ${property.amount.toLocaleString()}`}
            >
              <div
                className="relative w-7 translate-y-[2px] sm:w-9"
                style={{
                  height: `${Math.max((property.amount / chartMaximum) * 100, 3)}%`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute right-[-4px] bottom-0 h-[calc(100%_-_3px)] w-full rounded-t-[10px] bg-black"
                />
                <span className="absolute inset-0 z-10 rounded-t-[10px] border-2 border-black bg-white" />
                <span className="absolute -top-5 left-1/2 z-20 -translate-x-1/2 text-[0.6rem] font-bold whitespace-nowrap text-black">
                  {formatCompactRwf(property.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-around gap-3 px-1 py-3 sm:gap-6 sm:px-4">
          {rows.map((property) => (
            <span
              key={property.id}
              className="min-w-0 flex-1 text-center text-[0.62rem] leading-tight font-bold break-words text-black sm:text-xs"
              title={property.title}
            >
              {property.title}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryPanel({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
      <h2 className="font-bricolage text-lg font-medium">{title}</h2>
      <div className="mt-4 divide-y divide-black/8">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-carbon-500">{label}</span>
            <strong className="text-right">{value}</strong>
          </div>
        ))}
      </div>
      <Link
        href="/owner-dashboard/properties"
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
      >
        View details <ArrowUpRight className="size-3" />
      </Link>
    </section>
  );
}

function distribute(total: number, weights: number[]) {
  const sum = weights.reduce((result, value) => result + value, 0);
  const values = weights.map((value) => Math.round((total * value) / sum));
  values[values.length - 1] +=
    total - values.reduce((result, value) => result + value, 0);
  return values;
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 1_000) / 10 : 0;
}

function formatCompactRwf(value: number) {
  if (value >= 1_000_000) {
    return `${Math.round((value / 1_000_000) * 10) / 10}m`;
  }
  return `${Math.round(value / 1_000)}k`;
}
