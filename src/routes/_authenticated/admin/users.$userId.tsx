import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import type { AccountStatus } from "@/lib/admin/types";
import { useLearningState } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({ component: PersonPage });

function PersonPage() {
  const { userId } = Route.useParams();
  const data = useAdmin();
  const learning = useLearningState();
  const { user } = useAuth();
  const person = data.users.find((item) => item.id === userId);
  const [note, setNote] = useState("");
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
  return <>
    <Link to="/admin/users" className="text-sm font-bold text-primary">Back to people</Link>
    <PageHead title={person.name} text={`${person.role} · ${person.status} · registered ${person.registeredAt.slice(0, 10)}`} />
    <div className="admin-grid-2">
      <article className="admin-panel space-y-2 text-sm"><p>Phone: {person.phone}</p><p>Email: {person.email || "None"}</p><p>District: {person.district}</p><p>Language: {person.language}</p><p>Channel: {person.channel === "basic_phone" ? "Basic phone" : "Smartphone"}</p><p>Last active: {person.lastActiveAt.slice(0, 10)}</p>{person.qualification && <p>Qualification: {person.qualification}</p>}{group && <p>Group: {group.name}</p>}</article>
      <article className="admin-panel"><h2 className="mb-3 font-bold">Account</h2><div className="admin-actions">{person.status !== "active" && <Button onClick={() => setStatus("active")}>Activate</Button>}<Button variant="outline" onClick={() => setStatus("suspended")}>Suspend</Button><Button variant="outline" onClick={() => setStatus("deactivated")}>Deactivate</Button>{person.role === "FACILITATOR" && !person.verified && <Button onClick={verify}>Verify facilitator</Button>}</div></article>
    </div>
    <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Learning</h2>{person.enrollments.length === 0 ? <p className="text-sm text-muted-foreground">No course enrollments yet.</p> : <ul>{person.enrollments.map((item) => <li key={item.courseId}>{learning.courses.find((course) => course.id === item.courseId)?.title} · {item.progress}%</li>)}</ul>}</article>
    <article className="admin-panel mt-3"><h2 className="mb-2 font-bold">Notes</h2><form className="admin-actions" onSubmit={addNote}><input aria-label="Administrative note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" /><Button type="submit">Add note</Button></form>{person.notes.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No notes.</p> : <ul className="mt-3 space-y-2 text-sm">{person.notes.map((item) => <li key={item.at}>{item.at.slice(0, 10)} · {item.text}</li>)}</ul>}</article>
  </>;
}
