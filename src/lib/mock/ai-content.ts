import type { CropSlug, GeneratedLesson } from "@/lib/mock/types";

export type CropFacts = {
  name: string;
  spacing: string;
  start: string;
  pest: string;
  disease: string;
  harvestSign: string;
  harvestDays: string;
  storage: string;
  special: string;
  water: string;
};

export const cropFacts: Record<CropSlug, CropFacts> = {
  tomato: {
    name: "inyanya",
    spacing: "cm 60 hagati y'imirongo na cm 45 hagati y'ingemwe",
    start: "Ingemwe z'inyanya zitegurirwa mu buhumbikiro iminsi 21 kugeza kuri 28 mbere yo kwimurwa",
    pest: "isazi z'umweru n'inyo zirya imbuto",
    disease: "kuma kw'amababi (late blight)",
    harvestSign: "imbuto zitangiye gutukura ku ruhande rumwe",
    harvestDays: "iminsi 70 kugeza kuri 90 nyuma yo kwimura ingemwe",
    storage: "ahantu hakonje, mu dusanduku dufite umwuka, inyanya zidashyirwa hejuru y'izindi cyane",
    special: "Shyiraho ibiti byo gushingirizaho inyanya kugira ngo imbuto zidakora ku butaka",
    water: "Uhira ku butaka hafi y'umuzi, wirinde gutosa amababi",
  },
  cabbage: {
    name: "amashu",
    spacing: "cm 60 hagati y'imirongo na cm 45 hagati y'ingemwe",
    start: "Ingemwe z'amashu zimara ibyumweru 4 kugeza kuri 6 mu buhumbikiro",
    pest: "inyo z'amashu (diamondback moth) na aphids",
    disease: "kubora kw'umukara (black rot)",
    harvestSign: "umutwe ukomeye kandi wuzuye iyo uwukanze",
    harvestDays: "iminsi 90 kugeza kuri 120 nyuma yo kwimura ingemwe",
    storage: "ahantu hakonje kandi hafite umwuka, amashu ashyizwe ku mbaho",
    special: "Ongera ifumbire ya azote nyuma y'ibyumweru 3 wimuye ingemwe",
    water: "Amashu akenera amazi ahoraho; uhira kabiri mu cyumweru mu gihe cy'izuba",
  },
  carrot: {
    name: "karoti",
    spacing: "cm 20 kugeza kuri 30 hagati y'imirongo na cm 5 hagati ya karoti",
    start: "Karoti zibibwa mu murima ako kanya; ntizitegurirwa ingemwe",
    pest: "inyo zo mu butaka (nematodes)",
    disease: "kubora kw'imizi",
    harvestSign: "umutwe wa karoti ugeze kuri cm 2 kugeza kuri 3 z'umubyimba",
    harvestDays: "iminsi 70 kugeza kuri 100 nyuma yo kubiba",
    storage: "mu mucanga utose ahantu hakonje, amababi yakuweho",
    special: "Koresha ubutaka bworoshye butagira amabuye kugira ngo karoti zikure zigororotse",
    water: "Uhira buhoro kandi kenshi kugeza karoti zimeze neza",
  },
};

const farmers = ["Mukamana wo mu Murenge wa Muhoza", "Nshimiyimana wo i Kimironko", "Uwimana wo mu Murenge wa Tumba", "Habyarimana wo i Gisenyi"];

type LessonTemplate = (crop: CropFacts, farmer: string) => Omit<GeneratedLesson, "narration" | "ussdText" | "durationMinutes">;

const lesson = (title: string, summary: string, body: string, example: string, keyPoints: string[], illustration: string, question: GeneratedLesson["questions"][number], objectives: string[]) =>
  ({ title, summary, body, example, keyPoints, illustration, questions: [question], objectives });

export const moduleBank: { title: string; description: string; lessons: LessonTemplate[] }[] = [
  {
    title: "Gutegura umurima n'ubutaka",
    description: "Guhitamo aho guhinga no gutegura ubutaka mbere yo gutera.",
    lessons: [
      (c, f) => lesson("Guhitamo aho guhinga", `Aho ${c.name} zera neza.`, `Hitamo umurima ubona izuba nibura amasaha atandatu ku munsi. Ubutaka bugomba kuba bworoshye kandi butareka amazi. Irinde guhinga ${c.name} aho wahinze ibihingwa byo mu muryango umwe mu gihembwe gishize.`, `${f} yimuriye ${c.name} ku musozi ubona izuba, umusaruro wiyongera.`, ["Izuba amasaha 6 ku munsi", "Ubutaka butareka amazi", "Simburanya ibihingwa"], `Ifoto y'umurima ubona izuba ufite imirongo isukuye ya ${c.name}`, { question: `Ni amasaha angahe y'izuba ${c.name} zikenera ku munsi?`, options: ["Amasaha 2", "Amasaha 6", "Nta zuba zikenera"], answer: 1, topic: "Guhitamo aho guhinga" }, ["Kumenya umurima ukwiye", "Gusimburanya ibihingwa"]),
      (c, f) => lesson("Gupima no gutunganya ubutaka", "Uko wategura ubutaka.", `Hinga ubutaka neza ku bujyakuzimu bwa cm 30, ukureho ibyatsi n'amabuye. ${c.special}. Niba bishoboka, saba umujyanama w'ubuhinzi gupima ubusharire bw'ubutaka.`, `${f} yakuyemo amabuye mbere yo gutera, ibihingwa bikura neza.`, ["Hinga cm 30", "Kuraho ibyatsi n'amabuye", "Pima ubutaka"], "Igishushanyo cy'ubujyakuzimu bwa cm 30 mu butaka", { question: "Ubutaka bugomba guhingwa ku bujyakuzimu bungana iki?", options: ["cm 5", "cm 30", "Metero 1"], answer: 1, topic: "Gutunganya ubutaka" }, ["Gutunganya ubutaka", "Kumenya ubujyakuzimu bukwiye"]),
      (c, f) => lesson("Ifumbire y'imborera", "Uko ifumbire yongera umusaruro.", `Shyiramo ifumbire y'imborera yaboze neza ibyumweru bibiri mbere yo gutera ${c.name}. Ifumbire itaraboze ishobora gutwika imizi. Kuvanga ifumbire n'ubutaka bituma amazi agumamo.`, `${f} yakoresheje toni 2 z'imborera kuri are 10, umusaruro wikuba kabiri.`, ["Imborera yaboze neza", "Shyiramo ibyumweru 2 mbere", "Vanga n'ubutaka"], "Ifoto y'ikirundo cy'ifumbire y'imborera yaboze", { question: "Ifumbire y'imborera ishyirwamo ryari?", options: ["Umunsi wo gutera", "Ibyumweru 2 mbere yo gutera", "Nyuma yo gusarura"], answer: 1, topic: "Ifumbire" }, ["Gukoresha ifumbire y'imborera"]),
    ],
  },
  {
    title: "Imbuto n'ingemwe",
    description: "Guhitamo imbuto nziza no gutegura ingemwe zikomeye.",
    lessons: [
      (c, f) => lesson("Guhitamo imbuto nziza", "Imbuto zemewe zitanga umusaruro.", `Gura imbuto zemewe ku bacuruzi bazwi. Reba itariki imbuto zizarangiriraho kandi uhitemo ubwoko bukwiye akarere kawe. Imbuto mbi zitera indwara n'umusaruro muke wa ${c.name}.`, `${f} yaguze imbuto zemewe ku ishami rya RAB, ingemwe zimera neza.`, ["Imbuto zemewe", "Reba itariki", "Ubwoko bukwiye akarere"], "Ifoto y'agapaki k'imbuto kagaragaza itariki", { question: "Ni iki ugomba kureba ku gapaki k'imbuto?", options: ["Ibara gusa", "Itariki izarangiriraho", "Igiciro gusa"], answer: 1, topic: "Imbuto" }, ["Guhitamo imbuto zemewe"]),
      (c, f) => lesson("Gutegura ingemwe cyangwa kubiba", "Intangiriro nziza y'igihingwa.", `${c.start}. Koresha ubutaka busukuye kandi uhire buhoro. Rinda ingemwe izuba ryinshi n'imvura nyinshi ukoresheje igisenge cyoroheje.`, `${f} yubakiye ingemwe igisenge cy'ibyatsi, ntizangiritse n'imvura.`, ["Ubutaka busukuye", "Uhire buhoro", "Rinda izuba ryinshi"], "Igishushanyo cy'ubuhumbikiro bufite igisenge", { question: "Kuki ingemwe zirindwa izuba ryinshi?", options: ["Kugira ngo zitumagara", "Kugira ngo zikure vuba cyane", "Nta mpamvu"], answer: 0, topic: "Ingemwe" }, ["Gutegura ingemwe zikomeye"]),
      (c, f) => lesson("Kwimura ingemwe", "Kwimura nta guhungabanya imizi.", `Imura ingemwe zifite amababi 4 kugeza kuri 6 mu gitondo cyangwa nimugoroba. Uhire ingemwe mbere yo kuzikura kugira ngo imizi idacika. Tera ku ntera ya ${c.spacing}.`, `${f} yimuye ingemwe nimugoroba, nyinshi zifata neza.`, ["Amababi 4 kugeza 6", "Imura hakonje", `Intera: ${c.spacing}`], "Ifoto y'umuhinzi wimura ingemwe afite ubutaka ku mizi", { question: "Ni ryari byiza kwimura ingemwe?", options: ["Saa sita z'amanywa", "Mu gitondo cyangwa nimugoroba", "Nijoro mu mvura nyinshi"], answer: 1, topic: "Kwimura ingemwe" }, ["Kwimura ingemwe neza"]),
    ],
  },
  {
    title: "Gutera no kwita ku bihingwa",
    description: "Intera ikwiye, kuhira no kubagara.",
    lessons: [
      (c, f) => lesson("Intera ikwiye yo gutera", "Intera ituma ibihingwa bihumeka.", `Tera ${c.name} ku ntera ya ${c.spacing}. Intera nziza ituma ibihingwa bibona umwuka n'izuba, bikagabanya indwara. Koresha umugozi kugira ngo imirongo igororoke.`, `${f} yakoresheje umugozi, abona umwanya wo kubagara byoroshye.`, ["Kurikiza intera", "Imirongo igororotse", "Umwuka n'izuba"], `Igishushanyo cy'intera hagati y'imirongo ya ${c.name}`, { question: `Intera ikwiye ifasha ${c.name} gute?`, options: ["Kubona umwuka n'izuba", "Kunywa amazi menshi", "Nta cyo ifasha"], answer: 0, topic: "Intera yo gutera" }, ["Gutera ku ntera ikwiye"]),
      (c, f) => lesson("Kuhira neza", "Amazi akwiye mu gihe gikwiye.", `${c.water}. Uhira mu gitondo cyangwa nimugoroba kugira ngo amazi adatakara. Gusasira ibyatsi byumye bigumana ubuhehere mu butaka.`, `${f} yasasiye ibyatsi byumye, akoresha amazi make mu gihe cy'izuba.`, ["Uhira hakonje", "Uhira ku muzi", "Sasira ubutaka"], "Ifoto y'umuhinzi wuhira hafi y'umuzi", { question: "Kuhira byiza bikorwa ryari?", options: ["Mu gitondo cyangwa nimugoroba", "Saa sita", "Rimwe mu kwezi"], answer: 0, topic: "Kuhira" }, ["Kuhira neza no kubika ubuhehere"]),
      (c, f) => lesson("Kubagara no gusasira", "Kurinda ibyatsi bibi.", `Bagara buri byumweru bibiri kugira ngo ibyatsi bibi bidatwara amazi n'ifumbire bya ${c.name}. Bagara witonze kugira ngo udakomeretsa imizi. Nyuma yo kubagara, sasira.`, `${f} yabagaye buri byumweru bibiri, ${c.name} ze zikura vuba.`, ["Bagara buri byumweru 2", "Irinde gukomeretsa imizi", "Sasira nyuma"], "Igishushanyo cy'umurima usukuye wasasiwe", { question: "Ni kangahe ugomba kubagara?", options: ["Buri byumweru 2", "Rimwe mu gihembwe", "Ntibikenewe"], answer: 0, topic: "Kubagara" }, ["Kubagara neza"]),
    ],
  },
  {
    title: "Kurwanya udukoko n'indwara",
    description: "Kumenya ibimenyetso hakiri kare no gufata ingamba zizewe.",
    lessons: [
      (c, f) => lesson("Kumenya udukoko", "Udukoko dukunze kwibasira igihingwa.", `Udukoko dukunze kwibasira ${c.name} ni ${c.pest}. Genzura munsi y'amababi buri cyumweru. Iyo ubonye udukoko twinshi, menyesha umujyanama w'ubuhinzi.`, `${f} yabonye udukoko hakiri kare, akiza umurima we.`, ["Genzura buri cyumweru", "Reba munsi y'amababi", "Menyesha umujyanama"], `Amafoto y'udukoko: ${c.pest}`, { question: "Ni hehe ukwiye kureba udukoko ku kibabi?", options: ["Hejuru gusa", "Munsi y'amababi", "Ku butaka gusa"], answer: 1, topic: "Udukoko" }, ["Kumenya udukoko hakiri kare"]),
      (c, f) => lesson("Indwara zikunze kugaragara", "Ibimenyetso by'indwara.", `Indwara ikunze kwibasira ${c.name} ni ${c.disease}. Ibimenyetso birimo amabara adasanzwe ku mababi no kuma. Kuraho ibihingwa birwaye ubijugunye kure y'umurima.`, `${f} yakuyeho ibihingwa birwaye, indwara ntiyakwira mu murima wose.`, ["Menya ibimenyetso", "Kuraho ibirwaye", "Sukura ibikoresho"], `Ifoto y'amababi afite ${c.disease}`, { question: "Ukora iki ku gihingwa kirwaye?", options: ["Ukigumishaho", "Ukikuraho ukakijugunya kure", "Ucyuhira cyane"], answer: 1, topic: "Indwara" }, ["Kumenya indwara no kuzirinda"]),
      (c, f) => lesson("Kurwanya mu buryo bwizewe", "Imiti ikoreshwa ari uko bikenewe.", "Banza ukoreshe uburyo butari imiti: gusimburanya ibihingwa, isuku y'umurima n'imbuto zihanganira indwara. Iyo imiti ikenewe, ikoreshe ukurikije amabwiriza, wambaye ibikoresho byo kwirinda, kandi ubaze umujyanama.", `${f} yambaye uturindantoki n'agapfukamunwa igihe yateraga umuti.`, ["Banza uburyo butari imiti", "Kurikiza amabwiriza", "Ambara ibikoresho byo kwirinda"], "Igishushanyo cy'umuhinzi wambaye ibikoresho byo kwirinda", { question: "Mbere yo gukoresha umuti, ukwiye gukora iki?", options: ["Kubaza umujyanama no gusoma amabwiriza", "Kongera umuti", "Kuwuvanga n'amazi yo kunywa"], answer: 0, topic: "Gukoresha imiti" }, ["Gukoresha imiti mu buryo bwizewe"]),
    ],
  },
  {
    title: "Gusarura",
    description: "Kumenya igihe n'uburyo bwo gusarura.",
    lessons: [
      (c, f) => lesson("Kumenya igihe cyo gusarura", "Ibimenyetso byo kwera.", `${c.name.charAt(0).toUpperCase()}${c.name.slice(1)} zisarurwa ${c.harvestDays}. Ikimenyetso cyiza ni ${c.harvestSign}. Gusarura kare cyangwa bitinze bigabanya agaciro k'umusaruro.`, `${f} yasaruye igihe gikwiye, abona igiciro cyiza ku isoko.`, ["Menya iminsi", c.harvestSign, "Ntusarure kare"], `Ifoto igaragaza ${c.harvestSign}`, { question: `Ni ikihe kimenyetso cy'uko ${c.name} zeze?`, options: [c.harvestSign, "Amababi yose yumye", "Imvura iguye"], answer: 0, topic: "Igihe cyo gusarura" }, ["Kumenya igihe cyo gusarura"]),
      (c, f) => lesson("Uburyo bwo gusarura", "Gusarura nta kwangiza.", "Sarura mu gitondo hakonje. Koresha ibikoresho bisukuye kandi bityaye. Shyira umusaruro mu dutebo dusukuye, wirinde kuwujugunya.", `${f} yasaruye mu gitondo, umusaruro ntiwangirika mu nzira.`, ["Sarura hakonje", "Ibikoresho bisukuye", "Ntujugunye umusaruro"], "Ifoto y'agatebo karimo umusaruro mwiza", { question: "Ni ryari byiza gusarura?", options: ["Mu gitondo hakonje", "Saa sita", "Mu mvura nyinshi"], answer: 0, topic: "Uburyo bwo gusarura" }, ["Gusarura nta kwangiza"]),
      (c, f) => lesson("Isuku nyuma yo gusarura", "Gutandukanya no gusukura umusaruro.", "Tandukanya umusaruro mwiza n'uwangiritse ako kanya. Kuraho ubutaka n'amababi byangiritse. Umusaruro usukuye ugurishwa vuba kandi ku giciro cyiza.", `${f} yatandukanyije umusaruro mu byiciro bibiri, abaguzi baramwizera.`, ["Tandukanya umusaruro", "Kuraho ibyangiritse", "Umusaruro usukuye ugurwa vuba"], "Igishushanyo cy'ibyiciro by'umusaruro", { question: "Kuki utandukanya umusaruro mwiza n'uwangiritse?", options: ["Kugira ngo uwangiritse utangiza uwundi", "Kugira ngo upime gusa", "Nta mpamvu"], answer: 0, topic: "Isuku y'umusaruro" }, ["Gutunganya umusaruro nyuma yo gusarura"]),
    ],
  },
  {
    title: "Kubika no kugurisha",
    description: "Kubika umusaruro neza no kubona isoko.",
    lessons: [
      (c, f) => lesson("Kubika umusaruro", "Uko umusaruro umara igihe.", `Bika ${c.name} ${c.storage}. Irinde izuba ryinshi n'ubushyuhe. Genzura umusaruro wabitswe buri munsi, ukureho uwatangiye kwangirika.`, `${f} yabitse umusaruro neza, amara ibyumweru bibiri adatakaza.`, ["Ahantu hakonje", "Umwuka uhagije", "Genzura buri munsi"], "Ifoto y'ahantu ho kubika hafite umwuka", { question: `Ni hehe byiza kubika ${c.name}?`, options: ["Ahantu hakonje hafite umwuka", "Ku zuba", "Mu isashe ifunze"], answer: 0, topic: "Kubika umusaruro" }, ["Kubika umusaruro neza"]),
      (c, f) => lesson("Gutegura isoko", "Gushaka abaguzi mbere yo gusarura.", "Shaka isoko mbere yo gusarura. Vugana n'amakoperative, amasoko yo hafi n'abacuruzi. Kugurisha mu itsinda byongera imbaraga zo kumvikana ku giciro.", `${f} n'itsinda rye bagurishije hamwe, babona igiciro cyiza.`, ["Shaka isoko kare", "Korana n'amakoperative", "Gurisha mu itsinda"], "Igishushanyo cy'itsinda ry'abahinzi bagurisha hamwe", { question: "Ni ryari ukwiye gushaka isoko?", options: ["Mbere yo gusarura", "Nyuma y'uko umusaruro wangirika", "Ntibikenewe"], answer: 0, topic: "Isoko" }, ["Gutegura isoko kare"]),
      (c, f) => lesson("Kubara inyungu", "Kumenya niba ubuhinzi bwunguka.", "Andika amafaranga wakoresheje ku mbuto, ifumbire, imiti n'abakozi. Andika umusaruro wagurishije. Inyungu ni amafaranga winjije ukuyemo ayo wakoresheje.", `${f} yanditse ibyo yakoresheje byose, amenya ko yunguka.`, ["Andika ibyo wakoresheje", "Andika ibyo winjije", "Inyungu = ibyinjiye − ibyasohotse"], "Igishushanyo cy'ikayi y'umuhinzi y'ibaruramari", { question: "Inyungu ibarwa gute?", options: ["Ibyinjiye ukuyemo ibyasohotse", "Ibyasohotse gusa", "Umubare w'imbuto"], answer: 0, topic: "Kubara inyungu" }, ["Kubara inyungu y'ubuhinzi"]),
    ],
  },
];

export const pickFarmer = (variant: number) => farmers[Math.abs(variant) % farmers.length]!;
