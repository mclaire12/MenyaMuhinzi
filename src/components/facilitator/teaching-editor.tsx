import { ArrowDown, ArrowUp, Eye, LoaderCircle, Pencil, Plus, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFacilitator } from "@/components/facilitator/shell";
import { ConfirmButton, CropTag, Empty, formatDate, formatDateTime, Panel } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { myGroups } from "@/lib/mock/services/groups";
import { archiveMaterial, generateTeaching, publishMaterial, regenerateSection, restoreMaterial, saveMaterial, type TeachingDraft } from "@/lib/mock/services/teaching";
import type { TeachingAudience, TeachingMaterial, TeachingSection } from "@/lib/mock/types";

export const audienceLabels: Record<TeachingAudience, string> = { beginner: "Beginner farmers", intermediate: "Intermediate farmers", advanced: "Advanced farmers" };
export const materialStatusLabels: Record<TeachingMaterial["status"], string> = { draft: "Draft", published: "Published", archived: "Archived" };

const snapshotOf = (draft: TeachingDraft) => JSON.stringify({ title: draft.title, sections: draft.sections, variant: draft.variant, input: draft.input });

export function MaterialEditor({ initial, material, onSaved, onDiscard, startPublishing = false }: { initial: TeachingDraft; material?: TeachingMaterial; onSaved: (id: string) => void; onDiscard?: () => void; startPublishing?: boolean }) {
  const { facilitator } = useFacilitator();
  const [draft, setDraft] = useState(initial);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [busy, setBusy] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(startPublishing && !!material);
  const dirty = !material || snapshotOf(draft) !== snapshotOf(material);
  const archived = material?.status === "archived";
  const totalMinutes = draft.sections.reduce((sum, item) => sum + (item.minutes ?? 0), 0);

  const setSection = (id: string, change: Partial<TeachingSection>) => setDraft((current) => ({ ...current, sections: current.sections.map((item) => (item.id === id ? { ...item, ...change } : item)) }));
  function move(index: number, by: number) {
    setDraft((current) => {
      const sections = [...current.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(index + by, 0, item!);
      return { ...current, sections };
    });
  }
  function addSection() {
    const id = `custom-${Date.now().toString(36)}`;
    setDraft((current) => ({ ...current, sections: [...current.sections, { id, kind: "custom", heading: "Igice gishya", body: "", minutes: null }] }));
    setMode("edit");
  }

  async function regenerateAll() {
    setBusy("all");
    try {
      const next = await generateTeaching(draft.input, draft.variant + 1);
      setDraft(next);
      toast.success("A new version of the whole material was generated. Review it before saving.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally { setBusy(null); }
  }

  async function regenerateOne(section: TeachingSection) {
    setBusy(section.id);
    try {
      const variant = draft.variant + 1;
      const next = await regenerateSection(draft.input, section, variant + draft.sections.indexOf(section));
      if (!next) { toast.error("This section cannot be regenerated."); return; }
      setSection(section.id, { heading: next.heading, body: next.body, minutes: next.minutes });
      toast.success(`“${next.heading}” regenerated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally { setBusy(null); }
  }

  function save() {
    if (draft.title.trim().length < 5) { toast.error("The title needs at least 5 characters."); return; }
    if (!draft.sections.length) { toast.error("Keep at least one section."); return; }
    const empty = draft.sections.find((item) => !item.heading.trim() || !item.body.trim());
    if (empty) { toast.error(`Complete the section “${empty.heading || "untitled"}” or remove it.`); setMode("edit"); return; }
    const id = saveMaterial(facilitator.id, draft, material?.id);
    toast.success(material ? "Changes saved." : "Saved as a draft. It is not visible to farmers until you publish it.");
    onSaved(id);
  }

  return <div className="teach-layout">
    <div className="grid gap-3">
      <div className="admin-actions">
        <Button size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}><Eye aria-hidden />Preview</Button>
        <Button size="sm" variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")} disabled={archived}><Pencil aria-hidden />Edit</Button>
        {dirty && <span className="self-center text-sm text-muted-foreground">{material ? "Unsaved changes" : "Not saved yet"}</span>}
      </div>
      {mode === "preview" ? <article className="admin-panel teach-preview">
        <h1 className="text-2xl">{draft.title}</h1>
        <p className="text-sm text-muted-foreground">{audienceLabels[draft.input.audience]} · {draft.input.durationMinutes} min{totalMinutes ? ` (topics planned: ${totalMinutes} min)` : ""} · {draft.input.language === "rw" ? "Kinyarwanda" : "English"}</p>
        {draft.sections.map((section) => <section key={section.id}>
          <h2>{section.heading}{section.minutes ? <span className="teach-time"> · {section.minutes} min</span> : null}</h2>
          <p>{section.body}</p>
        </section>)}
      </article> : <>
        <label className="grid gap-1 text-sm font-semibold">Title<input className="teach-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        {draft.sections.map((section, index) => <section key={section.id} className="teach-section">
          <header>
            <span className="text-xs font-bold uppercase text-muted-foreground">Section {index + 1}{section.kind === "custom" ? " · added by you" : ""}</span>
            <span className="admin-actions">
              <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp aria-hidden /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="Move down" disabled={index === draft.sections.length - 1} onClick={() => move(index, 1)}><ArrowDown aria-hidden /></Button>
              {section.kind !== "custom" && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void regenerateOne(section)}>{busy === section.id ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}Regenerate</Button>}
              <ConfirmButton label="Remove" title={`Remove “${section.heading}”?`} text="The section is removed from this material. You can regenerate the whole material to get it back." onConfirm={() => setDraft((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== section.id) }))} variant="ghost" />
            </span>
          </header>
          <div className="fac-row">
            <label className="grid gap-1 text-sm font-semibold">Heading<input value={section.heading} onChange={(event) => setSection(section.id, { heading: event.target.value })} /></label>
            <label className="grid gap-1 text-sm font-semibold">Minutes<input type="number" min={0} max={240} value={section.minutes ?? ""} onChange={(event) => setSection(section.id, { minutes: event.target.value === "" ? null : Math.max(0, Number(event.target.value)) })} /></label>
          </div>
          <label className="grid gap-1 text-sm font-semibold">Content<textarea rows={Math.min(12, Math.max(4, section.body.split("\n").length + 1))} value={section.body} onChange={(event) => setSection(section.id, { body: event.target.value })} /></label>
        </section>)}
        <div><Button variant="outline" onClick={addSection}><Plus aria-hidden />Add section</Button></div>
      </>}
    </div>
    <aside className="grid gap-3">
      <Panel title="Material">
        <dl className="fac-facts">
          <div><dt>Crop</dt><dd><CropTag crop={draft.input.crop} /></dd></div>
          <div><dt>Audience</dt><dd>{audienceLabels[draft.input.audience]}</dd></div>
          <div><dt>Duration</dt><dd>{draft.input.durationMinutes} minutes</dd></div>
          <div><dt>Status</dt><dd>{material ? materialStatusLabels[material.status] : "Generated, not saved"}</dd></div>
          {material && <div><dt>Last saved</dt><dd>{formatDateTime(material.updatedAt)}</dd></div>}
        </dl>
        <div className="mt-3 grid gap-2">
          <Button onClick={save} disabled={!dirty || archived || !!busy}>{material ? "Save changes" : "Save as draft"}</Button>
          <ConfirmButton label="Regenerate entire material" title="Regenerate the whole material?" text="All sections and the title are replaced by a new version. Unsaved edits are lost." onConfirm={() => void regenerateAll()} size="default" />
          {busy === "all" && <p className="fac-loading" role="status"><LoaderCircle className="animate-spin" aria-hidden />Generating a new version…</p>}
          {material && !archived && <Button variant="outline" disabled={dirty} title={dirty ? "Save your changes first" : undefined} onClick={() => setPublishing(true)}><Send aria-hidden />Publish to groups</Button>}
          {material && dirty && !archived && <small className="text-muted-foreground">Save your changes before publishing.</small>}
          {material && !archived && <ConfirmButton label="Archive" variant="ghost" size="default" title="Archive this material?" text="It is hidden from your active list and from group members. You can restore it later." onConfirm={() => { archiveMaterial(material.id, facilitator.id); toast.success("Material archived."); }} />}
          {material && archived && <Button variant="outline" onClick={() => { restoreMaterial(material.id, facilitator.id); toast.success("Material restored."); }}>Restore</Button>}
          {!material && onDiscard && <ConfirmButton label="Discard" variant="ghost" size="default" title="Discard this generated material?" text="Nothing has been saved yet." onConfirm={onDiscard} />}
        </div>
      </Panel>
      {material && <Panel title="Publications">
        {material.publications.length === 0 ? <Empty text="Not published yet. Farmers cannot see drafts." /> : <PublicationList material={material} />}
      </Panel>}
    </aside>
    {material && <PublishDialog material={material} open={publishing} onOpenChange={setPublishing} />}
  </div>;
}

function PublicationList({ material }: { material: TeachingMaterial }) {
  const { state } = useFacilitator();
  return <ul className="fac-list">{material.publications.map((item) => <li key={item.id}><span>{item.groupIds.map((id) => state.groups.find((group) => group.id === id)?.name ?? id).join(", ")}<small className="block text-muted-foreground">{formatDate(item.at)} · {item.by}</small></span></li>)}</ul>;
}

function PublishDialog({ material, open, onOpenChange }: { material: TeachingMaterial; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { facilitator, state } = useFacilitator();
  const groups = myGroups(state, facilitator.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<"choose" | "review">("choose");
  const chosen = groups.filter((group) => selected.includes(group.id));
  const already = new Set(material.publications.flatMap((item) => item.groupIds));
  function close(next: boolean) { onOpenChange(next); if (!next) { setSelected([]); setStep("choose"); } }
  function confirm() {
    const error = publishMaterial(material.id, facilitator.id, selected);
    if (error) { toast.error(error); return; }
    toast.success(`Published to ${chosen.length} group${chosen.length === 1 ? "" : "s"}: ${chosen.map((group) => group.name).join(", ")}.`);
    close(false);
  }
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{step === "choose" ? "Publish to groups" : "Review and confirm"}</DialogTitle>
        <DialogDescription>{step === "choose" ? `Choose the groups that should receive “${material.title}”.` : "Smartphone members will see it in their notices. Use it in person with basic-phone members."}</DialogDescription>
      </DialogHeader>
      {step === "choose" ? (groups.length === 0 ? <Empty text="You have no groups yet. Create a group first." /> : <ul className="fac-pick">{groups.map((group) => <li key={group.id}><label>
        <input type="checkbox" checked={selected.includes(group.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))} />
        <span><b>{group.name}</b><small className="block text-muted-foreground">{group.memberIds.length} members · {group.sector}, {group.district}{already.has(group.id) ? " · already published here" : ""}</small></span>
      </label></li>)}</ul>) : <ul className="fac-list">{chosen.map((group) => <li key={group.id}><span><b>{group.name}</b><small className="block text-muted-foreground">{group.memberIds.length} members</small></span></li>)}</ul>}
      <DialogFooter>
        {step === "choose" ? <><Button variant="outline" onClick={() => close(false)}>Cancel</Button><Button disabled={!selected.length} onClick={() => setStep("review")}>Review {selected.length || ""} selected</Button></>
          : <><Button variant="outline" onClick={() => setStep("choose")}>Back</Button><Button onClick={confirm}><Send aria-hidden />Confirm publication</Button></>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
