import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead } from "@/components/admin/shell";
import { cropOf, statusLabels } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";
import { courseLearnerIds } from "@/lib/mock/services/courses";
import type { CourseStatus } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/admin/courses/")({ component: Courses });

function Courses() {
  const state = useLearningState();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const rows = state.courses.filter((course) => (status === "all" || course.status === status) && course.title.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHead title="Courses" text="The catalogue stays on tomatoes, cabbages, and carrots. Facilitators submit courses; publishing is only offered after expert approval." />
    <div className="admin-filters"><input aria-label="Search courses" value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} /><select aria-label="Course status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{(Object.keys(statusLabels) as CourseStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></div>
    {rows.length === 0 ? <p className="admin-panel">No courses match.</p> : <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>Course</th><th>Vegetable</th><th>Facilitator</th><th>Lessons</th><th>Status</th><th>Learners</th></tr></thead><tbody>{rows.map((course) => <tr key={course.id}><td><Link className="font-bold" to="/admin/courses/$courseId" params={{ courseId: course.id }}>{course.title}</Link></td><td>{cropOf(course.crop).name_en}</td><td>{state.facilitators.find((person) => person.id === course.ownerId)?.name}</td><td>{course.modules.reduce((sum, module) => sum + module.lessons.length, 0)}</td><td>{statusLabels[course.status]}</td><td>{courseLearnerIds(state, course.id).length}</td></tr>)}</tbody></table></div>}
  </>;
}
