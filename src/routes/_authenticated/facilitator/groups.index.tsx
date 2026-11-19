import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { emptyGroup, GroupForm } from "@/components/facilitator/group-form";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, CropTag, Loadable } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { useMockResource } from "@/lib/mock/store";
import { groupAnalytics } from "@/lib/mock/services/analytics";
import { createGroup } from "@/lib/mock/services/groups";

export const Route = createFileRoute("/_authenticated/facilitator/groups/")({ component: Groups });

function Groups() {
  const { facilitator } = useFacilitator();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("all");
  const resource = useMockResource((state) => groupAnalytics(state, facilitator.id));
  return <>
    <PageHead title="Farmer groups" text="Groups you facilitate. Group by location, crop interest or training programme.">
      {!creating && <Button onClick={() => setCreating(true)}><Plus aria-hidden />Create group</Button>}
    </PageHead>
    {creating && <section className="admin-panel mb-3"><h2 className="mb-2 text-lg">New group</h2><GroupForm initial={emptyGroup} submitLabel="Create group" onCancel={() => setCreating(false)} onSubmit={(values) => { const id = createGroup(facilitator.id, values); toast.success("Group created."); setCreating(false); navigate({ to: "/facilitator/groups/$groupId", params: { groupId: id } }); }} /></section>}
    <Loadable resource={resource} empty={(rows) => (rows.length ? null : "You have no farmer groups yet.")}>{(rows) => {
      const districts = [...new Set(rows.map((row) => row.group.district))];
      const visible = rows.filter((row) => (district === "all" || row.group.district === district) && `${row.group.name} ${row.group.programme} ${row.group.sector}`.toLowerCase().includes(query.toLowerCase()));
      return <>
        <div className="admin-filters"><input aria-label="Search groups" placeholder="Search name, programme or sector" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="District" value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">All districts</option>{districts.map((name) => <option key={name}>{name}</option>)}</select></div>
        {visible.length === 0 ? <p className="fac-empty">No groups match.</p> : <div className="group-cards">{visible.map((row) => <Link key={row.group.id} to="/facilitator/groups/$groupId" params={{ groupId: row.group.id }} className="admin-panel group-card">
          <div className="flex items-start justify-between gap-2"><h2 className="text-lg">{row.group.name}</h2><CropTag crop={row.group.crop} /></div>
          <p className="text-sm text-muted-foreground">{row.group.village}, {row.group.cell}, {row.group.sector}, {row.group.district} · {row.group.province}</p>
          {row.group.programme && <p className="text-sm">Programme: {row.group.programme}</p>}
          <p className="mt-2 text-sm">{row.members} members · {row.courses} assigned course(s) · {row.participation}% participating</p>
          <span className="mt-2 flex items-center gap-2 text-sm"><Bar value={row.averageProgress} />{row.averageProgress}% average progress</span>
        </Link>)}</div>}
      </>;
    }}</Loadable>
  </>;
}
