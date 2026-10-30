import type { Metadata } from "next";
import { FlatmatesPageClient } from "./flatmates-client";

export const metadata: Metadata = {
  title: "Find a flatmate | RentUp",
  description:
    "Find someone compatible to share a home and rent with across Rwanda, Kenya, and Nigeria.",
};

export default async function FlatmatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FlatmatesPageClient searchParams={searchParams} />;
}
