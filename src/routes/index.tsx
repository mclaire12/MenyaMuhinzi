import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Headphones, Phone, PlayCircle, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { CourseLoading, LearningFeedback, SectionHeading } from "@/components/learning-ui";
import { coursesQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import hero from "@/assets/farm-editorial.jpg";
import harvest from "@/assets/harvest-illustration.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "MenyaMuhinzi — Iga ubuhinzi bw'imboga mu Kinyarwanda" },
    { name: "description", content: "Amasomo magufi y'iminota 10 ku nyanya, amashu na karoti. Soma, reba cyangwa wumve mu Kinyarwanda." },
    { property: "og:title", content: "MenyaMuhinzi — Iga ubuhinzi bw'imboga" },
    { property: "og:description", content: "Amasomo y'ubuhinzi bw'inyanya, amashu na karoti mu Kinyarwanda." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Index,
});
const ways = [
  { icon: BookOpen, title: "Soma", text: "Amasomo mu Kinyarwanda cyoroshye.", number: "01" },
  { icon: PlayCircle, title: "Reba", text: "Amashusho y'amasomo azaza vuba.", number: "02" },
  { icon: Headphones, title: "Umva", text: "Umva isomo, aho uri hose.", number: "03" },
  { icon: Phone, title: "Telefoni isanzwe", text: "USSD no guhamagara bizaza vuba.", number: "04" },
];
function Index() {
  const { data: courses, isLoading, isError, refetch } = useQuery(coursesQuery);
  const { session } = useAuth();
  return <>
    <section className="home-hero">
      <img src={hero} alt="Umuhinzikazi ufite inyanya na telefoni mu murima w'imboga mu Rwanda" width={1920} height={1024} className="hero-photo" fetchPriority="high" />
      <div className="hero-shade" />
      <div className="page-width relative z-10 py-12 sm:py-16">
        <div className="hero-copy">
          <p className="eyebrow mb-5 flex items-center gap-2"><Sprout className="size-4" aria-hidden />UBUHINZI · UBUMENYI · ITERAMBERE</p>
          <h1 className="hero-title">MenyaMuhinzi<span className="mt-3 block text-primary">Iga. Hinga.<br />Usarure neza.</span></h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">Amasomo y'ubuhinzi bw'imboga mu Kinyarwanda. Ubumenyi bushya, iminota 10 ku munsi.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button asChild size="xl"><Link to={session ? "/dashboard" : "/auth"}>Tangira kwiga <ArrowRight aria-hidden /></Link></Button><Button asChild size="xl" variant="outline"><Link to="/courses">Reba amasomo</Link></Button></div>
          <div className="hero-note"><span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary"><BookOpen className="size-4" aria-hidden /></span><span>Amasomo magufi. Ubumenyi burambye.</span></div>
        </div>
      </div>
      <div className="photo-caption"><Sprout className="size-4" aria-hidden /><span>Ku bahinzi bose b'u Rwanda</span></div>
    </section>
    <section className="border-b bg-card"><div className="page-width ways-grid">{ways.map(w => <div key={w.title} className="way-item"><w.icon className="size-6 shrink-0 text-primary" aria-hidden /><div><h2 className="font-sans text-base font-bold">{w.title}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{w.text}</p></div></div>)}</div></section>
    <section className="page-width section-space"><p className="eyebrow mb-3">MURAKAZA NEZA</p><h2 className="text-3xl">Murakaza neza kuri MenyaMuhinzi</h2><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">Dufatanyije, twongera ubumenyi bw’ubuhinzi bw’imboga. Tangira isomo rya mbere cyangwa ukomereze aho wari ugeze.</p></section>
    <section className="page-width section-space"><SectionHeading eyebrow="KURA UBUMENYI BWAWE" title="Ni iki ushaka guhinga?" link />
      {isLoading ? <CourseLoading /> : isError ? <LearningFeedback error retry={() => refetch()} /> : courses?.length ? <div className="grid gap-6 md:grid-cols-3">{courses.map(c => <CourseCard key={c.id} course={c} />)}</div> : <LearningFeedback />}
    </section>
    <section className="border-y bg-card"><div className="page-width harvest-band"><div><p className="eyebrow mb-3">INTAMBWE NTO, UMUSARURO MWIZA</p><h2 className="max-w-xl text-3xl sm:text-4xl">Ubumenyi bwa none.<br />Ubuhinzi bw'ejo.</h2><p className="mt-4 max-w-md text-muted-foreground">Menya gutegura umurima, kwita ku bihingwa no kubika umusaruro wawe.</p><Button asChild variant="link" className="mt-5 px-0"><Link to="/courses">Hitamo isomo rya mbere <ArrowRight aria-hidden /></Link></Button></div><img src={harvest} alt="Inyanya, amashu na karoti" loading="lazy" width={1024} height={1024} className="harvest-art" /></div></section>
    <footer className="page-width flex flex-wrap items-center justify-between gap-4 py-8 text-xs text-muted-foreground"><span className="flex items-center gap-2 font-bold"><Sprout className="size-4 text-primary" aria-hidden />MenyaMuhinzi</span><span>Uburezi bw'ubuhinzi ku bahinzi bose b'u Rwanda</span><span>© 2026 MenyaMuhinzi</span></footer>
  </>;
}
