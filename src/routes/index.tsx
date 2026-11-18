import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Headphones, Phone, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { coursesQuery } from "@/lib/learning";
import hero from "@/assets/hero-farmer.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MenyaMuhinzi — Iga ubuhinzi bw'imboga mu Kinyarwanda" },
      { name: "description", content: "Amasomo magufi y'iminota 10 ku nyanya, amashu na karoti. Soma, reba cyangwa wumve — kuri telefoni igezweho cyangwa isanzwe." },
      { property: "og:title", content: "MenyaMuhinzi — Iga ubuhinzi bw'imboga" },
      { property: "og:description", content: "Amasomo y'ubuhinzi bw'inyanya, amashu na karoti mu Kinyarwanda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ways = [
  { icon: BookOpen, title: "Soma", text: "Amagambo yoroshye mu Kinyarwanda." },
  { icon: PlayCircle, title: "Reba", text: "Amashusho magufi yerekana uko bikorwa." },
  { icon: Headphones, title: "Umva", text: "Umva isomo nk'uko wumva radiyo." },
  { icon: Phone, title: "Telefoni isanzwe", text: "Kanda *XXX# cyangwa uhamagare wumve isomo." },
];

function Index() {
  const { data: courses } = useQuery(coursesQuery);
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <p className="font-bold uppercase tracking-wide text-harvest">Inyanya · Amashu · Karoti</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">Iga guhinga neza, iminota 10 ku munsi.</h1>
          <p className="max-w-lg text-xl text-muted-foreground">
            MenyaMuhinzi iguha amasomo y'ubuhinzi bw'imboga yemejwe n'abahanga, mu Kinyarwanda cyoroshye.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="xl"><Link to="/auth">Tangira kwiga</Link></Button>
            <Button asChild size="xl" variant="outline"><Link to="/courses">Reba amasomo</Link></Button>
          </div>
        </div>
        <img src={hero} alt="Umuhinzikazi ufite telefoni mu murima w'inyanya n'amashu" width={1600} height={1008} className="aspect-[4/3] w-full rounded-3xl object-cover" />
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {ways.map((w) => (
            <div key={w.title} className="space-y-2">
              <w.icon className="size-8 text-primary" aria-hidden />
              <h2 className="text-xl font-semibold">{w.title}</h2>
              <p className="text-muted-foreground">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-8 text-3xl font-semibold">Amasomo ahari</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {courses?.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        MenyaMuhinzi · Uburezi bw'ubuhinzi ku bahinzi bose b'u Rwanda
      </footer>
    </>
  );
}
