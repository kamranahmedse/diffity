import { redirect } from "react-router";
import type { Route } from "./+types/tour.$tourId._index";
import { queryClient } from "../lib/query-client";
import { tourOptions } from "../queries/tree";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const tour = await queryClient.ensureQueryData(tourOptions(params.tourId));
  if (tour.steps.length > 0) {
    throw redirect(`/tour/${params.tourId}/0`);
  }
  throw redirect("/tree");
}

export default function TourIndex() {
  return null;
}
