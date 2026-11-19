import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { audienceLabels, cropInterestOptions, validateTargetGroup, type GroupErrors, type TargetGroupValues } from "@/lib/admin/groups";
import type { TargetAudience } from "@/lib/admin/types";
import { provinces } from "@/lib/mock/crops";
import type { CropSlug } from "@/lib/mock/types";

type Props = { initial: TargetGroupValues; groupId: string | null; submitLabel: string; onSubmit: (values: TargetGroupValues) => void; onCancel: () => void };

export function TargetGroupForm({ initial, groupId, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<GroupErrors>({});
  const set = <K extends keyof TargetGroupValues>(key: K, value: TargetGroupValues[K]) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => { const next = { ...current }; delete next[key]; return next; }); };
  const error = (key: keyof TargetGroupValues) => errors[key] && <span className="fac-field-error">{errors[key]}</span>;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateTargetGroup(values, groupId);
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit(values);
  }

  return <form className="admin-form" noValidate onSubmit={submit}>
    <p className="fac-note">Groups decide who a course is published to. Farmers are never added to a group by hand: registered farmers whose location and crop match the group see its courses.</p>
    <label>Group name<input value={values.name} onChange={(event) => set("name", event.target.value)} placeholder="For example: Northern Province Tomato Farmers" aria-invalid={!!errors.name} />{error("name")}</label>
    <label>Description<textarea rows={2} value={values.description} onChange={(event) => set("description", event.target.value)} aria-invalid={!!errors.description} />{error("description")}</label>
    <div className="fac-row">
      <label>Target audience and level<select value={values.audience} onChange={(event) => set("audience", event.target.value as TargetAudience)}>{(Object.keys(audienceLabels) as TargetAudience[]).map((item) => <option key={item} value={item}>{audienceLabels[item]}</option>)}</select></label>
      <label>Crop interest<select value={values.crop} onChange={(event) => set("crop", event.target.value as CropSlug | "mixed")}>{cropInterestOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </div>
    <div className="fac-row">
      <label>Province<select value={values.province} onChange={(event) => setValues((current) => ({ ...current, province: event.target.value, district: "", sector: "" }))}>{Object.keys(provinces).map((item) => <option key={item}>{item}</option>)}</select>{error("province")}</label>
      <label>District<select value={values.district} onChange={(event) => setValues((current) => ({ ...current, district: event.target.value, sector: event.target.value ? current.sector : "" }))}><option value="">Whole province</option>{(provinces[values.province] ?? []).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Sector (optional)<input value={values.sector} disabled={!values.district} onChange={(event) => set("sector", event.target.value)} placeholder={values.district ? "Whole district" : "Choose a district first"} /></label>
    </div>
    <div className="fac-row">
      <label>Estimated farmers<input type="number" min={1} value={Number.isNaN(values.estimatedFarmers) ? "" : values.estimatedFarmers} onChange={(event) => set("estimatedFarmers", event.target.valueAsNumber)} aria-invalid={!!errors.estimatedFarmers} /><small className="text-muted-foreground">For planning only. It does not add anyone to the group.</small>{error("estimatedFarmers")}</label>
      <label>Language<select value={values.language} onChange={(event) => set("language", event.target.value as "rw" | "en")}><option value="rw">Kinyarwanda</option><option value="en">English</option></select></label>
    </div>
    <label>Notes (optional)<textarea rows={2} value={values.notes} onChange={(event) => set("notes", event.target.value)} /></label>
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{submitLabel}</Button></DialogFooter>
  </form>;
}
