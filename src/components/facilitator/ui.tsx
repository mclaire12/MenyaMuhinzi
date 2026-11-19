import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cropOf, statusLabels } from "@/lib/mock/crops";
import type { MockResource } from "@/lib/mock/store";
import type { CourseStatus, CropSlug } from "@/lib/mock/types";

export function StatusPill({ status }: { status: CourseStatus }) {
  return <span className="status-pill" data-status={status}>{statusLabels[status]}</span>;
}

export function CropTag({ crop }: { crop: CropSlug | "mixed" }) {
  return <span className="crop-tag" data-crop={crop}>{crop === "mixed" ? "Imboga zitandukanye" : cropOf(crop).name_rw}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string | undefined }) {
  return <article className="admin-stat"><span>{label}</span><b>{value}</b>{hint && <small className="block text-xs text-muted-foreground">{hint}</small>}</article>;
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="admin-panel"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">{title}</h2>{action}</div>{children}</section>;
}

export function Empty({ text }: { text: string }) {
  return <p className="fac-empty">{text}</p>;
}

export function Loadable<T>({ resource, children, empty }: { resource: MockResource<T>; children: (data: T) => ReactNode; empty?: (data: T) => string | null }) {
  if (resource.status === "loading") return <div className="fac-loading" role="status"><LoaderCircle className="animate-spin" aria-hidden />Loading…</div>;
  if (resource.status === "error") return <div className="fac-error" role="alert"><AlertTriangle aria-hidden /><span>The demo service failed to load this page.</span><Button size="sm" variant="outline" onClick={resource.retry}><RefreshCw aria-hidden />Try again</Button></div>;
  const message = empty?.(resource.data);
  return <>{message ? <Empty text={message} /> : children(resource.data)}</>;
}

export function Bar({ value, label }: { value: number; label?: string }) {
  return <span className="fac-bar" role="img" aria-label={label ?? `${value}%`}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span>;
}

export function ConfirmDialog({ open, onOpenChange, title, text, confirmLabel, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; text: string; confirmLabel: string; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{text}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function ConfirmButton({ label, title, text, onConfirm, variant = "outline", size = "sm" }: { label: string; title: string; text: string; onConfirm: () => void; variant?: "outline" | "destructive" | "default" | "ghost"; size?: "sm" | "default" }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button variant={variant} size={size}>{label}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{text}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{label}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const lines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
