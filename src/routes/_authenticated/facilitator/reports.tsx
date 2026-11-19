import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnalyticsFilters } from "@/components/facilitator/filters";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { formatDate, Loadable } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/admin/store";
import { cropOf } from "@/lib/mock/crops";
import { useMockResource } from "@/lib/mock/store";
import { courseAnalytics, farmerAnalytics, groupAnalytics, noFilter, type AnalyticsFilter } from "@/lib/mock/services/analytics";
import { managedCourses } from "@/lib/mock/services/courses";
import { myGroups } from "@/lib/mock/services/groups";
import type { LearningState } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/reports")({ component: Reports });

const reports = { courses: "Course performance", farmers: "Farmer learning progress", groups: "Group performance", lessons: "Lesson completion", assessments: "Assessment results", reviews: "Content review activity" } as const;
type ReportKind = keyof typeof reports;
type Row = Record<string, string | number>;

const within = (iso: string, filter: AnalyticsFilter) => (!filter.from || iso.slice(0, 10) >= filter.from) && (!filter.to || iso.slice(0, 10) <= filter.to);

function buildRows(state: LearningState, facilitatorId: string, kind: ReportKind, filter: AnalyticsFilter): Row[] {
  if (kind === "courses") return courseAnalytics(state, facilitatorId, filter).map((row) => ({ Course: row.course.title, Crop: cropOf(row.course.crop).name_en, Enrolled: row.enrolled, "Lesson completions": row.lessonCompletions, "Completion %": row.completionRate, "Average score %": row.averageScore ?? "" }));
  if (kind === "farmers") return farmerAnalytics(state, facilitatorId, filter).map((row) => ({ Farmer: row.farmer.name, Phone: row.farmer.phone, District: row.farmer.district, Channel: row.farmer.channel === "smartphone" ? "Smartphone" : "Basic phone", Courses: row.courses.length, "Lessons completed": row.completedLessons, "Progress %": row.progressPct, "Average score %": row.averageScore ?? "", "Last activity": formatDate(row.lastActivity) }));
  if (kind === "groups") return groupAnalytics(state, facilitatorId, filter).map((row) => ({ Group: row.group.name, District: row.group.district, Members: row.members, Courses: row.courses, "Participation %": row.participation, "Completion %": row.completionRate, "Average progress %": row.averageProgress }));
  if (kind === "lessons") return courseAnalytics(state, facilitatorId, filter).flatMap((row) => row.lessons.map((lesson) => ({ Course: row.course.title, Lesson: lesson.title, Completions: lesson.completions })));
  if (kind === "assessments") {
    const learners = new Set(farmerAnalytics(state, facilitatorId, filter).map((row) => row.farmer.id));
    return state.attempts.filter((item) => learners.has(item.learnerId) && within(item.at, filter) && (filter.courseId === "all" || item.courseId === filter.courseId) && (filter.crop === "all" || state.courses.find((course) => course.id === item.courseId)?.crop === filter.crop))
      .map((item) => ({ Farmer: state.farmers.find((farmer) => farmer.id === item.learnerId)?.name ?? item.learnerId, Course: state.courses.find((course) => course.id === item.courseId)?.title ?? item.courseId, "Score %": item.score, "Missed topics": item.missedTopics.join("; "), Date: formatDate(item.at) }));
  }
  const mine = new Map(managedCourses(state, facilitatorId).filter((course) => filter.crop === "all" || course.crop === filter.crop).map((course) => [course.id, course.title]));
  return state.reviews.filter((item) => mine.has(item.courseId) && within(item.at, filter)).map((item) => ({ Course: mine.get(item.courseId)!, Action: item.action, By: item.authorName, Revision: item.revision, Comment: item.comment, Date: formatDate(item.at) }));
}

function Reports() {
  const { facilitator, state } = useFacilitator();
  const [kind, setKind] = useState<ReportKind>("courses");
  const [filter, setFilter] = useState<AnalyticsFilter>(noFilter);
  const resource = useMockResource((current) => buildRows(current, facilitator.id, kind, filter));
  return <>
    <PageHead title="Reports" text="Preview a report, then download it as CSV or print it to PDF from your browser." />
    <div className="admin-filters no-print"><select aria-label="Report" value={kind} onChange={(event) => setKind(event.target.value as ReportKind)}>{(Object.keys(reports) as ReportKind[]).map((key) => <option key={key} value={key}>{reports[key]}</option>)}</select></div>
    <div className="no-print"><AnalyticsFilters value={filter} onChange={setFilter} courses={state.courses} groups={myGroups(state, facilitator.id)} /></div>
    <Loadable resource={resource}>{(rows) => {
      const headers = Object.keys(rows[0] ?? {});
      return <>
        <div className="admin-actions no-print mb-3"><Button disabled={!rows.length} onClick={() => { downloadCsv(`menyamuhinzi-${kind}.csv`, rows); toast.success("CSV downloaded."); }}><Download aria-hidden />Download CSV</Button><Button variant="outline" disabled={!rows.length} onClick={() => window.print()}><Printer aria-hidden />Print / save as PDF</Button></div>
        <section className="admin-panel print-area">
          <h2 className="text-lg">{reports[kind]}</h2>
          <p className="mb-3 text-xs text-muted-foreground">{facilitator.name} · generated {new Date().toLocaleString("en-GB")} · {rows.length} row(s){filter.from || filter.to ? ` · ${filter.from ?? "start"} to ${filter.to ?? "today"}` : ""}</p>
          {rows.length === 0 ? <p className="fac-empty">No rows for these filters.</p> : <div className="staff-table"><table className="w-full text-sm"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div>}
        </section>
      </>;
    }}</Loadable>
  </>;
}
