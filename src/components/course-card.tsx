import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { allLessons, type Course } from "@/lib/learning";
import { vegetableImages } from "@/lib/vegetables";

export function CourseCard({ course, pct, enrolled }: { course: Course; pct?: number; enrolled?: boolean }) {
  const lessons = allLessons(course);
  const minutes = lessons.reduce((s, l) => s + l.duration_minutes, 0);
  const crop = course.vegetables?.slug ?? "";
  const img = vegetableImages[crop];
  return <Link to="/courses/$slug" params={{ slug: course.slug }} className="course-card group" data-crop={crop}>
    <div className="relative overflow-hidden">
      {img && <img src={img} alt={course.vegetables?.name_rw ?? ""} loading="lazy" width={944} height={704} className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
      <span className="crop-label">{course.vegetables?.name_rw ?? course.level}</span>
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground"><span>{course.level}</span>{enrolled && <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-3.5" aria-hidden />Wiyandikishije</span>}</div>
      <h3 className="mb-2 text-2xl transition-colors group-hover:text-primary">{course.title}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">{course.description}</p>
      {pct !== undefined && enrolled && <div className="mb-4 space-y-2"><div className="flex justify-between text-xs font-bold"><span>Aho ugeze</span><span className="text-primary">{pct}%</span></div><Progress value={pct} aria-label="Aho ugeze" /></div>}
      <div className="flex items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground"><div className="flex flex-wrap gap-3"><span className="flex items-center gap-1"><BookOpen className="size-3.5" aria-hidden />Amasomo {lessons.length}</span><span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden />Iminota {minutes}</span></div><span className="card-arrow"><ArrowUpRight className="size-4" aria-hidden /></span></div>
    </div>
  </Link>;
}
