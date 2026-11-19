import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { downloadCsv, updateAdmin, useAdmin } from "@/lib/admin/store";
import { cropOf } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: Reports });

function Reports() {
  const data = useAdmin();
  const learning = useLearningState();
  const { user } = useAuth();
  const [kind, setKind] = useState("farmers");
  const rows = kind === "courses"
    ? learning.courses.map((course) => ({ title: course.title, vegetable: cropOf(course.crop).name_en, status: course.status, lessons: course.modules.reduce((sum, module) => sum + module.lessons.length, 0) }))
    : kind === "knowledge"
      ? data.knowledge.map((source) => ({ title: source.title, status: source.status, vegetable: source.vegetable }))
      : kind === "sessions"
        ? data.sessions.map((session) => ({ kind: session.kind, result: session.result, simulated: session.simulated ? "yes" : "no", detail: session.detail }))
        : data.users.filter((person) => person.role.endsWith("FARMER")).map((person) => ({ name: person.name, phone: person.phone, district: person.district, channel: person.channel, status: person.status }));
  function exportRows() {
    downloadCsv(`menyamuhinzi-${kind}.csv`, rows);
    updateAdmin(user?.name ?? "Administrator", "export", kind, `${rows.length} rows`, (state) => state);
    toast.success("CSV downloaded. The export was added to the audit list.");
  }
  const headers = Object.keys(rows[0] ?? {});
  return <>
    <PageHead title="Reports" text="Every row comes from the demo records. Export downloads a CSV of the current report." />
    <div className="admin-filters"><select aria-label="Report" value={kind} onChange={(event) => setKind(event.target.value)}><option value="farmers">Farmers</option><option value="courses">Courses</option><option value="knowledge">Knowledge</option><option value="sessions">USSD and IVR</option></select><Button onClick={exportRows}>Download CSV</Button><Button variant="outline" onClick={() => window.print()}>Print</Button></div>
    {rows.length === 0 ? <p className="admin-panel">Nothing to report.</p> : <div className="staff-table"><table className="w-full text-sm"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{headers.map((header) => <td key={header}>{String(row[header as keyof typeof row])}</td>)}</tr>)}</tbody></table></div>}
  </>;
}
