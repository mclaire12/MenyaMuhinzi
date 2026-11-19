import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDate, formatDateTime, PageHead, Pill } from "@/components/admin/shell";
import { UserForm } from "@/components/admin/user-form";
import { ConfirmButton, Stat } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { accountStatusLabels, allowedRoles, approveUser, locationOf, roleLabels, setUserStatus, updateUser, valuesFor } from "@/lib/admin/people";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import type { AccountStatus } from "@/lib/admin/types";
import { learnerForAccount, normalizePhone } from "@/lib/basic-phone/farmers";
import { courseStanding, enrolledCourses } from "@/lib/basic-phone/progress";
import { clock } from "@/lib/basic-phone/ussd";
import { courseLessons } from "@/lib/mock/builders";
import { useLearningState } from "@/lib/mock/store";
import { RejectDialog, statusTone } from "@/components/admin/people-ui";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  validateSearch: (search: Record<string, unknown>): { edit?: boolean } => (search["edit"] === true || search["edit"] === "true" ? { edit: true } : {}),
  component: PersonPage,
});

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

function FacilitatorRecord({ facilitatorId }: { facilitatorId: string }) {
  const learning = useLearningState();
  const groups = learning.groups.filter((group) => group.facilitatorId === facilitatorId);
  const courses = learning.courses.filter((course) => course.ownerId === facilitatorId);
  const farmers = learning.farmers.filter((farmer) => farmer.facilitatorId === facilitatorId).length;
  return <>
    <div className="admin-stats mt-3"><Stat label="Farmer groups" value={groups.length} /><Stat label="Farmers followed" value={farmers} /><Stat label="Courses created" value={courses.length} /><Stat label="Published" value={courses.filter((course) => course.status === "published").length} /></div>
    <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Courses</h2>{!courses.length ? <p className="text-sm text-muted-foreground">No courses created yet.</p> : <ul className="space-y-1 text-sm">{courses.map((course) => <li key={course.id}><Link className="font-bold" to="/admin/courses/$courseId" params={{ courseId: course.id }}>{course.title}</Link> · {course.status.replace("_", " ")} · updated {formatDate(course.updatedAt)}</li>)}</ul>}</article>
  </>;
}

const confirmCopy: Partial<Record<AccountStatus, { label: string; text: string }>> = {
  active: { label: "Activate", text: "The user can use the platform again." },
  suspended: { label: "Suspend", text: "The user is blocked until an administrator activates the account again. Learning records are kept." },
  deactivated: { label: "Deactivate", text: "The account becomes inactive and cannot be used. Learning records are kept." },
};

function PersonPage() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/users/$userId" });
  const data = useAdmin();
  const learning = useLearningState();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const person = data.users.find((item) => item.id === userId);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  if (!person) return <><Link to="/admin/users" className="text-sm font-bold text-primary">Back to people</Link><PageHead title="Person not found" text="This record does not exist or was removed when demo data was restored." /></>;
  const current = person;
  const editing = !!search.edit;
  const setEditing = (open: boolean) => navigate({ search: open ? { edit: true } : {}, replace: true });
  const basic = person.role === "BASIC_PHONE_FARMER";
  const profile = person.role.endsWith("FARMER") ? learnerForAccount(learning, person) : null;
  const facilitator = profile ? learning.facilitators.find((item) => item.id === profile.facilitatorId) : null;
  const location = locationOf(learning, person);
  const selfEmail = !!person.email && person.email.toLowerCase() === (user?.email ?? "").toLowerCase();

  function changeStatus(status: AccountStatus) {
    setUserStatus(actor, [current.id], status);
    toast.success(`${current.name} is now ${accountStatusLabels[status].toLowerCase()}.`);
  }
  function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (note.trim().length < 3) { toast.error("Write a short note."); return; }
    updateAdmin(actor, "add-note", current.id, note.trim(), (state) => ({ ...state, users: state.users.map((item) => item.id === current.id ? { ...item, notes: [{ at: new Date().toISOString(), text: note.trim() }, ...item.notes] } : item) }));
    setNote("");
    toast.success("Note added.");
  }

  return <>
    <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="size-4" aria-hidden />Back to people</Link>
    <PageHead title={person.name} text={`${roleLabels[person.role]} · registered ${formatDate(person.registeredAt)}`}>
      <Pill tone={statusTone(person.status)}>{accountStatusLabels[person.status]}</Pill>
      <Button variant="outline" onClick={() => setEditing(true)}>Edit details</Button>
      {basic && <Button asChild variant="ghost"><Link to="/phone" search={{ phone: person.phone }}>Test in phone simulator</Link></Button>}
    </PageHead>
    {person.status === "pending" && <article className="admin-panel mb-3"><h2 className="mb-2 font-bold">Account request</h2><p className="mb-3 text-sm">This {roleLabels[person.role].toLowerCase()} account is waiting for approval. It cannot be used until it is approved.</p><div className="admin-actions"><ConfirmButton variant="default" size="default" label="Approve account" title={`Approve ${person.name}?`} text="The account becomes active." onConfirm={() => { const error = approveUser(actor, current.id); if (error) toast.error(error); else toast.success(`${current.name} approved.`); }} /><Button variant="outline" onClick={() => setRejecting(true)}>Reject</Button></div></article>}
    {person.status === "rejected" && <p className="fac-note mb-3">Request rejected{person.reviewedBy ? ` by ${person.reviewedBy}` : ""} on {formatDate(person.reviewedAt)}{person.rejectionReason ? `: ${person.rejectionReason}` : "."}</p>}
    <div className="admin-grid-2">
      <article className="admin-panel"><h2 className="mb-2 font-bold">Details</h2><dl className="fac-facts">
        <div><dt>Phone</dt><dd>{person.phone}</dd></div>
        <div><dt>Email</dt><dd>{person.email || "None"}</dd></div>
        <div><dt>Location</dt><dd>{[location.village, location.cell, location.sector, location.district, location.province].filter(Boolean).join(", ") || "—"}</dd></div>
        <div><dt>Language</dt><dd>{data.languages.find((row) => row.code === person.language)?.name ?? person.language}</dd></div>
        <div><dt>Access</dt><dd>{basic ? "USSD and IVR only, no web access" : "Web app"}</dd></div>
        {facilitator && <div><dt>Facilitator</dt><dd>{facilitator.name}</dd></div>}
        {profile && <div><dt>Crops</dt><dd>{profile.cropInterest.join(", ")}</dd></div>}
        {person.qualification && <div><dt>Qualification</dt><dd>{person.qualification}</dd></div>}
        <div><dt>Last active</dt><dd>{formatDateTime(person.lastActiveAt)}</dd></div>
        {person.approvedAt && <div><dt>Approved</dt><dd>{formatDate(person.approvedAt)}{person.reviewedBy ? ` by ${person.reviewedBy}` : ""}</dd></div>}
      </dl></article>
      <article className="admin-panel"><h2 className="mb-2 font-bold">Account access</h2>
        <p className="mb-3 text-sm text-muted-foreground">{basic && person.status !== "active" ? "This farmer cannot use USSD or IVR until the account is active." : "Changing the status never deletes learning records."}</p>
        {selfEmail ? <p className="fac-note">You cannot change the status of your own account.</p> : <div className="admin-actions">
          {(["active", "suspended", "deactivated"] as const).filter((status) => status !== person.status && person.status !== "pending" && person.status !== "rejected").map((status) => { const copy = confirmCopy[status]; return copy && <ConfirmButton key={status} variant={status === "active" ? "default" : "outline"} label={copy.label} title={`${copy.label} ${person.name}?`} text={copy.text} onConfirm={() => changeStatus(status)} />; })}
          {(person.status === "pending" || person.status === "rejected") && <p className="text-sm text-muted-foreground">Status actions are available after the request is approved.</p>}
        </div>}
      </article>
    </div>
    {profile ? <LearnerRecord learnerId={profile.id} phone={person.phone} /> : person.role === "FACILITATOR" ? <FacilitatorRecord facilitatorId={person.id} /> : null}
    <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Administrative notes</h2><form className="admin-actions" onSubmit={addNote}><input aria-label="Administrative note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" /><Button type="submit">Add note</Button></form>{person.notes.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No notes.</p> : <ul className="mt-3 space-y-2 text-sm">{person.notes.map((item) => <li key={item.at}>{formatDate(item.at)} · {item.text}</li>)}</ul>}</article>
    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {person.name}</DialogTitle><DialogDescription>Farmers can switch between smartphone and basic phone. Staff can switch between facilitator and administrator.</DialogDescription></DialogHeader>
        <UserForm initial={valuesFor(learning, person)} roles={selfEmail ? [person.role] : allowedRoles(person.role)} submitLabel="Save changes" onCancel={() => setEditing(false)} onSubmit={(values) => { const error = updateUser(actor, current.id, values); if (error) return error; setEditing(false); toast.success("Details saved."); return null; }} />
      </DialogContent>
    </Dialog>
    <RejectDialog user={rejecting ? person : null} onClose={() => setRejecting(false)} />
  </>;
}
