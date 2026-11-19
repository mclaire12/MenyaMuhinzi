import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle, MoreHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { audienceLabels, MaterialEditor, materialStatusLabels } from "@/components/facilitator/teaching-editor";
import { ConfirmDialog, CropTag, formatDate, Loadable } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { crops } from "@/lib/mock/crops";
import { useMockResource } from "@/lib/mock/store";
import { archiveMaterial, generateTeaching, materialGroupIds, myMaterials, restoreMaterial, validateInput, type TeachingDraft } from "@/lib/mock/services/teaching";
import type { CropSlug, TeachingAudience, TeachingInput, TeachingMaterial } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/teaching/")({ component: TeachingPage });

const cropPlural: Record<CropSlug, string> = { tomato: "Tomatoes", cabbage: "Cabbages", carrot: "Carrots" };

const blank: TeachingInput = { topic: "", crop: "tomato", audience: "beginner", objectives: "", durationMinutes: 90, language: "rw", instructions: "" };

function TeachingPage() {
  const { facilitator } = useFacilitator();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<TeachingDraft | null>(null);
  const [creating, setCreating] = useState(false);
  if (draft) {
    return <>
      <PageHead title="Review generated material" text="Preview, edit or regenerate sections, then save it as a draft. Nothing is published automatically." />
      <MaterialEditor initial={draft} onDiscard={() => setDraft(null)} onSaved={(id) => navigate({ to: "/facilitator/teaching/$materialId", params: { materialId: id } })} />
    </>;
  }
  return <>
    <PageHead title="Generate Teaching Materials" text="Prepare a practical package for an in-person training session with your farmer groups.">
      <Button onClick={() => setCreating(true)}><Sparkles aria-hidden />Generate teaching material</Button>
    </PageHead>
    <Dialog open={creating} onOpenChange={setCreating}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>New teaching material</DialogTitle><DialogDescription>Describe the session in your own words. The demo generator writes simple Kinyarwanda by default and never adds pesticide or fertilizer doses.</DialogDescription></DialogHeader>
        <GenerateForm onGenerated={(next) => { setDraft(next); setCreating(false); }} />
      </DialogContent>
    </Dialog>
    <SavedMaterials facilitatorId={facilitator.id} />
  </>;
}

function GenerateForm({ onGenerated }: { onGenerated: (draft: TeachingDraft) => void }) {
  const { facilitator } = useFacilitator();
  const [values, setValues] = useState<TeachingInput>({ ...blank, language: facilitator.language === "en" ? "en" : "rw" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof TeachingInput>(key: K, value: TeachingInput[K]) => { setValues((current) => ({ ...current, [key]: value })); setError(null); };
  async function submit() {
    const problem = validateInput(values);
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      onGenerated(await generateTeaching(values));
      toast.success("Teaching material generated. Review it before saving.");
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Generation failed. Try again.");
    } finally { setBusy(false); }
  }
  return <form className="admin-form" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <fieldset disabled={busy} className="admin-form">
        <label>Teaching topic or title<textarea rows={2} value={values.topic} onChange={(event) => set("topic", event.target.value)} placeholder="Urugero: Prepare teaching materials about tomato diseases, their identification, prevention and management for smallholder farmers." />{error && <span className="fac-field-error" role="alert">{error}</span>}</label>
        <div className="fac-row">
          <label>Crop<select value={values.crop} onChange={(event) => set("crop", event.target.value as CropSlug)}>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{cropPlural[crop.slug]} ({crop.name_rw})</option>)}</select></label>
          <label>Target audience<select value={values.audience} onChange={(event) => set("audience", event.target.value as TeachingAudience)}>{(Object.keys(audienceLabels) as TeachingAudience[]).map((key) => <option key={key} value={key}>{audienceLabels[key]}</option>)}</select></label>
          <label>Training duration (minutes)<input type="number" min={30} max={480} step={15} value={values.durationMinutes} onChange={(event) => set("durationMinutes", Number(event.target.value))} /></label>
          <label>Language<select value={values.language} onChange={(event) => set("language", event.target.value as TeachingInput["language"])}><option value="rw">Kinyarwanda</option><option value="en">English</option></select></label>
        </div>
        <label>Training objectives<textarea rows={3} value={values.objectives} onChange={(event) => set("objectives", event.target.value)} placeholder={"One per line, or leave empty to generate them\nUrugero: Kumenya ibimenyetso by'ibibembe"} /></label>
        <label>Additional instructions (optional)<textarea rows={2} value={values.instructions} onChange={(event) => set("instructions", event.target.value)} placeholder="Urugero: Benshi ni abagore bafite telefoni zisanzwe; koresha ingero z'i Musanze." /></label>
      </fieldset>
      <div className="admin-actions">
        <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}{busy ? "Generating…" : "Generate material"}</Button>
        {busy && <span className="self-center text-sm text-muted-foreground" role="status">Writing the introduction, topics, demonstrations and questions…</span>}
      </div>
    </form>;
}

function MaterialActions({ material, onArchive, onRestore }: { material: TeachingMaterial; onArchive: () => void; onRestore: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${material.title}`}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link to="/facilitator/teaching/$materialId" params={{ materialId: material.id }}>{material.status === "draft" ? "Continue editing" : "View"}</Link></DropdownMenuItem>
        {material.status !== "archived" && <DropdownMenuItem asChild><Link to="/facilitator/teaching/$materialId" params={{ materialId: material.id }} search={{ publish: true }}>Publish</Link></DropdownMenuItem>}
        {material.status !== "archived" ? <DropdownMenuItem onSelect={() => setConfirm(true)}>Archive</DropdownMenuItem> : <DropdownMenuItem onSelect={onRestore}>Restore</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Archive this material?" confirmLabel="Archive" text="It is hidden from group members and from your active list. You can restore it." onConfirm={onArchive} />
  </>;
}

function SavedMaterials({ facilitatorId }: { facilitatorId: string }) {
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState<CropSlug | "all">("all");
  const [status, setStatus] = useState<TeachingMaterial["status"] | "active">("active");
  const resource = useMockResource((state) => myMaterials(state, facilitatorId).map((material) => ({ material, groups: materialGroupIds(material).map((id) => state.groups.find((group) => group.id === id)?.name ?? id) })));
  return <section>
    <h2 className="mb-2 text-xl">Saved teaching materials</h2>
    <div className="admin-filters">
      <input aria-label="Search materials" placeholder="Search title or topic" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Crop" value={crop} onChange={(event) => setCrop(event.target.value as typeof crop)}><option value="all">All crops</option>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_rw}</option>)}</select>
      <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="active">Drafts and published</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select>
    </div>
    <Loadable resource={resource} empty={(rows) => (rows.length ? null : "No saved materials yet. Generate one and save it as a draft.")}>{(rows) => {
      const text = query.trim().toLowerCase();
      const visible = rows.filter(({ material }) => (crop === "all" || material.input.crop === crop) && (status === "active" ? material.status !== "archived" : material.status === status) && (!text || `${material.title} ${material.input.topic}`.toLowerCase().includes(text)));
      if (!visible.length) return <p className="fac-empty">No materials match these filters.</p>;
      return <div className="staff-table"><table className="w-full text-sm">
        <thead><tr><th>Material</th><th>Crop</th><th>Status</th><th>Groups</th><th>Updated</th><th className="col-actions">Actions</th></tr></thead>
        <tbody>{visible.map(({ material, groups }) => <tr key={material.id}>
          <td className="max-w-xs"><Link className="font-bold" to="/facilitator/teaching/$materialId" params={{ materialId: material.id }}>{material.title}</Link><small className="block text-muted-foreground">{audienceLabels[material.input.audience]} · {material.input.durationMinutes} min · {material.sections.length} sections</small></td>
          <td><CropTag crop={material.input.crop} /></td>
          <td><span className="status-pill" data-status={material.status}>{materialStatusLabels[material.status]}</span></td>
          <td>{groups.length ? groups.join(", ") : "—"}</td>
          <td>{formatDate(material.updatedAt)}</td>
          <td className="col-actions"><MaterialActions material={material} onArchive={() => { archiveMaterial(material.id, facilitatorId); toast.success("Material archived."); }} onRestore={() => { restoreMaterial(material.id, facilitatorId); toast.success("Material restored."); }} /></td>
        </tr>)}</tbody>
      </table></div>;
    }}</Loadable>
  </section>;
}
