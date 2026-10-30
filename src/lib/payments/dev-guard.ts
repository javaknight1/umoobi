import "server-only";
import { notFound } from "next/navigation";
import { devProvidersAllowed, payments } from "./index";

/** Dev payment pages exist only while the dev provider is active. */
export function assertDevPayments() {
  if (!devProvidersAllowed() || payments().name !== "dev") notFound();
}
