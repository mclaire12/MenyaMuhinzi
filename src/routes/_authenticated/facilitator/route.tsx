import { createFileRoute } from "@tanstack/react-router";
import { FacilitatorLayout } from "@/components/facilitator/shell";

export const Route = createFileRoute("/_authenticated/facilitator")({
  head: () => ({ meta: [{ title: "Facilitator Portal — MenyaMuhinzi" }, { name: "description", content: "Course creation, review, farmer groups and learning progress for agronomists." }] }),
  component: FacilitatorLayout,
});
