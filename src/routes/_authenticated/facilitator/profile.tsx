import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { ConfirmButton, CropTag, Panel } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { languageNames } from "@/lib/mock/crops";
import { resetLearningState } from "@/lib/mock/store";
import { setMockConfig, updateFacilitatorProfile } from "@/lib/mock/services/facilitators";
import type { ContentLanguage, NotificationPreferences } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/profile")({ component: Profile });

const notificationLabels: Record<keyof NotificationPreferences, string> = {
  reviewDecisions: "When a reviewer approves, rejects or comments on my course",
  farmerQuestions: "When my farmers ask questions the AI could not answer",
  weeklySummary: "Weekly learning summary",
  smsAlerts: "SMS alerts (not connected yet)",
};

function Profile() {
  const { facilitator, permissions, state } = useFacilitator();
  const [values, setValues] = useState({ name: facilitator.name, phone: facilitator.phone, email: facilitator.email, district: facilitator.district, title: facilitator.title, organisation: facilitator.organisation, qualification: facilitator.qualification, yearsOfExperience: facilitator.yearsOfExperience });
  function save() {
    if (values.name.trim().length < 3) { toast.error("Enter your full name."); return; }
    if (!/^07\d{8}$/.test(values.phone)) { toast.error("Phone must look like 07XXXXXXXX."); return; }
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) { toast.error("Enter a valid email address."); return; }
    updateFacilitatorProfile(facilitator.id, { ...values, name: values.name.trim() });
    toast.success("Profile saved.");
  }
  return <>
    <PageHead title="Profile & settings" text="Your personal and professional details, language and notifications. Platform-wide settings stay with administrators." />
    <div className="fac-grid">
      <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
        <h2 className="text-lg">Personal information</h2>
        <label>Full name<input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>
        <div className="fac-row"><label>Phone<input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></label><label>Email<input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label></div>
        <label>District<input value={values.district} onChange={(event) => setValues({ ...values, district: event.target.value })} /></label>
        <h2 className="mt-2 text-lg">Professional information</h2>
        <div className="fac-row"><label>Job title<input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label><label>Years of experience<input type="number" min={0} max={60} value={values.yearsOfExperience} onChange={(event) => setValues({ ...values, yearsOfExperience: Number(event.target.value) })} /></label></div>
        <label>Organisation<input value={values.organisation} onChange={(event) => setValues({ ...values, organisation: event.target.value })} /></label>
        <label>Qualification<input value={values.qualification} onChange={(event) => setValues({ ...values, qualification: event.target.value })} /></label>
        <p className="flex flex-wrap items-center gap-2 text-sm">Specialties: {facilitator.specialties.map((crop) => <CropTag key={crop} crop={crop} />)}</p>
        <div><Button type="submit">Save profile</Button></div>
      </form>
      <div className="space-y-3">
        <Panel title="Preferred language">
          <select aria-label="Preferred language" className="rounded-md border px-2 py-1" value={facilitator.language} onChange={(event) => { updateFacilitatorProfile(facilitator.id, { language: event.target.value as ContentLanguage }); toast.success("Language preference saved."); }}>{(Object.keys(languageNames) as ContentLanguage[]).map((code) => <option key={code} value={code}>{languageNames[code]}</option>)}</select>
          <p className="mt-2 text-xs text-muted-foreground">Used as the default language for new content. The portal interface translation comes with the planned i18n layer.</p>
        </Panel>
        <Panel title="Notifications">
          <ul className="space-y-2 text-sm">{(Object.keys(notificationLabels) as (keyof NotificationPreferences)[]).map((key) => <li key={key}><label className="flex items-center gap-2"><input type="checkbox" checked={facilitator.notifications[key]} onChange={(event) => { updateFacilitatorProfile(facilitator.id, { notifications: { ...facilitator.notifications, [key]: event.target.checked } }); toast.success("Notification preference saved."); }} />{notificationLabels[key]}</label></li>)}</ul>
        </Panel>
        <Panel title="Assigned responsibilities">
          <ul className="list-disc space-y-1 pl-5 text-sm">{facilitator.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="mt-2 text-sm">Permissions set by the administrator: approve other facilitators' courses — <b>{permissions.approve ? "yes" : "no"}</b>; publish approved courses — <b>{permissions.publish ? "yes" : "no"}</b>.</p>
        </Panel>
        <Panel title="Demo tools">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.config.failNextLoad} onChange={(event) => setMockConfig({ failNextLoad: event.target.checked })} />Make the next page load or AI request fail (to see the error state)</label>
          <div className="mt-3"><ConfirmButton label="Restore demo data" title="Restore the shared demo data?" text="Courses, farmers, groups, assignments and progress go back to the original demo records for every portal in this browser." onConfirm={() => { resetLearningState(); toast.success("Demo data restored."); }} /></div>
        </Panel>
      </div>
    </div>
  </>;
}
