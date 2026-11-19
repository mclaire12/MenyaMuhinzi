import { ArrowRight, BookOpen, RefreshCw } from "lucide-react";
import { Logo } from "@/components/logo";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CourseLoading() {
  return <div aria-label="Birimo gufunguka" role="status" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="overflow-hidden rounded-lg border bg-card"><Skeleton className="aspect-[16/10] w-full" /><div className="space-y-4 p-6"><Skeleton className="h-4 w-20" /><Skeleton className="h-7 w-4/5" /><Skeleton className="h-12 w-full" /></div></div>)}</div>;
}

export function LearningFeedback({ error, retry, title, text }: { error?: boolean; retry?: () => void; title?: string; text?: string }) {
  return <div className="feedback-state" role={error ? "alert" : "status"}>
    <span className={error ? "icon-tile" : undefined}>{error ? <RefreshCw aria-hidden /> : <Logo className="size-12" />}</span>
    <h2 className="text-2xl">{title ?? (error ? "Ntibyakunze gufunguka" : "Nta masomo arahari")}</h2>
    <p className="max-w-md text-muted-foreground">{text ?? (error ? "Ongera ugerageze mu kanya." : "Amasomo mashya azagaragara hano.")}</p>
    {retry && <Button variant="outline" onClick={retry}><RefreshCw aria-hidden />Ongera ugerageze</Button>}
  </div>;
}

export function SectionHeading({ title, eyebrow, link = false }: { title: string; eyebrow?: string; link?: boolean }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h2 className="text-3xl">{title}</h2></div>{link && <Button asChild variant="link" className="px-0"><Link to="/courses">Amasomo yose <ArrowRight aria-hidden /></Link></Button>}</div>;
}

export function LearningStat({ label, value, icon: Icon = BookOpen }: { label: string; value: number | string; icon?: typeof BookOpen }) {
  return <div className="stat-item"><div className="flex items-start justify-between gap-2"><p className="min-w-0 text-sm text-muted-foreground">{label}</p><Icon className="size-5 shrink-0 text-primary" aria-hidden /></div><p className="mt-4 font-sans text-4xl font-bold">{value}</p></div>;
}