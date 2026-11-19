import { useState } from "react";
import { Button } from "@/components/ui/button";
import { crops, provinces } from "@/lib/mock/crops";
import type { GroupValues } from "@/lib/mock/services/groups";

export const groupValues = ({ name, province, district, sector, cell, village, crop, programme }: GroupValues): GroupValues => ({ name, province, district, sector, cell, village, crop, programme });

export const emptyGroup: GroupValues = { name: "", province: "Northern Province", district: "Musanze", sector: "", cell: "", village: "", crop: "tomato", programme: "" };

export function GroupForm({ initial, submitLabel, onSubmit, onCancel }: { initial: GroupValues; submitLabel: string; onSubmit: (values: GroupValues) => void; onCancel?: () => void }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const set = <K extends keyof GroupValues>(key: K, value: GroupValues[K]) => { setValues((current) => ({ ...current, [key]: value })); setError(""); };
  function submit() {
    if (values.name.trim().length < 3) { setError("The group name needs at least 3 characters."); return; }
    if (!values.sector.trim()) { setError("Enter the sector."); return; }
    onSubmit({ ...values, name: values.name.trim(), sector: values.sector.trim(), cell: values.cell.trim(), village: values.village.trim(), programme: values.programme.trim() });
  }
  return <form className="admin-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label>Group name<input value={values.name} onChange={(event) => set("name", event.target.value)} /></label>
    <div className="fac-row">
      <label>Province<select value={values.province} onChange={(event) => { set("province", event.target.value); set("district", provinces[event.target.value]?.[0] ?? ""); }}>{Object.keys(provinces).map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>District<select value={values.district} onChange={(event) => set("district", event.target.value)}>{(provinces[values.province] ?? []).map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>
    <div className="fac-row">
      <label>Sector<input value={values.sector} onChange={(event) => set("sector", event.target.value)} /></label>
      <label>Cell<input value={values.cell} onChange={(event) => set("cell", event.target.value)} /></label>
      <label>Village<input value={values.village} onChange={(event) => set("village", event.target.value)} /></label>
    </div>
    <div className="fac-row">
      <label>Crop interest<select value={values.crop} onChange={(event) => set("crop", event.target.value as GroupValues["crop"])}>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{crop.name_rw}</option>)}<option value="mixed">Imboga zitandukanye</option></select></label>
      <label>Training programme<input value={values.programme} onChange={(event) => set("programme", event.target.value)} placeholder="Urugero: Inyanya 2026" /></label>
    </div>
    {error && <p className="fac-field-error">{error}</p>}
    <div className="admin-actions"><Button type="submit">{submitLabel}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>
  </form>;
}
