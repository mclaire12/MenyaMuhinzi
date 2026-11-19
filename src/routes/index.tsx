import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Headphones, Phone, PlayCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { CourseLoading, LearningFeedback, SectionHeading } from "@/components/learning-ui";
import { coursesQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import hero from "@/assets/welcome-garden.webp";
import harvest from "@/assets/harvest-illustration.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "MenyaMuhinzi" },
    { name: "description", content: "Amasomo magufi y'iminota 10 ku nyanya, amashu na karoti. Soma, reba cyangwa wumve mu Kinyarwanda." },
    { property: "og:title", content: "MenyaMuhinzi" },
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
  const { user } = useAuth();
  return <>
    <section className="home-hero">
      <div className="page-width hero-inner relative z-10">
        <div className="hero-copy">
          <p className="eyebrow mb-2 flex items-center gap-2"><Logo className="size-6" />UBUHINZI · UBUMENYI · ITERAMBERE</p>
          <h1 className="hero-title">MenyaMuhinzi<span className="mt-1 block text-logo">Iga. Hinga.<br />Usarure neza.</span></h1>
          <p className="mt-3 max-w-lg text-lg leading-snug text-muted-foreground">Amasomo y'ubuhinzi bw'imboga mu Kinyarwanda. Ubumenyi bushya, iminota 10 ku munsi.</p>
          <div className="mt-4 flex flex-wrap gap-3"><Button asChild size="xl"><Link to={user ? "/dashboard" : "/auth"}>Tangira kwiga <ArrowRight aria-hidden /></Link></Button><Button asChild size="xl" variant="outline"><Link to="/courses">Reba amasomo</Link></Button></div>
          <ul className="hero-stats"><li><b>3</b><span>Imboga</span></li><li><b>10</b><span>Iminota ku somo</span></li><li><b>RW</b><span>Kinyarwanda</span></li></ul>
          <div className="hero-note"><span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary"><BookOpen className="size-4" aria-hidden /></span><span>Amasomo magufi. Ubumenyi burambye.</span></div>
        </div>
        <figure className="hero-figure">
          <img src={hero} alt="Ubusitani bw'imboga: karoti, inyanya n'ibindi bihingwa" width={1024} height={585} className="hero-photo" fetchPriority="high" />
          <figcaption className="photo-caption"><Logo className="size-6" /><span>Ku bahinzi bose b'u Rwanda</span></figcaption>
        </figure>
      </div>
    </section>
    <section className="border-b"><div className="page-width ways-grid">{ways.map(w => <div key={w.title} className="way-item"><span className="way-icon"><w.icon className="size-5" aria-hidden /></span><div><p className="text-xs font-bold text-primary">{w.number}</p><h2 className="font-sans text-lg font-bold">{w.title}</h2><p className="mt-0.5 text-sm leading-snug text-muted-foreground">{w.text}</p></div></div>)}</div></section>
    <section className="page-width home-block">
      <p className="eyebrow mb-1">MURAKAZA NEZA</p>
      <h2 className="text-4xl">Murakaza neza kuri MenyaMuhinzi</h2>
      <p className="mt-2 max-w-3xl text-lg leading-snug text-muted-foreground">Dufatanyije, twongera ubumenyi bw’ubuhinzi bw’imboga. Tangira isomo rya mbere cyangwa ukomereze aho wari ugeze.</p>
      <div className="mt-6"><SectionHeading eyebrow="KURA UBUMENYI BWAWE" title="Ni iki ushaka guhinga?" link /></div>
      {isLoading ? <CourseLoading /> : isError ? <LearningFeedback error retry={() => refetch()} /> : courses?.length ? <div className="home-courses grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map(c => <CourseCard key={c.id} course={c} />)}</div> : <LearningFeedback />}
    </section>
    <section className="border-y bg-card"><div className="page-width harvest-band"><div><p className="eyebrow mb-1">INTAMBWE NTO, UMUSARURO MWIZA</p><h2 className="max-w-xl text-4xl">Ubumenyi bwa none.<br />Ubuhinzi bw'ejo.</h2><p className="mt-2 max-w-lg text-lg leading-snug text-muted-foreground">Menya gutegura umurima, kwita ku bihingwa no kubika umusaruro wawe.</p><Button asChild variant="link" className="mt-2 px-0 text-base"><Link to="/courses">Hitamo isomo rya mbere <ArrowRight aria-hidden /></Link></Button></div><img src={harvest} alt="Inyanya, amashu na karoti" loading="lazy" width={1024} height={1024} className="harvest-art" /></div></section>
    <footer className="page-width flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted-foreground"><span className="flex items-center gap-2 font-bold"><Logo className="size-6" />Menya<span className="text-logo">Muhinzi</span></span><span>Uburezi bw'ubuhinzi ku bahinzi bose b'u Rwanda</span><span>© 2026 MenyaMuhinzi</span></footer>
  </>;
}
