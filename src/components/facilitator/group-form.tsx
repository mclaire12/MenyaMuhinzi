import { useState } from "react";
import { Button } from "@/components/ui/button";
import { crops, provinces } from "@/lib/mock/crops";
import type { GroupValues } from "@/lib/mock/services/groups";
import type { FarmerGroup } from "@/lib/mock/types";

export const groupValues = (group: FarmerGroup): GroupValues => ({
  name: group.name, province: group.province, district: group.district, sector: group.sector, cell: group.cell, village: group.village, crop: group.crop, programme: group.programme,
  description: group.description ?? "", contactPerson: group.contactPerson ?? "", notes: group.notes ?? "",
});

export const emptyGroup: GroupValues = { name: "", province: "Northern Province", district: "Musanze", sector: "", cell: "", village: "", crop: "tomato", programme: "", description: "", contactPerson: "", notes: "" };

export const cropInterestLabel = (crop: FarmerGroup["crop"]) => (crop === "mixed" ? "Multiple crops" : crops.find((item) => item.slug === crop)?.name_rw ?? crop);

export function GroupForm({ initial, submitLabel, onSubmit, onCancel }: { initial: GroupValues; submitLabel: string; onSubmit: (values: GroupValues) => void; onCancel?: () => void }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof GroupValues, string>>>({});
  const set = <K extends keyof GroupValues>(key: K, value: GroupValues[K]) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); };
  function submit() {
    const next: typeof errors = {};
    if (values.name.trim().length < 3) next.name = "The group name needs at least 3 characters.";
    if (!values.sector.trim()) next.sector = "Enter the sector.";
    if (!values.cell.trim()) next.cell = "Enter the cell.";
    if (!values.village.trim()) next.village = "Enter the village.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const trim = (text: string) => text.trim();
    onSubmit({ ...values, name: trim(values.name), sector: trim(values.sector), cell: trim(values.cell), village: trim(values.village), programme: trim(values.programme), description: trim(values.description), contactPerson: trim(values.contactPerson), notes: trim(values.notes) });
  }
  const error = (key: keyof GroupValues) => errors[key] && <span className="fac-field-error">{errors[key]}</span>;
  return <form className="admin-form" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label>Group name<input value={values.name} onChange={(event) => set("name", event.target.value)} placeholder="Urugero: Abahinzi b'inyanya ba Kinigi" />{error("name")}</label>
    <label>Description<textarea rows={2} value={values.description} onChange={(event) => set("description", event.target.value)} placeholder="Who is in the group and when they meet" /></label>
    <div className="fac-row">
      <label>Province<select value={values.province} onChange={(event) => { set("province", event.target.value); set("district", provinces[event.target.value]?.[0] ?? ""); }}>{Object.keys(provinces).map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>District<select value={values.district} onChange={(event) => set("district", event.target.value)}>{(provinces[values.province] ?? []).map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>
    <div className="fac-row">
      <label>Sector<input value={values.sector} onChange={(event) => set("sector", event.target.value)} />{error("sector")}</label>
      <label>Cell<input value={values.cell} onChange={(event) => set("cell", event.target.value)} />{error("cell")}</label>
      <label>Village<input value={values.village} onChange={(event) => set("village", event.target.value)} />{error("village")}</label>
    </div>
    <div className="fac-row">
      <label>Main crop interest<select value={values.crop} onChange={(event) => set("crop", event.target.value as GroupValues["crop"])}>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{crop.name_rw} ({crop.name_en})</option>)}<option value="mixed">Multiple crops</option></select></label>
      <label>Contact person (optional)<input value={values.contactPerson} onChange={(event) => set("contactPerson", event.target.value)} placeholder="Name · 07XXXXXXXX" /></label>
    </div>
    <label>Additional notes<textarea rows={2} value={values.notes} onChange={(event) => set("notes", event.target.value)} /></label>
    <div className="admin-actions"><Button type="submit">{submitLabel}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>
  </form>;
}
