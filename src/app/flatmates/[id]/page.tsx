import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFlatmate, PUBLIC_FLATMATES } from "@/data/public-flatmates";
import { FlatmateDetailClient } from "./flatmate-detail-client";

export function generateStaticParams() {
  return PUBLIC_FLATMATES.map(({ id }) => ({ id }));
}

type FlatmateProfileProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const flatmate = getPublicFlatmate(id);
  return flatmate
    ? {
        title: `${flatmate.firstName}'s flatmate profile | RentUp`,
        description: `View ${flatmate.firstName}'s public housing preferences and flatmate profile.`,
      }
    : { title: "Flatmate profile | RentUp" };
}

export default async function PublicFlatmateProfile({
  params,
  searchParams,
}: FlatmateProfileProps) {
  const { id } = await params;
  const renterView = (await searchParams).from === "renter";
  const flatmate = getPublicFlatmate(id);
  if (!flatmate) notFound();

  return (
    <FlatmateDetailClient
      initialFlatmate={flatmate}
      id={id}
      renterView={renterView}
    />
  );
}
