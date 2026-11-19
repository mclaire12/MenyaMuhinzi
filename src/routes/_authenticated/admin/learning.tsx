import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import { cropOf } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/admin/learning")({ component: Learning });

function Learning() {
  const data = useAdmin();
  const learning = useLearningState();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const [tab, setTab] = useState<"analytics" | "assessments" | "groups" | "languages">("analytics");
  const [vegetable, setVegetable] = useState("all");
  const [channel, setChannel] = useState("all");
  const farmers = data.users.filter((person) => person.role.endsWith("FARMER") && (channel === "all" || person.channel === channel));
  const courses = learning.courses.filter((course) => course.status === "published" && (vegetable === "all" || cropOf(course.crop).name_en === vegetable));
  return <>
    <PageHead title="Learning" text="Progress, assessments, groups, and languages from the demo records." />
    <div className="admin-actions mb-4">{(["analytics", "assessments", "groups", "languages"] as const).map((item) => <Button key={item} variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>{item}</Button>)}</div>
    {tab === "analytics" && <>
      <div className="admin-filters"><select aria-label="Vegetable" value={vegetable} onChange={(event) => setVegetable(event.target.value)}><option value="all">All vegetables</option><option>Tomato</option><option>Cabbage</option><option>Carrot</option></select><select aria-label="Channel" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="all">All channels</option><option value="smartphone">Smartphone</option><option value="basic_phone">Basic phone</option></select></div>
      <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>Course</th><th>Enrolled</th><th>Completed</th><th>Inactive learners</th></tr></thead><tbody>{courses.map((course) => { const enrolled = farmers.filter((person) => person.enrollments.some((item) => item.courseId === course.id)); const done = enrolled.filter((person) => person.enrollments.some((item) => item.courseId === course.id && item.progress === 100)); const idle = enrolled.filter((person) => Date.now() - new Date(person.lastActiveAt).getTime() > 14 * 86400000); return <tr key={course.id}><td>{course.title}</td><td>{enrolled.length}</td><td>{done.length}</td><td>{idle.length}</td></tr>; })}</tbody></table></div>
      {farmers.length === 0 && <p className="mt-3">No farmers for this channel.</p>}
    </>}
    {tab === "assessments" && <ul className="space-y-3">{data.assessments.map((item) => <li key={item.id} className="admin-panel"><b>{item.title}</b><p className="text-sm text-muted-foreground">{item.questions} questions · {item.attempts} attempts · average {item.avgScore}% · {item.status}</p>{item.status === "draft" && <Button className="mt-2" size="sm" onClick={() => updateAdmin(actor, "publish-assessment", item.id, item.title, (state) => ({ ...state, assessments: state.assessments.map((assessment) => assessment.id === item.id ? { ...assessment, status: "published" } : assessment) }))}>Publish</Button>}</li>)}</ul>}
    {tab === "groups" && <ul className="space-y-3">{data.groups.map((group) => <li key={group.id} className="admin-panel"><b>{group.name}</b><p className="text-sm">{group.district} · {group.members} members</p><label className="mt-2 block text-sm">Facilitator<select aria-label={`Facilitator for ${group.name}`} value={group.facilitatorId} onChange={(event) => updateAdmin(actor, "reassign-group", group.id, event.target.value, (state) => ({ ...state, groups: state.groups.map((item) => item.id === group.id ? { ...item, facilitatorId: event.target.value } : item) }))}>{data.users.filter((person) => person.role === "FACILITATOR").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label></li>)}</ul>}
    {tab === "languages" && <ul className="space-y-2">{data.languages.map((language) => <li key={language.code} className="admin-panel flex items-center justify-between gap-3"><span><b>{language.name}</b><span className="ml-2 text-sm text-muted-foreground">{language.coverage}% of interface strings · {language.default ? "default" : ""}</span></span><Button size="sm" variant="outline" disabled={language.default} onClick={() => updateAdmin(actor, "default-language", language.code, language.name, (state) => ({ ...state, languages: state.languages.map((item) => ({ ...item, default: item.code === language.code })) }))}>Make default</Button></li>)}</ul>}
  </>;
}
