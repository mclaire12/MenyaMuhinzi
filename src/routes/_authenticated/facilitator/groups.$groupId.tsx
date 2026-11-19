import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cropInterestLabel, GroupForm, groupValues } from "@/components/facilitator/group-form";
import { FarmerType, LearnerStatusPill } from "@/components/facilitator/progress-ui";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, ConfirmButton, CropTag, Empty, formatDate, formatDateTime, Panel, Stat } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { groupProgress } from "@/lib/mock/services/group-progress";
import { addMembers, eligibleFarmers, managedGroup, removeMember, updateGroup } from "@/lib/mock/services/groups";
import { materialGroupIds } from "@/lib/mock/services/teaching";
import type { FarmerGroup } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/groups/$groupId")({ component: GroupPage });

function GroupPage() {
  const { groupId } = Route.useParams();
  const { facilitator, state } = useFacilitator();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const group = managedGroup(state, facilitator.id, groupId);
  if (!group) return <PageHead title="Group not available" text="This group does not exist, or it belongs to another facilitator and was not assigned to you."><Button asChild variant="outline"><Link to="/facilitator/groups">Back to My Groups</Link></Button></PageHead>;
  const current = group;
  const progress = groupProgress(state, group);
  const owner = state.facilitators.find((person) => person.id === group.facilitatorId);
  const publishedAt = (materialId: string) => state.materials.find((item) => item.id === materialId)?.publications.filter((item) => item.groupIds.includes(current.id)).map((item) => item.at).sort().at(-1);

  return <>
    <Link to="/facilitator/groups" className="text-sm font-bold text-primary">Back to My Groups</Link>
    <PageHead title={group.name} text={`${group.village}, ${group.cell}, ${group.sector}, ${group.district} · ${group.province}`}>
      <CropTag crop={group.crop} />
      <Button size="sm" onClick={() => setAdding(true)}><UserPlus aria-hidden />Add members</Button>
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit group</Button>
    </PageHead>
    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit group</DialogTitle><DialogDescription>Changes apply only to this group. Farmer accounts are not changed.</DialogDescription></DialogHeader>
        <GroupForm initial={groupValues(group)} submitLabel="Save group" onCancel={() => setEditing(false)} onSubmit={(values) => { updateGroup(current.id, facilitator.id, values); toast.success("Group updated."); setEditing(false); }} />
      </DialogContent>
    </Dialog>
    <div className="admin-stats">
      <Stat label="Members" value={progress.members} />
      <Stat label="Active learners" value={progress.active} hint={`${progress.notStarted} not started`} />
      <Stat label="Lesson completion" value={`${progress.lessonCompletion}%`} />
      <Stat label="Published materials" value={progress.materials.length} />
    </div>
    <div className="fac-grid">
      <Panel title={`Members (${progress.members})`} action={<Button size="sm" variant="outline" onClick={() => setAdding(true)}>Add</Button>}>
        {progress.rows.length === 0 ? <Empty text="No members yet. Add existing smartphone or basic-phone farmers." /> : <ul className="fac-list">{progress.rows.map((row) => <li key={row.farmer.id}>
          <span className="min-w-0"><Link to="/facilitator/progress/$farmerId" params={{ farmerId: row.farmer.id }} className="font-bold">{row.farmer.name}</Link><small className="block text-muted-foreground">{row.farmer.phone} · <FarmerType channel={row.farmer.channel} /> · {row.progressPct}% progress</small></span>
          <span className="flex items-center gap-2"><LearnerStatusPill status={row.status} /><ConfirmButton label="Remove" title={`Remove ${row.farmer.name} from ${current.name}?`} text="The farmer account and their learning progress are kept. Materials published to this group will no longer appear for them." onConfirm={() => { removeMember(current.id, facilitator.id, row.farmer.id); toast.success(`${row.farmer.name} removed from the group.`); }} variant="ghost" /></span>
        </li>)}</ul>}
      </Panel>
      <Panel title="Group overview">
        <dl className="fac-facts">
          <div><dt>Description</dt><dd>{group.description || "—"}</dd></div>
          <div><dt>Location</dt><dd>{group.village}, {group.cell}, {group.sector}, {group.district}, {group.province}</dd></div>
          <div><dt>Crop interest</dt><dd>{cropInterestLabel(group.crop)}</dd></div>
          <div><dt>Contact person</dt><dd>{group.contactPerson || "—"}</dd></div>
          <div><dt>Notes</dt><dd>{group.notes || "—"}</dd></div>
          <div><dt>Created</dt><dd>{formatDate(group.createdAt)}{owner && owner.id !== facilitator.id ? ` by ${owner.name} · assigned to you` : ""}</dd></div>
        </dl>
      </Panel>
      <Panel title="Published teaching materials" action={<Button asChild size="sm" variant="outline"><Link to="/facilitator/teaching">Publish a material</Link></Button>}>
        {progress.materials.length === 0 ? <Empty text="No teaching materials published to this group yet." /> : <ul className="fac-list">{progress.materials.map((material) => <li key={material.id}><span><Link to="/facilitator/teaching/$materialId" params={{ materialId: material.id }} className="font-bold">{material.title}</Link><small className="block text-muted-foreground">Published {formatDate(publishedAt(material.id))} · {materialGroupIds(material).length} group(s)</small></span><CropTag crop={material.input.crop} /></li>)}</ul>}
      </Panel>
      <Panel title="Group learning progress" action={<Button asChild size="sm" variant="ghost"><Link to="/facilitator/progress" search={{ group: group.id }}>Open full progress</Link></Button>}>
        <p className="mb-2 text-sm">{progress.enrolled} of {progress.members} members enrolled · {progress.completedLessons} lessons completed · {progress.courseCompletion}% course completion</p>
        {progress.courses.length === 0 ? <Empty text="Members have not enrolled in a course yet." /> : <ul className="fac-list">{progress.courses.map((row) => <li key={row.course.id}><span><b>{row.course.title}</b><small className="block text-muted-foreground">{row.enrolled} enrolled · {row.completed} completed</small></span><span className="flex w-36 items-center gap-2"><Bar value={row.averagePct} /><small>{row.averagePct}%</small></span></li>)}</ul>}
      </Panel>
      <Panel title="Recent activity">
        {group.activity.length === 0 ? <Empty text="No activity yet." /> : <ul className="fac-list">{group.activity.slice(0, 8).map((item, index) => <li key={index}><span>{item.text}</span><small>{formatDateTime(item.at)}</small></li>)}</ul>}
      </Panel>
    </div>
    <AddMembers open={adding} onOpenChange={setAdding} group={group} />
  </>;
}

function AddMembers({ open, onOpenChange, group }: { open: boolean; onOpenChange: (open: boolean) => void; group: FarmerGroup }) {
  const { facilitator, state } = useFacilitator();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const text = query.trim().toLowerCase();
  const candidates = eligibleFarmers(state, facilitator.id)
    .filter((farmer) => !group.memberIds.includes(farmer.id))
    .filter((farmer) => !text || `${farmer.name} ${farmer.phone} ${farmer.sector} ${farmer.district} ${farmer.channel === "basic_phone" ? "basic" : "smartphone"}`.toLowerCase().includes(text));
  function close(next: boolean) { onOpenChange(next); if (!next) { setQuery(""); setSelected([]); } }
  function add() {
    addMembers(group.id, facilitator.id, selected);
    toast.success(`${selected.length} farmer${selected.length === 1 ? "" : "s"} added to ${group.name}.`);
    close(false);
  }
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add members to {group.name}</DialogTitle><DialogDescription>Choose existing farmer accounts. No new accounts are created; basic-phone farmers keep learning by USSD and voice calls.</DialogDescription></DialogHeader>
      <input className="fac-search" aria-label="Search farmers" placeholder="Search name, phone or sector" value={query} onChange={(event) => setQuery(event.target.value)} />
      {candidates.length === 0 ? <Empty text={text ? "No farmers match this search." : "Every farmer you can add is already in this group."} /> : <ul className="fac-pick">{candidates.map((farmer) => <li key={farmer.id}><label>
        <input type="checkbox" checked={selected.includes(farmer.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, farmer.id] : current.filter((id) => id !== farmer.id))} />
        <span><b>{farmer.name}</b><small className="block text-muted-foreground">{farmer.phone} · <FarmerType channel={farmer.channel} /> · {farmer.sector}, {farmer.district}</small></span>
      </label></li>)}</ul>}
      <DialogFooter><Button variant="outline" onClick={() => close(false)}>Cancel</Button><Button disabled={!selected.length} onClick={add}>Add {selected.length || ""} selected</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
