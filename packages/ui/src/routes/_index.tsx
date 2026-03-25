import { redirect } from "react-router";

export function clientLoader() {
  throw redirect("/diff");
}

export default function Index() {
  return null;
}
