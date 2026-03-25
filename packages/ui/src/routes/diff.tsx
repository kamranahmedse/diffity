import type { Route } from "./+types/diff";
import { queryClient } from "../lib/query-client";
import { diffOptions } from "../queries/diff";
import { repoInfoOptions } from "../queries/info";
import { DiffPage } from "../components/diff/diff-page";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") || "work";
  const theme = url.searchParams.get("theme") as "light" | "dark" | null;
  const view = url.searchParams.get("view") as "split" | "unified" | null;

  await Promise.all([
    queryClient.ensureQueryData(diffOptions(false, ref)),
    queryClient.ensureQueryData(repoInfoOptions(ref)),
  ]);

  return { ref, theme, view };
}

export default function DiffRoute({ loaderData }: Route.ComponentProps) {
  return <DiffPage />;
}
