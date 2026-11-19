import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { emptyGroup, GroupForm } from "@/components/facilitator/group-form";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { CropTag, formatDate, Loadable } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crops } from "@/lib/mock/crops";
import { useMockResource } from "@/lib/mock/store";
import { createGroup, myGroups } from "@/lib/mock/services/groups";
import { groupMaterials } from "@/lib/mock/services/teaching";
import type { FarmerGroup } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/groups/")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean } => (search["create"] ? { create: true } : {}),
  component: Groups,
});

function Groups() {
  const { facilitator, state } = useFacilitator();
  const owners = new Map(state.facilitators.map((person) => [person.id, person.name]));
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(!!search.create);
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState<FarmerGroup["crop"] | "all">("all");
  const [district, setDistrict] = useState("all");
  const resource = useMockResource((state) => myGroups(state, facilitator.id).map((group) => ({ group, materials: groupMaterials(state, group.id).length })).sort((a, b) => b.group.createdAt.localeCompare(a.group.createdAt)));
  return <>
    <PageHead title="My Groups" text="Farmer groups you created or that were assigned to you. Add existing farmer accounts as members.">
      <Button onClick={() => setCreating(true)}><Plus aria-hidden />Create group</Button>
    </PageHead>
    <Dialog open={creating} onOpenChange={setCreating}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>New group</DialogTitle><DialogDescription>The group starts empty. You add existing farmer accounts on the next page.</DialogDescription></DialogHeader>
        <GroupForm initial={emptyGroup} submitLabel="Create group" onCancel={() => setCreating(false)} onSubmit={(values) => { const id = createGroup(facilitator.id, values); toast.success(`Group “${values.name}” created. Add members next.`); setCreating(false); navigate({ to: "/facilitator/groups/$groupId", params: { groupId: id } }); }} />
      </DialogContent>
    </Dialog>
    <Loadable resource={resource} empty={(rows) => (rows.length ? null : "You have no farmer groups yet. Create one to start adding farmers.")}>{(rows) => {
      const districts = [...new Set(rows.map((row) => row.group.district))];
      const text = query.trim().toLowerCase();
      const visible = rows.filter(({ group }) => (crop === "all" || group.crop === crop) && (district === "all" || group.district === district) && (!text || `${group.name} ${group.description ?? ""} ${group.sector} ${group.cell} ${group.village} ${group.programme}`.toLowerCase().includes(text)));
      return <>
        <div className="admin-filters">
          <input aria-label="Search groups" placeholder="Search name, description or location" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select aria-label="Crop interest" value={crop} onChange={(event) => setCrop(event.target.value as typeof crop)}><option value="all">All crop interests</option>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_rw}</option>)}<option value="mixed">Multiple crops</option></select>
          <select aria-label="District" value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">All districts</option>{districts.map((name) => <option key={name}>{name}</option>)}</select>
        </div>
        {visible.length === 0 ? <p className="fac-empty">No groups match these filters.</p> : <div className="group-cards">{visible.map(({ group, materials }) => <Link key={group.id} to="/facilitator/groups/$groupId" params={{ groupId: group.id }} className="admin-panel group-card">
          <div className="flex items-start justify-between gap-2"><h2 className="text-lg">{group.name}</h2><CropTag crop={group.crop} /></div>
          {group.description && <p className="line-clamp-2 text-sm">{group.description}</p>}
          <p className="text-sm text-muted-foreground">{group.village}, {group.cell}, {group.sector}, {group.district}</p>
          <dl className="group-facts">
            <div><dt>Members</dt><dd>{group.memberIds.length}</dd></div>
            <div><dt>Published materials</dt><dd>{materials}</dd></div>
            <div><dt>Created</dt><dd>{formatDate(group.createdAt)}</dd></div>
          </dl>
          {group.facilitatorId !== facilitator.id && <small className="text-muted-foreground">Assigned to you by {owners.get(group.facilitatorId) ?? "another facilitator"}</small>}
        </Link>)}</div>}
      </>;
    }}</Loadable>
  </>;
}
