import { useEffect, useState, useSyncExternalStore } from "react";
import { seedLearning } from "@/lib/mock/seed";
import type { LearningState } from "@/lib/mock/types";

const KEY = "mm-shared-learning-v1";
const SEED_VERSION = 1;
let snapshot: LearningState = seedLearning();
const listeners = new Set<() => void>();

function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved) as LearningState;
    if (parsed.version === SEED_VERSION) {
      const seed = seedLearning();
      const farmers = [...parsed.farmers, ...seed.farmers.filter((farmer) => !parsed.farmers.some((item) => item.id === farmer.id || item.phone === farmer.phone))];
      snapshot = { ...seed, ...parsed, farmers, settings: parsed.settings ?? seed.settings, noticeReads: parsed.noticeReads ?? seed.noticeReads };
    }
  } catch {
    snapshot = seedLearning();
  }
}

hydrate();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    hydrate();
    listeners.forEach((listener) => listener());
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getLearningState() {
  return snapshot;
}

export function useLearningState() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function mutate(change: (state: LearningState) => LearningState) {
  snapshot = change(snapshot);
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(snapshot));
  listeners.forEach((listener) => listener());
}

export function resetLearningState() {
  snapshot = seedLearning();
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  listeners.forEach((listener) => listener());
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const nowIso = () => new Date().toISOString();

export function wait(ms = snapshot.config.latencyMs) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class MockServiceError extends Error {}

export function takeSimulatedFailure() {
  if (!snapshot.config.failNextLoad) return false;
  mutate((state) => ({ ...state, config: { ...state.config, failNextLoad: false } }));
  return true;
}

export type MockResource<T> = { status: "loading" | "error" | "ready"; data: T; retry: () => void };

export function useMockResource<T>(select: (state: LearningState) => T): MockResource<T> {
  const state = useLearningState();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<MockResource<T>["status"]>("loading");
  useEffect(() => {
    setStatus("loading");
    let active = true;
    wait().then(() => { if (active) setStatus(takeSimulatedFailure() ? "error" : "ready"); });
    return () => { active = false; };
  }, [attempt]);
  return { status, data: select(state), retry: () => setAttempt((value) => value + 1) };
}
