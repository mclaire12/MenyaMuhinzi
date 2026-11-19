import { useSyncExternalStore } from "react";
import { seedAdmin } from "@/lib/admin/seed";
import type { AdminState, AuditEvent } from "@/lib/admin/types";

const KEY = "mm-admin-mock-v1";
let snapshot: AdminState = seedAdmin();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(snapshot));
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const seed = seedAdmin();
      const parsed = JSON.parse(saved) as AdminState;
      const users = parsed.users ?? seed.users;
      snapshot = { ...seed, ...parsed, users: [...users, ...seed.users.filter((user) => !users.some((item) => item.id === user.id || item.phone === user.phone))] };
    }
  } catch {
    snapshot = seedAdmin();
  }
}

hydrate();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAdminState() {
  return snapshot;
}

export function useAdmin() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function updateAdmin(actor: string, action: string, resource: string, detail: string, change: (state: AdminState) => AdminState) {
  const event: AuditEvent = { id: uid("au"), at: new Date().toISOString(), actor, action, resource, detail };
  snapshot = change(snapshot);
  snapshot = { ...snapshot, audit: [event, ...snapshot.audit].slice(0, 200) };
  persist();
}

export function resetAdmin() {
  snapshot = seedAdmin();
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  persist();
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? { info: "No rows" });
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))];
  const file = new Blob([lines.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
