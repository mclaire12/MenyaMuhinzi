import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDate, PageHead, Pill, RowMenu, useAdminActor } from "@/components/admin/shell";
import { ConfirmDialog } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { addKnowledge, approvalLabels, approvalOf, documentTypes, emptyKnowledge, knowledgeCrops, knowledgeTopics, removeKnowledge, setKnowledgeStatus, updateKnowledge, validateKnowledge, type Approval, type KnowledgeValues } from "@/lib/admin/knowledge";
import { useAdmin } from "@/lib/admin/store";
import type { KnowledgeSource, KnowledgeStatus } from "@/lib/admin/types";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({ component: KnowledgePage });

const approvalTone = { awaiting_review: "warn", approved: "ok", rejected: "bad", failed: "bad", archived: "muted" } as const;
const languageName = (code: string) => (code === "en" ? "English" : code === "fr" ? "French" : "Kinyarwanda");
const valuesOf = (item: KnowledgeSource): KnowledgeValues => ({ title: item.title, description: item.description ?? "", vegetable: item.vegetable, topic: item.topic ?? "General", language: item.language, author: item.author, kind: item.kind, fileName: item.fileName ?? "" });

type Pending = { item: KnowledgeSource; kind: "remove" | "archive" | "reject" } | null;

function KnowledgePage() {
  const data = useAdmin();
  const { name } = useAdminActor();
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("all");
  const [topic, setTopic] = useState("all");
  const [approval, setApproval] = useState<Approval | "current">("current");
  const [form, setForm] = useState<{ id: string | null; values: KnowledgeValues } | null>(null);
  const [viewing, setViewing] = useState<KnowledgeSource | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const rows = useMemo(() => data.knowledge.filter((item) => {
    const state = approvalOf(item.status);
    if (approval === "current" ? state === "archived" : state !== approval) return false;
    if (crop !== "all" && item.vegetable !== crop) return false;
    if (topic !== "all" && (item.topic ?? "General") !== topic) return false;
    return !query.trim() || `${item.title} ${item.description ?? ""} ${item.author}`.toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => (b.addedAt ?? b.updatedAt).localeCompare(a.addedAt ?? a.updatedAt)), [data.knowledge, approval, crop, topic, query]);
  const counts = data.knowledge.reduce((sum, item) => { sum[approvalOf(item.status)] += 1; return sum; }, { awaiting_review: 0, approved: 0, rejected: 0, failed: 0, archived: 0 } as Record<Approval, number>);

  function status(item: KnowledgeSource, next: KnowledgeStatus, message: string) {
    setKnowledgeStatus(name, item.id, next);
    toast.success(message);
  }

  return <>
    <PageHead title="Knowledge Base" text="Reference documents the farmer assistant may draw on. They support answers; they are not courses and farmers do not see them in Amasomo.">
      <Button onClick={() => setForm({ id: null, values: emptyKnowledge() })}><Plus aria-hidden />Add document</Button>
    </PageHead>
    <div className="admin-filters">
      <input aria-label="Search documents" placeholder="Search title, description or source" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Crop" value={crop} onChange={(event) => setCrop(event.target.value)}><option value="all">All crops</option>{knowledgeCrops.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="all">All topics</option>{knowledgeTopics.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Approval status" value={approval} onChange={(event) => setApproval(event.target.value as Approval | "current")}><option value="current">All except archived</option>{(Object.keys(approvalLabels) as Approval[]).map((item) => <option key={item} value={item}>{approvalLabels[item]} ({counts[item]})</option>)}</select>
    </div>
    {!rows.length ? <p className="fac-empty">{data.knowledge.length ? "No documents match these filters." : "No documents yet."}</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Title</th><th>Crop</th><th>Topic</th><th>Language</th><th>Source</th><th>Type</th><th>Status</th><th>Added</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{rows.map((item) => { const state = approvalOf(item.status); return <tr key={item.id}>
        <td><button type="button" className="text-left font-bold hover:underline" onClick={() => setViewing(item)}>{item.title}</button>{item.description && <small className="block text-muted-foreground">{item.description}</small>}</td>
        <td>{item.vegetable}</td>
        <td>{item.topic ?? "General"}</td>
        <td>{languageName(item.language)}</td>
        <td>{item.author}</td>
        <td><span className="type-pill">{item.kind}</span></td>
        <td><Pill tone={approvalTone[state]}>{approvalLabels[state]}</Pill></td>
        <td>{formatDate(item.addedAt ?? item.updatedAt)}</td>
        <td className="col-actions"><RowMenu label={item.title}>
          <DropdownMenuItem onSelect={() => setViewing(item)}>View details</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setForm({ id: item.id, values: valuesOf(item) })}>Edit details</DropdownMenuItem>
          {(state === "awaiting_review" || state === "rejected") && <DropdownMenuItem onSelect={() => status(item, "approved", "Document approved. The assistant may use it.")}>Approve</DropdownMenuItem>}
          {(state === "awaiting_review" || state === "approved") && <DropdownMenuItem onSelect={() => setPending({ item, kind: "reject" })}>Reject</DropdownMenuItem>}
          {state === "failed" && <DropdownMenuItem onSelect={() => status(item, "awaiting_review", "Upload retried. The document is waiting for review.")}>Retry upload</DropdownMenuItem>}
          <DropdownMenuSeparator />
          {state === "archived" ? <DropdownMenuItem onSelect={() => status(item, "awaiting_review", "Document restored for review.")}>Restore</DropdownMenuItem> : <DropdownMenuItem onSelect={() => setPending({ item, kind: "archive" })}>Archive</DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => setPending({ item, kind: "remove" })}>Remove</DropdownMenuItem>
        </RowMenu></td>
      </tr>; })}</tbody>
    </table></div>}
    <Dialog open={!!form} onOpenChange={(open) => { if (!open) setForm(null); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form?.id ? "Edit document details" : "Add a document"}</DialogTitle><DialogDescription>{form?.id ? "Only the details change; the file stays the same." : "New documents wait for review before the assistant can use them. In this demo only the file name is recorded."}</DialogDescription></DialogHeader>
        {form && <KnowledgeForm initial={form.values} isNew={!form.id} onCancel={() => setForm(null)} onSubmit={(values) => { if (form.id) { updateKnowledge(name, form.id, values); toast.success("Details saved."); } else { addKnowledge(name, values); toast.success("Document added and waiting for review."); } setForm(null); }} />}
      </DialogContent>
    </Dialog>
    <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{viewing?.title}</DialogTitle><DialogDescription>{viewing?.description || "No description."}</DialogDescription></DialogHeader>
        {viewing && <dl className="fac-facts">
          <div><dt>Status</dt><dd>{approvalLabels[approvalOf(viewing.status)]}</dd></div>
          <div><dt>Crop</dt><dd>{viewing.vegetable}</dd></div>
          <div><dt>Topic</dt><dd>{viewing.topic ?? "General"}</dd></div>
          <div><dt>Language</dt><dd>{languageName(viewing.language)}</dd></div>
          <div><dt>Source</dt><dd>{viewing.author}</dd></div>
          <div><dt>Document type</dt><dd>{viewing.kind}{viewing.fileName ? ` · ${viewing.fileName}` : ""}</dd></div>
          <div><dt>Added</dt><dd>{formatDate(viewing.addedAt ?? viewing.updatedAt)}</dd></div>
          <div><dt>Last updated</dt><dd>{formatDate(viewing.updatedAt)}</dd></div>
        </dl>}
        <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button>{viewing && <Button onClick={() => { setForm({ id: viewing.id, values: valuesOf(viewing) }); setViewing(null); }}>Edit details</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}
      title={pending?.kind === "remove" ? "Remove this document?" : pending?.kind === "archive" ? "Archive this document?" : "Reject this document?"}
      text={pending ? `${pending.item.title}: ${pending.kind === "remove" ? "it is deleted from the Knowledge Base. This cannot be undone." : pending.kind === "archive" ? "the assistant stops using it. You can restore it later." : "the assistant will not use it."}` : ""}
      confirmLabel={pending?.kind === "remove" ? "Remove" : pending?.kind === "archive" ? "Archive" : "Reject"}
      onConfirm={() => { if (!pending) return; if (pending.kind === "remove") { removeKnowledge(name, pending.item.id, pending.item.title); toast.success("Document removed."); } else status(pending.item, pending.kind === "archive" ? "archived" : "rejected", pending.kind === "archive" ? "Document archived." : "Document rejected."); setPending(null); }} />
  </>;
}

function KnowledgeForm({ initial, isNew, onSubmit, onCancel }: { initial: KnowledgeValues; isNew: boolean; onSubmit: (values: KnowledgeValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ReturnType<typeof validateKnowledge>>({});
  const set = <K extends keyof KnowledgeValues>(key: K, value: KnowledgeValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  return <form className="admin-form" noValidate onSubmit={(event) => { event.preventDefault(); const found = validateKnowledge(values); setErrors(found); if (!Object.keys(found).length) onSubmit(values); }}>
    <label>Title<input value={values.title} onChange={(event) => set("title", event.target.value)} aria-invalid={!!errors.title} />{errors.title && <span className="fac-field-error">{errors.title}</span>}</label>
    <label>Description<textarea rows={2} value={values.description} onChange={(event) => set("description", event.target.value)} /></label>
    <div className="fac-row">
      <label>Crop<select value={values.vegetable} onChange={(event) => set("vegetable", event.target.value)}>{knowledgeCrops.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Topic<select value={values.topic} onChange={(event) => set("topic", event.target.value)}>{knowledgeTopics.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Language<select value={values.language} onChange={(event) => set("language", event.target.value)}><option value="rw">Kinyarwanda</option><option value="en">English</option><option value="fr">French</option></select></label>
    </div>
    <div className="fac-row">
      <label>Source<input value={values.author} onChange={(event) => set("author", event.target.value)} placeholder="For example: RAB" aria-invalid={!!errors.author} />{errors.author && <span className="fac-field-error">{errors.author}</span>}</label>
      <label>Document type<select value={values.kind} onChange={(event) => set("kind", event.target.value as KnowledgeValues["kind"])}>{documentTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    {isNew && <label>File<input type="file" accept={documentTypes.map((item) => `.${item.toLowerCase()}`).join(",")} onChange={(event) => { const file = event.target.files?.[0]; set("fileName", file?.name ?? ""); const ext = file?.name.split(".").pop()?.toUpperCase(); if (ext && (documentTypes as string[]).includes(ext)) set("kind", ext as KnowledgeValues["kind"]); }} />{errors.fileName && <span className="fac-field-error">{errors.fileName}</span>}<small className="text-muted-foreground">The file itself is not uploaded in this demo.</small></label>}
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{isNew ? "Add document" : "Save details"}</Button></DialogFooter>
  </form>;
}
