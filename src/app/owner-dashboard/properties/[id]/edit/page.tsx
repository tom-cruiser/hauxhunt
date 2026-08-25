"use client";

import { useRouter, useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { getOwnerProperty, updateProperty } from "@/lib/owner-data";

export default function EditOwnerPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const property = getOwnerProperty(params.id);
  const [saved, setSaved] = useState(false);

  if (!property) return notFound();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!property) return;
    const data = new FormData(event.currentTarget);
    updateProperty(property.id, {
      title: String(data.get("title") ?? property.title),
      location: String(data.get("location") ?? property.location),
      type: String(data.get("type") ?? property.type),
      bedrooms: Number(data.get("bedrooms") ?? property.bedrooms),
      bathrooms: Number(data.get("bathrooms") ?? property.bathrooms),
      size: Number(data.get("size") ?? property.size),
      rent: String(data.get("rent") ?? property.rent ?? ""),
    });
    setSaved(true);
    window.setTimeout(() => router.push(`/owner-dashboard/properties/${property.id}`), 700);
  }

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[720px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Edit Property</h1>
            <p className="text-carbon-600 mt-5 text-base leading-7">Update the details for {property.title}.</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field label="Property name" name="title" defaultValue={property.title} />
            <Field label="Location" name="location" defaultValue={property.location} />
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-carbon-900 mb-2 block text-sm font-medium">Property type</span>
                <select name="type" defaultValue={property.type} className="contact-field-control border-border-default h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black">
                  <option>Apartment</option>
                  <option>House</option>
                  <option>Studio</option>
                  <option>Townhouse</option>
                </select>
              </label>
              <Field label="Monthly rent" name="rent" defaultValue={property.rent ?? ""} placeholder="RWF 000,000 / month" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Bedrooms" name="bedrooms" type="number" defaultValue={String(property.bedrooms)} />
              <Field label="Bathrooms" name="bathrooms" type="number" defaultValue={String(property.bathrooms)} />
              <Field label="Size (m²)" name="size" type="number" defaultValue={String(property.size)} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-7 text-sm font-medium text-white hover:bg-black/80">
                Save Changes
              </button>
              {saved ? <span className="text-carbon-500 text-sm">Saved — returning to property…</span> : null}
            </div>
          </form>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-carbon-900 mb-2 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="contact-field-control border-border-default h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black"
      />
    </label>
  );
}
