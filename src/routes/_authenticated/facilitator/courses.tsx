import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/facilitator/courses")({ component: () => <Outlet /> });
