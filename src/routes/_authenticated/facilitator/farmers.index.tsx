import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, formatDate, Loadable } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { useMockResource } from "@/lib/mock/store";
import { farmerAnalytics } from "@/lib/mock/services/analytics";
import type { AccessChannel } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/farmers/")({ component: Farmers });

const PAGE = 10;

function Farmers() {
  const { facilitator } = useFacilitator();
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<AccessChannel | "all">("all");
  const [activity, setActivity] = useState<"all" | "active" | "inactive">("all");
  const [groupId, setGroupId] = useState("all");
  const [page, setPage] = useState(0);
  const resource = useMockResource((state) => ({ rows: farmerAnalytics(state, facilitator.id), groups: state.groups.filter((group) => group.facilitatorId === facilitator.id) }));
  return <>
    <PageHead title="Farmers" text="Only farmers assigned to you are listed. Progress updates as farmers learn on the web, USSD or voice calls." />
    <Loadable resource={resource} empty={(data) => (data.rows.length ? null : "No farmers are assigned to you yet.")}>{({ rows, groups }) => {
      const text = query.toLowerCase();
      const filtered = rows.filter((row) => (channel === "all" || row.farmer.channel === channel) && (activity === "all" || (activity === "active") === row.active) && (groupId === "all" || row.groups.some((group) => group.id === groupId)) && `${row.farmer.name} ${row.farmer.phone} ${row.farmer.district} ${row.farmer.sector}`.toLowerCase().includes(text));
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
      return <>
        <div className="admin-filters">
          <input aria-label="Search farmers" placeholder="Name, phone or location" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
          <select aria-label="Access channel" value={channel} onChange={(event) => { setChannel(event.target.value as AccessChannel | "all"); setPage(0); }}><option value="all">All channels</option><option value="smartphone">Smartphone</option><option value="basic_phone">Basic phone</option></select>
          <select aria-label="Group" value={groupId} onChange={(event) => { setGroupId(event.target.value); setPage(0); }}><option value="all">All groups</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
          <select aria-label="Activity" value={activity} onChange={(event) => { setActivity(event.target.value as typeof activity); setPage(0); }}><option value="all">Active and inactive</option><option value="active">Active (14 days)</option><option value="inactive">Inactive</option></select>
        </div>
        {filtered.length === 0 ? <p className="fac-empty">No farmers match.</p> : <div className="staff-table"><table className="w-full text-sm">
          <thead><tr><th>Farmer</th><th>Phone</th><th>Location</th><th>Channel</th><th>Groups</th><th>Courses</th><th>Lessons done</th><th>Progress</th><th>Assessment</th><th>Last activity</th></tr></thead>
          <tbody>{filtered.slice(page * PAGE, page * PAGE + PAGE).map((row) => <tr key={row.farmer.id}>
            <td><Link className="font-bold" to="/facilitator/farmers/$farmerId" params={{ farmerId: row.farmer.id }}>{row.farmer.name}</Link></td>
            <td>{row.farmer.phone}</td>
            <td>{row.farmer.sector}, {row.farmer.district}</td>
            <td>{row.farmer.channel === "smartphone" ? "Smartphone" : "Basic phone"}</td>
            <td>{row.groups.map((group) => group.name).join(", ") || "—"}</td>
            <td>{row.courses.length}</td>
            <td>{row.completedLessons}</td>
            <td><span className="flex w-28 items-center gap-2"><Bar value={row.progressPct} /><small>{row.progressPct}%</small></span></td>
            <td>{row.averageScore === null ? "—" : `${row.averageScore}%`}</td>
            <td>{formatDate(row.lastActivity)}{!row.active && <small className="block text-destructive">Inactive</small>}</td>
          </tr>)}</tbody>
        </table></div>}
        {pages > 1 && <div className="admin-actions mt-3"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page + 1} of {pages}</span><Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button></div>}
      </>;
    }}</Loadable>
  </>;
}
