import type { Route } from "./+types/tour.$tourId.$step";
import { queryClient } from "../lib/query-client";
import { treePathsOptions, treeInfoOptions, treeFileContentOptions, tourOptions } from "../queries/tree";
import { TreePage } from "../components/tree/tree-page";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const tourId = params.tourId;
  const stepIndex = parseInt(params.step, 10);

  const [tour] = await Promise.all([
    queryClient.ensureQueryData(tourOptions(tourId)),
    queryClient.ensureQueryData(treePathsOptions()),
    queryClient.ensureQueryData(treeInfoOptions()),
  ]);

  const step = tour.steps[stepIndex];
  if (step) {
    await queryClient.ensureQueryData(treeFileContentOptions(step.filePath));
  }

  return { tourId, stepIndex };
}

export default function TourStepRoute({ loaderData }: Route.ComponentProps) {
  return <TreePage tourId={loaderData.tourId} tourStepIndex={loaderData.stepIndex} />;
}
