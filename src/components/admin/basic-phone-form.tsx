import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BasicPhoneFarmerValues } from "@/lib/basic-phone/farmers";
import { crops, provinces } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";
import type { CropSlug } from "@/lib/mock/types";

export const emptyBasicPhoneFarmer = (): BasicPhoneFarmerValues => ({
  name: "", phone: "", province: "Northern Province", district: "Musanze", sector: "", cell: "", village: "",
  language: "rw", status: "active", facilitatorId: "fac1", cropInterest: ["tomato"],
});

type Props = { initial: BasicPhoneFarmerValues; submitLabel: string; onSubmit: (values: BasicPhoneFarmerValues) => string | null; onCancel?: () => void };

/** Registration and edit form for a farmer who learns only by USSD and IVR; no email is collected. */
export function BasicPhoneFarmerForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const learning = useLearningState();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const set = <K extends keyof BasicPhoneFarmerValues>(key: K, value: BasicPhoneFarmerValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onSubmit(values) ?? "");
  }

  function toggleCrop(crop: CropSlug, on: boolean) {
    set("cropInterest", on ? [...values.cropInterest, crop] : values.cropInterest.filter((item) => item !== crop));
  }

  return (
    <form className="admin-form admin-panel mb-4 max-w-2xl" onSubmit={submit} noValidate>
      <p className="text-sm text-muted-foreground">Basic-phone farmers learn by USSD and IVR only. They have no web login and no email.</p>
      <input value={values.name} onChange={(event) => set("name", event.target.value)} placeholder="Full name" aria-label="Full name" required />
      <input value={values.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Phone 07XXXXXXXX" aria-label="Phone number" inputMode="tel" required />
      <select value={values.province} aria-label="Province" onChange={(event) => setValues((current) => ({ ...current, province: event.target.value, district: provinces[event.target.value]?.[0] ?? "" }))}>
        {Object.keys(provinces).map((province) => <option key={province}>{province}</option>)}
      </select>
      <select value={values.district} aria-label="District" onChange={(event) => set("district", event.target.value)}>
        {(provinces[values.province] ?? []).map((district) => <option key={district}>{district}</option>)}
      </select>
      <input value={values.sector} onChange={(event) => set("sector", event.target.value)} placeholder="Sector" aria-label="Sector" required />
      <input value={values.cell} onChange={(event) => set("cell", event.target.value)} placeholder="Cell" aria-label="Cell" required />
      <input value={values.village} onChange={(event) => set("village", event.target.value)} placeholder="Village" aria-label="Village" required />
      <select value={values.language} aria-label="Preferred language" onChange={(event) => set("language", event.target.value === "en" ? "en" : "rw")}>
        <option value="rw">Kinyarwanda</option><option value="en">English</option>
      </select>
      <select value={values.status} aria-label="Account status" onChange={(event) => set("status", event.target.value as BasicPhoneFarmerValues["status"])}>
        <option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option>
      </select>
      <select value={values.facilitatorId} aria-label="Facilitator" onChange={(event) => set("facilitatorId", event.target.value)}>
        {learning.facilitators.map((person) => <option key={person.id} value={person.id}>Facilitator: {person.name}</option>)}
      </select>
      <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="sr-only">Crops of interest</legend>
        {crops.map((crop) => <label key={crop.slug} className="flex items-center gap-2"><input type="checkbox" checked={values.cropInterest.includes(crop.slug)} onChange={(event) => toggleCrop(crop.slug, event.target.checked)} />{crop.name_en}</label>)}
      </fieldset>
      {error && <p className="text-sm font-semibold text-destructive" role="alert">{error}</p>}
      <div className="admin-actions"><Button type="submit">{submitLabel}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>
    </form>
  );
}
