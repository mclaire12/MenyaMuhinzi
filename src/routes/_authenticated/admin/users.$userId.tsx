import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import type { AccountStatus } from "@/lib/admin/types";
import { BasicPhoneFarmerForm } from "@/components/admin/basic-phone-form";
import { learnerForAccount, normalizePhone, updateBasicPhoneFarmer, type BasicPhoneFarmerValues } from "@/lib/basic-phone/farmers";
import { courseStanding, enrolledCourses } from "@/lib/basic-phone/progress";
import { clock } from "@/lib/basic-phone/ussd";
import { courseLessons } from "@/lib/mock/builders";
import { useLearningState } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({ component: PersonPage });

/** Read from the shared learning records, so admin, facilitator and the phone channels show the same history. */
function LearnerRecord({ learnerId, phone }: { learnerId: string; phone: string }) {
  const learning = useLearningState();
  const admin = useAdmin();
  const courses = enrolledCourses(learning, learnerId);
  const titles = new Map(learning.courses.flatMap((course) => courseLessons(course).map((lesson) => [lesson.id, lesson.title] as const)));
  const history = learning.progress.filter((item) => item.learnerId === learnerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
  const attempts = learning.attempts.filter((item) => item.learnerId === learnerId);
  const questions = learning.aiQuestions.filter((item) => item.learnerId === learnerId).slice(0, 5);
  const sessions = admin.sessions.filter((item) => normalizePhone(item.who) === normalizePhone(phone)).slice(0, 8);
  return <>
    <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Enrolled courses</h2>{courses.length === 0 ? <p className="text-sm text-muted-foreground">No course started yet. Enrolment happens when the farmer starts a lesson.</p> : <ul className="space-y-1 text-sm">{courses.map((course) => { const standing = courseStanding(learning, learnerId, course); return <li key={course.id}><b>{course.title}</b> · {standing.done}/{standing.total} lessons completed · {standing.remaining} remaining{standing.lastScore !== null ? ` · last assessment ${standing.lastScore}%` : ""}</li>; })}</ul>}</article>
    <div className="admin-grid-2 mt-3">
      <article className="admin-panel"><h2 className="mb-2 font-bold">Learning history</h2>{history.length === 0 ? <p className="text-sm text-muted-foreground">No lessons yet.</p> : <ul className="space-y-1 text-sm">{history.map((item) => <li key={item.lessonId}>{item.updatedAt.slice(0, 16).replace("T", " ")} · {titles.get(item.lessonId) ?? item.lessonId} · {item.status === "completed" ? "completed" : `in progress ${clock(item.positionSec ?? 0)}/${clock(item.durationSec ?? 0)}`} · {item.channel.toUpperCase()}</li>)}</ul>}</article>
      <article className="admin-panel"><h2 className="mb-2 font-bold">Assessment results</h2>{attempts.length === 0 ? <p className="text-sm text-muted-foreground">No assessments yet.</p> : <ul className="space-y-1 text-sm">{attempts.map((item) => <li key={item.id}>{item.at.slice(0, 10)} · {learning.courses.find((course) => course.id === item.courseId)?.title} · {item.score}%{item.missedTopics.length ? ` · review: ${item.missedTopics.join(", ")}` : ""}</li>)}</ul>}</article>
    </div>
    <div className="admin-grid-2 mt-3">
      <article className="admin-panel"><h2 className="mb-2 font-bold">Lesson questions</h2>{questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions asked.</p> : <ul className="space-y-1 text-sm">{questions.map((item) => <li key={item.id}>{item.question} · {item.channel.toUpperCase()} · {item.status}</li>)}</ul>}</article>
      <article className="admin-panel"><h2 className="mb-2 font-bold">USSD and IVR sessions (simulated)</h2>{sessions.length === 0 ? <p className="text-sm text-muted-foreground">No sessions recorded.</p> : <ul className="space-y-1 text-sm">{sessions.map((item) => <li key={item.id}>{item.at.slice(0, 16).replace("T", " ")} · {item.kind.toUpperCase()} · {item.result} · {item.detail}</li>)}</ul>}</article>
    </div>
  </>;
}

function PersonPage() {
  const { userId } = Route.useParams();
  const data = useAdmin();
  const learning = useLearningState();
  const { user } = useAuth();
  const person = data.users.find((item) => item.id === userId);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  if (!person) return <PageHead title="Person not found" text="This demo record does not exist." />;
  const current = person;
  const actor = user?.name ?? "Administrator";
  function setStatus(status: AccountStatus) {
    updateAdmin(actor, "set-status", current.id, status, (state) => ({ ...state, users: state.users.map((item) => item.id === current.id ? { ...item, status } : item) }));
    toast.success("Status updated.");
  }
  function verify() {
    updateAdmin(actor, "verify-facilitator", current.id, current.name, (state) => ({ ...state, users: state.users.map((item) => item.id === current.id ? { ...item, verified: true } : item) }));
    toast.success("Facilitator marked verified in the demo records.");
  }
  function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (note.trim().length < 3) { toast.error("Write a short note."); return; }
    updateAdmin(actor, "add-note", current.id, note.trim(), (state) => ({ ...state, users: state.users.map((item) => item.id === current.id ? { ...item, notes: [{ at: new Date().toISOString(), text: note.trim() }, ...item.notes] } : item) }));
    setNote("");
  }
  const group = data.groups.find((item) => item.id === person.groupId);
  const basic = person.role === "BASIC_PHONE_FARMER";
  const profile = person.role.endsWith("FARMER") ? learnerForAccount(learning, person) : null;
  const facilitator = profile ? learning.facilitators.find((item) => item.id === profile.facilitatorId) : null;
  function saveProfile(values: BasicPhoneFarmerValues) {
    const error = updateBasicPhoneFarmer(actor, current.id, values);
    if (error) return error;
    setEditing(false);
    toast.success("Farmer details saved.");
    return null;
  }
  return <>
    <Link to="/admin/users" className="text-sm font-bold text-primary">Back to people</Link>
    <PageHead title={person.name} text={`${person.role} · ${person.status} · registered ${person.registeredAt.slice(0, 10)}`} />
    {editing && basic && <BasicPhoneFarmerForm submitLabel="Save changes" onCancel={() => setEditing(false)} onSubmit={saveProfile} initial={{
      name: person.name, phone: person.phone, language: person.language === "en" ? "en" : "rw", status: person.status,
      province: profile?.province ?? "Northern Province", district: profile?.district ?? person.district, sector: profile?.sector ?? "", cell: profile?.cell ?? "", village: profile?.village ?? "",
      facilitatorId: profile?.facilitatorId ?? "fac1", cropInterest: profile?.cropInterest ?? ["tomato"],
    }} />}
    <div className="admin-grid-2">
      <article className="admin-panel space-y-2 text-sm"><p>Phone: {person.phone}</p><p>Email: {person.email || "None"}</p>{profile ? <p>Location: {profile.village}, {profile.cell}, {profile.sector}, {profile.district}, {profile.province}</p> : <p>District: {person.district}</p>}<p>Language: {person.language}</p><p>Channel: {basic ? "Basic phone (USSD and IVR only, no web portal)" : person.channel === "basic_phone" ? "Basic phone" : "Smartphone"}</p>{facilitator && <p>Facilitator: {facilitator.name}</p>}<p>Last active: {person.lastActiveAt.slice(0, 10)}</p>{person.qualification && <p>Qualification: {person.qualification}</p>}{group && <p>Group: {group.name}</p>}</article>
      <article className="admin-panel"><h2 className="mb-3 font-bold">Account</h2><div className="admin-actions">{person.status !== "active" && <Button onClick={() => setStatus("active")}>Activate</Button>}<Button variant="outline" onClick={() => setStatus("suspended")}>Suspend</Button><Button variant="outline" onClick={() => setStatus("deactivated")}>Deactivate</Button>{person.role === "FACILITATOR" && !person.verified && <Button onClick={verify}>Verify facilitator</Button>}{basic && <Button variant="outline" onClick={() => setEditing(true)}>Edit details</Button>}{basic && <Button asChild variant="ghost"><Link to="/phone" search={{ phone: person.phone }}>Test in phone simulator</Link></Button>}</div>{basic && person.status !== "active" && <p className="mt-3 text-sm text-muted-foreground">This farmer cannot use USSD or IVR until the account is active.</p>}</article>
    </div>
    {profile ? <LearnerRecord learnerId={profile.id} phone={person.phone} /> : <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Learning</h2>{person.enrollments.length === 0 ? <p className="text-sm text-muted-foreground">No course enrollments yet.</p> : <ul>{person.enrollments.map((item) => <li key={item.courseId}>{learning.courses.find((course) => course.id === item.courseId)?.title} · {item.progress}%</li>)}</ul>}</article>}
    <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Notes</h2><form className="admin-actions" onSubmit={addNote}><input aria-label="Administrative note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" /><Button type="submit">Add note</Button></form>{person.notes.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No notes.</p> : <ul className="mt-3 space-y-2 text-sm">{person.notes.map((item) => <li key={item.at}>{item.at.slice(0, 10)} · {item.text}</li>)}</ul>}</article>
  </>;
}
