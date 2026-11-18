import { Link } from "@tanstack/react-router";
import { BookOpen, Clock, Layers } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { allLessons, type Course } from "@/lib/learning";
import { vegetableImages } from "@/lib/vegetables";

export function CourseCard({ course, pct, enrolled }: { course: Course; pct?: number; enrolled?: boolean }) {
  const lessons = allLessons(course);
  const minutes = lessons.reduce((s, l) => s + l.duration_minutes, 0);
  const img = vegetableImages[course.vegetables?.slug ?? ""];
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary"
    >
      {img && <img src={img} alt={course.vegetables?.name_rw ?? ""} loading="lazy" width={944} height={704} className="aspect-[4/3] w-full object-cover" />}
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="rounded-full bg-secondary px-3 py-1 font-bold text-secondary-foreground">{course.level}</span>
          {enrolled && <span className="font-bold text-primary">Wiyandikishije</span>}
        </div>
        <h3 className="text-2xl font-semibold group-hover:text-primary">{course.title}</h3>
        <p className="text-muted-foreground">{course.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Layers className="size-4" aria-hidden /> Ibice {course.course_modules.length}</span>
          <span className="flex items-center gap-1"><BookOpen className="size-4" aria-hidden /> Amasomo {lessons.length}</span>
          <span className="flex items-center gap-1"><Clock className="size-4" aria-hidden /> Iminota {minutes}</span>
        </div>
        {pct !== undefined && enrolled && (
          <div className="space-y-1">
            <Progress value={pct} aria-label="Aho ugeze" />
            <p className="text-sm text-muted-foreground">{pct}% birangiye</p>
          </div>
        )}
      </div>
    </Link>
  );
}
