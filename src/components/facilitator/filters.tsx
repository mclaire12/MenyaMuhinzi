import { crops } from "@/lib/mock/crops";
import type { AnalyticsFilter } from "@/lib/mock/services/analytics";
import type { Course, CropSlug, FarmerGroup } from "@/lib/mock/types";

export function AnalyticsFilters({ value, onChange, courses, groups }: { value: AnalyticsFilter; onChange: (value: AnalyticsFilter) => void; courses: Course[]; groups: FarmerGroup[] }) {
  return <div className="admin-filters">
    <label className="flex items-center gap-1">From<input type="date" value={value.from ?? ""} onChange={(event) => onChange({ ...value, from: event.target.value || null })} /></label>
    <label className="flex items-center gap-1">To<input type="date" value={value.to ?? ""} onChange={(event) => onChange({ ...value, to: event.target.value || null })} /></label>
    <select aria-label="Crop" value={value.crop} onChange={(event) => onChange({ ...value, crop: event.target.value as CropSlug | "all", courseId: "all" })}><option value="all">All crops</option>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{crop.name_rw}</option>)}</select>
    <select aria-label="Course" value={value.courseId} onChange={(event) => onChange({ ...value, courseId: event.target.value })}><option value="all">All courses</option>{courses.filter((course) => course.status === "published" && (value.crop === "all" || course.crop === value.crop)).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
    <select aria-label="Farmer group" value={value.groupId} onChange={(event) => onChange({ ...value, groupId: event.target.value })}><option value="all">All my farmers</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
  </div>;
}
