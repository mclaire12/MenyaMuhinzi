import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import type { AccessChannel, AccountStatus, PermissionAction, PortalRole } from "@/lib/admin/types";

export const Route = createFileRoute("/_authenticated/admin/users/")({ component: People });

const actions: PermissionAction[] = ["view", "create", "update", "delete", "approve", "publish", "export", "manage"];

function People() {
  const data = useAdmin();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const [tab, setTab] = useState<"farmers" | "facilitators" | "roles">("farmers");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [district, setDistrict] = useState("all");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const rows = useMemo(() => data.users.filter((person) => {
    const farmer = person.role.endsWith("FARMER");
    if (tab === "farmers" && !farmer) return false;
    if (tab === "facilitators" && person.role !== "FACILITATOR") return false;
    if (tab === "roles") return false;
    const haystack = `${person.name} ${person.phone} ${person.email}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && person.status !== status) return false;
    if (channel !== "all" && person.channel !== channel) return false;
    if (district !== "all" && person.district !== district) return false;
    return true;
  }), [data.users, tab, query, status, channel, district]);
  const visible = rows.slice(page * 6, page * 6 + 6);
  const districts = [...new Set(data.users.map((person) => person.district))];

  function setAccountStatus(ids: string[], next: AccountStatus) {
    updateAdmin(actor, "set-status", ids.join(","), next, (state) => ({ ...state, users: state.users.map((person) => ids.includes(person.id) ? { ...person, status: next } : person) }));
    setPicked([]);
    toast.success("Account status saved in this browser.");
  }

  function addPerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const phone = String(form.get("phone")).trim();
    const email = String(form.get("email")).trim();
    const access = String(form.get("channel")) as AccessChannel;
    const role = String(form.get("role"));
    if (name.length < 3 || !/^07\d{8}$/.test(phone)) { toast.error("Enter a full name and a phone number like 07xxxxxxxx."); return; }
    const portalRole: PortalRole = role === "facilitator" ? "FACILITATOR" : access === "basic_phone" ? "BASIC_PHONE_FARMER" : "SMARTPHONE_FARMER";
    updateAdmin(actor, "create-user", phone, name, (state) => ({ ...state, users: [{ id: `u-${phone}`, name, phone, email, district: String(form.get("district")), language: "rw", channel: access, role: portalRole, status: "active", registeredAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), qualification: role === "facilitator" ? "Not reviewed" : "", verified: false, groupId: "", enrollments: [], notes: [] }, ...state.users] }));
    setAdding(false);
    toast.success("Person added to the demo records.");
  }

  return <>
    <PageHead title="People" text="Farmers do not need an email. Basic-phone farmers are the same farmer record with a different access channel." />
    <div className="admin-actions mb-4">{(["farmers", "facilitators", "roles"] as const).map((item) => <Button key={item} variant={tab === item ? "default" : "outline"} onClick={() => { setTab(item); setPage(0); }}>{item}</Button>)}<Button variant="outline" onClick={() => setAdding((value) => !value)}>Register</Button></div>
    {adding && <form className="admin-form admin-panel mb-4 max-w-xl" onSubmit={addPerson}><input name="name" placeholder="Full name" aria-label="Full name" required /><input name="phone" placeholder="07xxxxxxxx" aria-label="Phone" required /><input name="email" placeholder="Email, optional" aria-label="Email" /><input name="district" placeholder="District" aria-label="District" defaultValue="Gasabo" required /><select name="channel" aria-label="Access channel"><option value="smartphone">Smartphone</option><option value="basic_phone">Basic phone</option></select><select name="role" aria-label="Role"><option value="farmer">Farmer</option><option value="facilitator">Facilitator</option></select><Button type="submit">Save person</Button></form>}
    {tab === "roles" ? <RoleMatrix actor={actor} /> : <>
      <div className="admin-filters"><input aria-label="Search people" value={query} placeholder="Search name or phone" onChange={(event) => { setQuery(event.target.value); setPage(0); }} /><select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></select><select aria-label="Channel" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="all">All channels</option><option value="smartphone">Smartphone</option><option value="basic_phone">Basic phone</option></select><select aria-label="District" value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">All districts</option>{districts.map((item) => <option key={item}>{item}</option>)}</select></div>
      {picked.length > 0 && <div className="admin-actions mb-3"><Button onClick={() => setAccountStatus(picked, "suspended")}>Suspend selected</Button><Button variant="outline" onClick={() => setAccountStatus(picked, "active")}>Restore selected</Button></div>}
      {visible.length === 0 ? <p className="admin-panel">No people match these filters.</p> : <div className="staff-table"><table className="w-full text-sm"><thead><tr><th /><th>Name</th><th>Phone</th><th>District</th><th>Channel</th><th>Status</th></tr></thead><tbody>{visible.map((person) => <tr key={person.id}><td><input aria-label={`Select ${person.name}`} type="checkbox" checked={picked.includes(person.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, person.id] : picked.filter((id) => id !== person.id))} /></td><td><Link to="/admin/users/$userId" params={{ userId: person.id }} className="font-bold">{person.name}</Link></td><td>{person.phone}</td><td>{person.district}</td><td>{person.channel === "basic_phone" ? "Basic phone" : "Smartphone"}</td><td>{person.status}</td></tr>)}</tbody></table></div>}
      <div className="admin-actions mt-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm">{page + 1} / {Math.max(1, Math.ceil(rows.length / 6))}</span><Button variant="outline" disabled={(page + 1) * 6 >= rows.length} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
    </>}
  </>;
}

function RoleMatrix({ actor }: { actor: string }) {
  const data = useAdmin();
  return <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>Role</th>{actions.map((action) => <th key={action}>{action}</th>)}</tr></thead><tbody>
    <tr><td>ADMIN</td>{actions.map((action) => <td key={action}>yes</td>)}</tr>
    {(Object.keys(data.permissions) as (keyof typeof data.permissions)[]).map((role) => <tr key={role}><td>{role}</td>{actions.map((action) => <td key={action}><input aria-label={`${role} ${action}`} type="checkbox" checked={!!data.permissions[role][action]} onChange={() => updateAdmin(actor, "permission", role, action, (state) => ({ ...state, permissions: { ...state.permissions, [role]: { ...state.permissions[role], [action]: !state.permissions[role][action] } } }))} /></td>)}</tr>)}
  </tbody></table><p className="p-3 text-sm text-muted-foreground">The Administrator row stays full access. There is no second administrator tier.</p></div>;
}
