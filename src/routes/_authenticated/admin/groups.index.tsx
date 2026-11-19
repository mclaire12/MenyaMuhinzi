import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDate, PageHead, Pill, RowMenu, useAdminActor } from "@/components/admin/shell";
import { TargetGroupForm } from "@/components/admin/target-group-form";
import { ConfirmDialog, CropTag } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { audienceLabels, coursesForGroup, createTargetGroup, emptyTargetGroup, groupLocation, groupStatusCopy, groupStatusLabels, groupTone, setTargetGroupStatus, updateTargetGroup } from "@/lib/admin/groups";
import { useAdmin } from "@/lib/admin/store";
import type { TargetAudience, TargetGroup, TargetGroupStatus } from "@/lib/admin/types";
import { provinces } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";
import type { CropSlug } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/admin/groups/")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean } => (search["create"] === true || search["create"] === "true" ? { create: true } : {}),
  component: GroupsPage,
});

const statusCopy = groupStatusCopy;

function GroupsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/groups/" });
  const data = useAdmin();
  const learning = useLearningState();
  const { name } = useAdminActor();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TargetGroupStatus | "current">("current");
  const [audience, setAudience] = useState<TargetAudience | "all-levels">("all-levels");
  const [crop, setCrop] = useState<CropSlug | "mixed" | "any">("any");
  const [province, setProvince] = useState("all");
  const [creating, setCreating] = useState(!!search.create);
  const [editing, setEditing] = useState<TargetGroup | null>(null);
  const [change, setChange] = useState<{ group: TargetGroup; status: TargetGroupStatus } | null>(null);
  const rows = useMemo(() => data.targetGroups.filter((group) => {
    if (status === "current" ? group.status === "archived" : group.status !== status) return false;
    if (audience !== "all-levels" && group.audience !== audience) return false;
    if (crop !== "any" && group.crop !== crop) return false;
    if (province !== "all" && group.province !== province) return false;
    const text = query.trim().toLowerCase();
    return !text || `${group.name} ${group.description} ${group.district} ${group.sector}`.toLowerCase().includes(text);
  }), [data.targetGroups, status, audience, crop, province, query]);

  function closeCreate() { setCreating(false); if (search.create) navigate({ search: {} }); }

  return <>
    <PageHead title="Groups" text="Target groups organise farmers by location, crop and level so a course can be published to the right people.">
      <Button onClick={() => setCreating(true)}><Plus aria-hidden />Create group</Button>
    </PageHead>
    <div className="admin-filters">
      <input aria-label="Search groups" placeholder="Search groups" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as TargetGroupStatus | "current")}><option value="current">Active and inactive</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
      <select aria-label="Audience" value={audience} onChange={(event) => setAudience(event.target.value as TargetAudience | "all-levels")}><option value="all-levels">Any audience</option>{(Object.keys(audienceLabels) as TargetAudience[]).map((item) => <option key={item} value={item}>{audienceLabels[item]}</option>)}</select>
      <select aria-label="Crop" value={crop} onChange={(event) => setCrop(event.target.value as CropSlug | "mixed" | "any")}><option value="any">Any crop</option><option value="tomato">Tomatoes</option><option value="cabbage">Cabbages</option><option value="carrot">Carrots</option><option value="mixed">Multiple crops</option></select>
      <select aria-label="Province" value={province} onChange={(event) => setProvince(event.target.value)}><option value="all">All provinces</option>{Object.keys(provinces).map((item) => <option key={item}>{item}</option>)}</select>
    </div>
    {!rows.length ? <p className="fac-empty">{data.targetGroups.length ? "No groups match these filters." : "No groups yet. Create one to publish courses to specific farmers."}</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Group</th><th>Audience</th><th>Location</th><th>Crop</th><th>Est. farmers</th><th>Courses</th><th>Status</th><th>Updated</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{rows.map((group) => { const courses = coursesForGroup(learning, group.id); return <tr key={group.id}>
        <td><Link className="font-bold" to="/admin/groups/$groupId" params={{ groupId: group.id }}>{group.name}</Link><small className="block text-muted-foreground">{group.description}</small></td>
        <td>{audienceLabels[group.audience]}</td>
        <td>{groupLocation(group)}</td>
        <td><CropTag crop={group.crop} /></td>
        <td>{group.estimatedFarmers.toLocaleString()}</td>
        <td>{courses.filter((course) => course.status === "published").length} published{courses.length > courses.filter((course) => course.status === "published").length ? ` · ${courses.length} assigned` : ""}</td>
        <td><Pill tone={groupTone(group.status)}>{groupStatusLabels[group.status]}</Pill></td>
        <td>{formatDate(group.updatedAt)}</td>
        <td className="col-actions"><RowMenu label={group.name}>
          <DropdownMenuItem asChild><Link to="/admin/groups/$groupId" params={{ groupId: group.id }}>View</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditing(group)}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          {group.status !== "active" && <DropdownMenuItem onSelect={() => setChange({ group, status: "active" })}>{group.status === "archived" ? "Restore" : "Activate"}</DropdownMenuItem>}
          {group.status === "active" && <DropdownMenuItem onSelect={() => setChange({ group, status: "inactive" })}>Deactivate</DropdownMenuItem>}
          {group.status !== "archived" && <DropdownMenuItem onSelect={() => setChange({ group, status: "archived" })}>Archive</DropdownMenuItem>}
        </RowMenu></td>
      </tr>; })}</tbody>
    </table></div>}
    <Dialog open={creating} onOpenChange={(open) => { if (!open) closeCreate(); else setCreating(true); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Create a group</DialogTitle><DialogDescription>Describe the farmers this group targets. You choose it later when publishing a course.</DialogDescription></DialogHeader>
        <TargetGroupForm initial={emptyTargetGroup(data.platform.defaultLanguage === "en" ? "en" : "rw")} groupId={null} submitLabel="Create group" onCancel={closeCreate} onSubmit={(values) => { const id = createTargetGroup(name, values); closeCreate(); toast.success(`${values.name.trim()} created.`); navigate({ to: "/admin/groups/$groupId", params: { groupId: id } }); }} />
      </DialogContent>
    </Dialog>
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {editing?.name}</DialogTitle><DialogDescription>Changes apply straight away to who can see the group's published courses.</DialogDescription></DialogHeader>
        {editing && <TargetGroupForm initial={editing} groupId={editing.id} submitLabel="Save changes" onCancel={() => setEditing(null)} onSubmit={(values) => { updateTargetGroup(name, editing.id, values); setEditing(null); toast.success("Group saved."); }} />}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!change} onOpenChange={(open) => { if (!open) setChange(null); }} title={change ? statusCopy[change.status].title : ""} text={change ? `${change.group.name}: ${statusCopy[change.status].text}${coursesForGroup(learning, change.group.id).some((course) => course.status === "published") && change.status !== "active" ? " Some published courses currently reach farmers through this group." : ""}` : ""} confirmLabel={change ? statusCopy[change.status].label : "Confirm"} onConfirm={() => { if (!change) return; setTargetGroupStatus(name, change.group.id, change.status); toast.success(`${change.group.name} is now ${groupStatusLabels[change.status].toLowerCase()}.`); setChange(null); }} />
  </>;
}
