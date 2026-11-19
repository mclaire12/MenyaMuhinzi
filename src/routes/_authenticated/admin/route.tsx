import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/shell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Portal — MenyaMuhinzi" }] }),
  component: AdminLayout,
});
