import type { CropSlug, TeachingAudience, TeachingInput, TeachingLanguage, TeachingSection, TeachingSectionKind } from "@/lib/mock/types";

type Text = { rw: string; en: string };
type Theme = "pests" | "land" | "harvest" | "water" | "general";

/** Kinyarwanda connectives differ by noun class (inyanya, amashu, karoti), so each crop carries its own forms. */
type CropFacts = {
  name: Text;
  on: string;
  of: string;
  cult: string;
  farm: string;
  spacing: Text;
  disease: Text;
  pest: Text;
  ripe: Text;
  place: string;
  storage: Text;
  water: Text;
};

const facts: Record<CropSlug, CropFacts> = {
  tomato: {
    name: { rw: "inyanya", en: "tomatoes" },
    on: "ku nyanya", of: "by'inyanya", cult: "bw'inyanya", farm: "w'inyanya",
    spacing: { rw: "cm 60 hagati y'imirongo na cm 45 hagati y'ibiti", en: "60 cm between rows and 45 cm between plants" },
    disease: { rw: "ibibembe by'inyanya (late blight): amabara y'umukara ku mababi no ku mbuto", en: "late blight: dark patches on leaves and fruit" },
    pest: { rw: "isazi z'umweru ziba munsi y'amababi", en: "whiteflies under the leaves" },
    ripe: { rw: "iyo imbuto zitangiye gutukura", en: "when the fruit starts turning red" },
    place: "Musanze",
    storage: { rw: "mu dukarito duto tudapakiye cyane, ahantu hakonje", en: "in small, loosely packed crates in a cool place" },
    water: { rw: "kabiri cyangwa gatatu mu cyumweru, ku muzi", en: "two or three times a week, at the root" },
  },
  cabbage: {
    name: { rw: "amashu", en: "cabbages" },
    on: "ku mashu", of: "by'amashu", cult: "bw'amashu", farm: "w'amashu",
    spacing: { rw: "cm 60 hagati y'imirongo na cm 45 hagati y'amashu", en: "60 cm between rows and 45 cm between heads" },
    disease: { rw: "kubora kw'umukara (black rot): amababi atangira guhonga mu mpande ahinduka umuhondo", en: "black rot: yellow V-shaped patches from the leaf edges" },
    pest: { rw: "inyo z'amashu zirya amababi", en: "caterpillars eating the leaves" },
    ripe: { rw: "iyo umutwe ukomeye kandi wuzuye iyo uwukanze", en: "when the head is firm and full when pressed" },
    place: "Nyagatare",
    storage: { rw: "ahantu hakonje kandi hari umwuka, utarunze amashu menshi hamwe", en: "in a cool, airy place without piling heads too high" },
    water: { rw: "buri minsi itatu mu gihe cy'izuba", en: "every three days in the dry season" },
  },
  carrot: {
    name: { rw: "karoti", en: "carrots" },
    on: "kuri karoti", of: "bya karoti", cult: "bwa karoti", farm: "wa karoti",
    spacing: { rw: "imirongo ya cm 30, karoti zitandukanijwe na cm 5", en: "rows 30 cm apart, carrots thinned to 5 cm" },
    disease: { rw: "kubora kw'imizi iyo ubutaka bureka amazi", en: "root rot when the soil stays waterlogged" },
    pest: { rw: "isazi ya karoti itera utwobo mu mizi", en: "carrot fly that tunnels into the roots" },
    ripe: { rw: "nyuma y'iminsi 70 kugeza 100, iyo umuzi ufite umubyimba w'urutoki runini", en: "after 70 to 100 days, when the root is as thick as a thumb" },
    place: "Rubavu",
    storage: { rw: "zimaze gukurwaho amababi, mu musenyi utose ahantu hakonje", en: "with tops removed, in damp sand in a cool place" },
    water: { rw: "gake ariko kenshi kugeza zimeze, hanyuma rimwe mu cyumweru", en: "lightly and often until they sprout, then once a week" },
  },
};

const audienceNote: Record<TeachingAudience, Text> = {
  beginner: { rw: "Koresha amagambo yoroshye, werekane buri ntambwe mu murima kandi ubareke babigerageze.", en: "Use simple words, show every step in the field and let them try it." },
  intermediate: { rw: "Babaze ibyo basanzwe bakora, hanyuma mugereranye n'uburyo bushya.", en: "Ask what they already do, then compare it with the improved practice." },
  advanced: { rw: "Ganira nabo ku musaruro, ibiciro n'uko babika amakuru y'umurima mu gitabo.", en: "Discuss yields, costs and keeping simple farm records." },
};

const audienceName: Record<TeachingAudience, Text> = {
  beginner: { rw: "abahinzi batangiye", en: "beginner farmers" },
  intermediate: { rw: "abahinzi bamaze kumenya bike", en: "intermediate farmers" },
  advanced: { rw: "abahinzi b'inararibonye", en: "advanced farmers" },
};

function themeOf(topic: string): Theme {
  const text = topic.toLowerCase();
  if (/indwara|udukoko|disease|pest|isazi|inyo|ibibembe/.test(text)) return "pests";
  if (/ubutaka|gutegura|gutera|kubiba|ingemwe|land|soil|plant|sow|seed/.test(text)) return "land";
  if (/gusarura|kubika|isoko|kugurisha|harvest|stor|market|sell/.test(text)) return "harvest";
  if (/kuhira|amazi|water|irrig/.test(text)) return "water";
  return "general";
}

type Topic = { title: Text; notes: Text; practical: Text };
type ThemeBank = {
  topics: (c: CropFacts) => Topic[];
  materials: Text[];
  demos: (c: CropFacts) => Text[];
  keyPoints: (c: CropFacts) => Text[];
  questions: (c: CropFacts) => Text[];
  quiz: (c: CropFacts) => Text[];
  examples: (c: CropFacts) => Text[];
};

const n = (c: CropFacts) => c.name;

const banks: Record<Theme, ThemeBank> = {
  pests: {
    topics: (c) => [
      { title: { rw: `Kumenya ibimenyetso by'indwara n'udukoko ${c.on}`, en: `Recognising disease and pest signs on ${n(c).en}` },
        notes: { rw: `Indwara ikunze kugaragara: ${c.disease.rw}. Udukoko dukunze kugaragara: ${c.pest.rw}. Erekana abahinzi ibi bimenyetso, hanyuma usabe buri wese kureba amababi yo hasi n'ayo hejuru.`, en: `Common disease: ${c.disease.en}. Common pest: ${c.pest.en}. Show farmers these signs, then ask each one to check both the lower and upper leaves.` },
        practical: { rw: "Genzura umurima buri cyumweru. Ikibazo kibonetse kare kiroroshye kugikemura.", en: "Check the field every week. A problem found early is easier to handle." } },
      { title: { rw: "Kwirinda mbere y'uko ikibazo kiba", en: "Prevention before problems start" },
        notes: { rw: `Simburanya ibihingwa, tera ku ntera ikwiye (${c.spacing.rw}) kandi usukure ibikoresho. Umwuka uhagije mu murima ugabanya indwara.`, en: `Rotate crops, plant at the right spacing (${c.spacing.en}) and clean tools. Good airflow in the field reduces disease.` },
        practical: { rw: "Ntugatere igihingwa kimwe ahantu hamwe ibihembwe bibiri bikurikiranye.", en: "Do not plant the same crop in the same place two seasons in a row." } },
      { title: { rw: "Gucunga ikibazo cyagaragaye", en: "Managing a problem once it appears" },
        notes: { rw: "Kuraho amababi cyangwa ibiti birwaye ubijyane kure y'umurima. Ntuzabishyire mu ifumbire. Mbere yo gukoresha umuti uwo ari wo wose, baza umujyanama w'ubuhinzi cyangwa RAB.", en: "Remove sick leaves or plants and take them away from the field. Do not add them to compost. Before using any chemical, ask an agronomist or RAB." },
        practical: { rw: "Andika itariki wabonye ikibazo n'icyo wakoze, kugira ngo umujyanama agufashe neza.", en: "Write down the date you saw the problem and what you did, so the adviser can help you." } },
    ],
    materials: [{ rw: "Amababi mazima n'arwaye yo kwerekana", en: "Healthy and diseased leaf samples" }, { rw: "Amafoto manini y'ibimenyetso", en: "Large photos of symptoms" }, { rw: "Agafuka ko gushyiramo ibirwaye", en: "A bag for removed sick plants" }, { rw: "Ikaramu n'igitabo cy'umurima", en: "Pen and a farm notebook" }],
    demos: (c) => [{ rw: `Erekana ku murima ibiti ${c.of} bifite ikibazo n'ibizima, ubashyire iruhande.`, en: `In the field, place sick and healthy ${n(c).en} plants side by side.` }, { rw: "Kuramo ibabi rirwaye neza, ushyire mu gafuka, hanyuma usukure intoki n'igikoresho.", en: "Remove a sick leaf correctly, bag it, then clean hands and tool." }, { rw: "Abahinzi bagabanywe mu matsinda mato, buri tsinda rigenzure umurongo umwe.", en: "Split farmers into small groups and let each group inspect one row." }],
    keyPoints: (c) => [{ rw: "Genzura umurima buri cyumweru.", en: "Inspect the field every week." }, { rw: `Tera ku ntera ikwiye: ${c.spacing.rw}.`, en: `Plant at the right spacing: ${c.spacing.en}.` }, { rw: "Kuraho ibirwaye ubijyane kure y'umurima.", en: "Remove sick plants and take them away from the field." }, { rw: "Baza umujyanama mbere yo gukoresha umuti.", en: "Ask an adviser before using any chemical." }],
    questions: (c) => [{ rw: `Ni ibihe bimenyetso mwabonye ku bihingwa byanyu muri iki gihembwe?`, en: `What signs have you seen on your ${n(c).en} this season?` }, { rw: "Ni kangahe mugenzura imirima yanyu mu cyumweru?", en: "How often do you inspect your fields each week?" }, { rw: "Mukora iki ku biti birwaye mumaze gukuraho?", en: "What do you do with sick plants after removing them?" }, { rw: "Ni nde mubaza iyo mubonye ikibazo mudasobanukiwe?", en: "Who do you ask when you see a problem you do not understand?" }],
    quiz: (c) => [{ rw: `Ikibazo: Ni kangahe ugomba kugenzura umurima? — Igisubizo: buri cyumweru.`, en: "Question: How often should you inspect the field? — Answer: every week." }, { rw: `Ikibazo: Ni iki kigabanya indwara mu murima ${c.farm}? — Igisubizo: gusimburanya ibihingwa n'intera ikwiye.`, en: `Question: What reduces disease in a ${n(c).en} field? — Answer: crop rotation and correct spacing.` }, { rw: "Ikibazo: Ese ibiti birwaye bishyirwa mu ifumbire? — Igisubizo: Oya.", en: "Question: Should sick plants go into compost? — Answer: No." }],
    examples: (c) => [{ rw: `Itsinda ry'abahinzi i ${c.place} ryagabanyije igihombo kuko buri wa mbere bagenzuraga imirima hamwe.`, en: `A farmer group in ${c.place} reduced losses by inspecting fields together every Monday.` }, { rw: "Umuhinzi wo mu Murenge wa Muhoza yakuyeho ibiti bitatu birwaye hakiri kare, indwara ntiyakwira umurima wose.", en: "A farmer in Muhoza sector removed three sick plants early and the disease did not spread." }],
  },
  land: {
    topics: (c) => [
      { title: { rw: "Guhitamo aho guhinga", en: "Choosing the right site" },
        notes: { rw: `Mu guhinga ${n(c).rw} hakenewe izuba nibura amasaha atandatu ku munsi n'ubutaka butareka amazi. Irinde ahahinzwe ibihingwa byo mu muryango umwe igihembwe gishize.`, en: `${n(c).en} need at least six hours of sun a day and soil that drains well. Avoid places where related crops grew last season.` },
        practical: { rw: "Fata urushyi rw'ubutaka, urukande: niba rufatana cyane, ongeramo ifumbire y'imborera.", en: "Squeeze a handful of soil: if it sticks hard, add compost." } },
      { title: { rw: "Gutegura ubutaka n'ifumbire y'imborera", en: "Preparing soil and compost" },
        notes: { rw: "Hinga neza, ukureho ibyatsi n'amabuye. Shyiramo ifumbire y'imborera yaboze neza ibyumweru bibiri mbere yo gutera.", en: "Dig well, removing weeds and stones. Add well-rotted compost two weeks before planting." },
        practical: { rw: "Ifumbire yaboze neza ntinuka kandi isa n'ubutaka bwirabura.", en: "Well-rotted compost has no bad smell and looks like dark soil." } },
      { title: { rw: "Gutera ku ntera ikwiye", en: "Planting at the right spacing" },
        notes: { rw: `Tera ${n(c).rw} ku ntera ya ${c.spacing.rw}. Tera mu gitondo cyangwa nimugoroba, hanyuma uvomere.`, en: `Plant ${n(c).en} at ${c.spacing.en}. Plant in the morning or evening, then water.` },
        practical: { rw: "Koresha umugozi n'uduti two gupima intera kugira ngo imirongo ingane.", en: "Use a string and marked sticks to keep rows even." } },
    ],
    materials: [{ rw: "Isuka n'igitiyo", en: "Hoe and spade" }, { rw: "Ifumbire y'imborera yaboze", en: "Well-rotted compost" }, { rw: "Umugozi n'uduti two gupima", en: "String and measuring sticks" }, { rw: "Ingemwe cyangwa imbuto", en: "Seedlings or seed" }],
    demos: (c) => [{ rw: "Tegura umurongo umwe w'icyitegererezo imbere y'abahinzi.", en: "Prepare one demonstration row in front of the farmers." }, { rw: `Erekana uko bapima intera ya ${c.spacing.rw} bakoresheje umugozi.`, en: `Show how to measure ${c.spacing.en} with a string.` }, { rw: "Gereranya ifumbire yaboze n'itaraboze, abahinzi bayikoreho.", en: "Compare rotted and fresh manure and let farmers touch both." }],
    keyPoints: (c) => [{ rw: "Izuba amasaha 6 ku munsi.", en: "Six hours of sun a day." }, { rw: "Ubutaka butareka amazi.", en: "Soil that drains well." }, { rw: "Ifumbire y'imborera ibyumweru 2 mbere yo gutera.", en: "Compost two weeks before planting." }, { rw: `Intera: ${c.spacing.rw}.`, en: `Spacing: ${c.spacing.en}.` }],
    questions: () => [{ rw: "Imirima yanyu ibona izuba amasaha angahe ku munsi?", en: "How many hours of sun do your fields get?" }, { rw: "Mukora mute ifumbire y'imborera?", en: "How do you make compost?" }, { rw: "Ni iki gituma intera ari ingenzi?", en: "Why does spacing matter?" }, { rw: "Ni ryari mutera, mu gitondo cyangwa ku manywa?", en: "When do you plant, morning or midday?" }],
    quiz: () => [{ rw: "Ikibazo: Ifumbire y'imborera ishyirwamo ryari? — Igisubizo: ibyumweru 2 mbere yo gutera.", en: "Question: When is compost added? — Answer: two weeks before planting." }, { rw: "Ikibazo: Ni amasaha angahe y'izuba akenewe? — Igisubizo: nibura 6.", en: "Question: How many hours of sun are needed? — Answer: at least 6." }, { rw: "Ikibazo: Ni ryari byiza gutera? — Igisubizo: mu gitondo cyangwa nimugoroba.", en: "Question: When is it best to plant? — Answer: morning or evening." }],
    examples: (c) => [{ rw: `Umuhinzi i ${c.place} yongereye umusaruro amaze gukoresha ifumbire y'imborera yaboze neza.`, en: `A farmer in ${c.place} raised her yield after using well-rotted compost.` }, { rw: "Koperative yo mu Karere ka Gasabo ikoresha umugozi umwe wapimwe kugira ngo imirongo yose ingane.", en: "A cooperative in Gasabo uses one marked string so every row is even." }],
  },
  harvest: {
    topics: (c) => [
      { title: { rw: "Kumenya igihe cyo gusarura", en: "Knowing when to harvest" },
        notes: { rw: `Sarura ${n(c).rw} ${c.ripe.rw}. Gusarura hakiri kare cyangwa bitinze bigabanya agaciro.`, en: `Harvest ${n(c).en} ${c.ripe.en}. Harvesting too early or too late lowers value.` },
        practical: { rw: "Sarura mu gitondo hakonje, ukoresheje ibikoresho bisukuye.", en: "Harvest in the cool morning with clean tools." } },
      { title: { rw: "Gutoranya no kubika umusaruro", en: "Sorting and storing the harvest" },
        notes: { rw: `Tandukanya umusaruro mwiza n'uwangiritse. Bika ${n(c).rw} ${c.storage.rw}.`, en: `Separate good produce from damaged produce. Store ${n(c).en} ${c.storage.en}.` },
        practical: { rw: "Umusaruro umwe wangiritse ushobora kwangiza indi. Ntukabivange.", en: "One spoiled item can spoil the rest. Keep them apart." } },
      { title: { rw: "Gutegura isoko", en: "Preparing for the market" },
        notes: { rw: "Shaka umuguzi mbere yo gusarura. Mugurishe hamwe nk'itsinda kugira ngo mubone igiciro cyiza.", en: "Find a buyer before harvesting. Sell together as a group to get a better price." },
        practical: { rw: "Andika ingano wasaruye n'igiciro wagurishijeho buri gihe.", en: "Record how much you harvested and the price each time." } },
    ],
    materials: [{ rw: "Udukarito cyangwa ibitebo bisukuye", en: "Clean crates or baskets" }, { rw: "Icyuma cyangwa umukasi bisukuye", en: "Clean knife or shears" }, { rw: "Umunzani muto", en: "A small scale" }, { rw: "Igitabo cyo kwandikamo", en: "A record book" }],
    demos: (c) => [{ rw: "Erekana umusaruro weze n'utareze, abahinzi bavuge itandukaniro.", en: `Show ripe and unripe ${n(c).en} and let farmers name the difference.` }, { rw: "Toranya umusaruro mu byiciro bitatu: mwiza, uringaniye, wangiritse.", en: "Sort produce into three grades: good, medium, damaged." }, { rw: "Pima umusaruro ku munzani wandike mu gitabo.", en: "Weigh produce on the scale and record it." }],
    keyPoints: (c) => [{ rw: `Sarura ${c.ripe.rw}.`, en: `Harvest ${c.ripe.en}.` }, { rw: "Sarura hakonje n'ibikoresho bisukuye.", en: "Harvest when cool with clean tools." }, { rw: "Tandukanya umusaruro mwiza n'uwangiritse.", en: "Separate good from damaged produce." }, { rw: "Shaka isoko kare.", en: "Find the market early." }],
    questions: () => [{ rw: "Ni iki kibabwira ko umusaruro weze?", en: "What tells you the crop is ready?" }, { rw: "Ni hehe mubika umusaruro nyuma yo gusarura?", en: "Where do you store the harvest?" }, { rw: "Ni ikihe gihombo mwagize mu gihembwe gishize?", en: "What losses did you have last season?" }, { rw: "Ese mwigeze kugurisha hamwe nk'itsinda?", en: "Have you ever sold together as a group?" }],
    quiz: (c) => [{ rw: `Ikibazo: Ni ryari dusarura ${n(c).rw}? — Igisubizo: ${c.ripe.rw}.`, en: `Question: When are ${n(c).en} harvested? — Answer: ${c.ripe.en}.` }, { rw: "Ikibazo: Ni ryari byiza gusarura mu munsi? — Igisubizo: mu gitondo hakonje.", en: "Question: What time of day is best? — Answer: the cool morning." }, { rw: "Ikibazo: Ese umusaruro wangiritse ubikwa hamwe n'umwiza? — Igisubizo: Oya.", en: "Question: Should damaged produce be stored with good produce? — Answer: No." }],
    examples: (c) => [{ rw: `Itsinda ry'i ${c.place} ryabonye igiciro cyiza kuko ryagurishije hamwe ku muguzi umwe.`, en: `A group in ${c.place} got a better price by selling together to one buyer.` }, { rw: "Umuhinzi yagabanyije igihombo amaze gukoresha udukarito duto aho gukoresha imifuka minini.", en: "A farmer cut losses by using small crates instead of big sacks." }],
  },
  water: {
    topics: (c) => [
      { title: { rw: "Igihe n'ingano y'amazi", en: "When and how much to water" },
        notes: { rw: `Uhira ${n(c).rw} ${c.water.rw}. Uhira mu gitondo cyangwa nimugoroba kugira ngo amazi adatakara.`, en: `Water ${n(c).en} ${c.water.en}. Water in the morning or evening so less water is lost.` },
        practical: { rw: "Shyira urutoki mu butaka kugera kuri cm 5: niba bwumutse, ni igihe cyo kuhira.", en: "Push a finger 5 cm into the soil: if it is dry, it is time to water." } },
      { title: { rw: "Kubika ubuhehere mu butaka", en: "Keeping moisture in the soil" },
        notes: { rw: "Sasira ubutaka ibyatsi byumye kugira ngo bugumane amazi kandi ibyatsi bibi bidamera.", en: "Cover the soil with dry grass mulch to keep moisture and stop weeds." },
        practical: { rw: "Gusasira bigabanya inshuro zo kuhira mu gihe cy'izuba.", en: "Mulching reduces how often you need to water in the dry season." } },
      { title: { rw: "Kuhira mu gihe cy'izuba n'icy'imvura", en: "Dry season and rainy season watering" },
        notes: { rw: "Mu mvura, reka kuhira kandi ucukure imiyoboro amazi atareka. Mu cyi, uhira ku muzi aho kuhira amababi.", en: "In the rains, stop watering and dig channels so water does not pool. In the dry season, water at the root, not the leaves." },
        practical: { rw: "Amazi ku mababi nimugoroba ashobora gutera indwara.", en: "Water on leaves in the evening can encourage disease." } },
    ],
    materials: [{ rw: "Indobo cyangwa arosozi", en: "Bucket or watering can" }, { rw: "Ibyatsi byumye byo gusasira", en: "Dry grass for mulch" }, { rw: "Isuka yo gucukura imiyoboro", en: "Hoe for digging channels" }],
    demos: () => [{ rw: "Erekana uko bapima ubuhehere bakoresheje urutoki.", en: "Show how to test moisture with a finger." }, { rw: "Sasira umurongo umwe, usige undi, mugereranye nyuma y'iminsi itatu.", en: "Mulch one row, leave another bare, and compare after three days." }, { rw: "Erekana kuhira ku muzi aho kuhira amababi.", en: "Show watering at the root instead of the leaves." }],
    keyPoints: (c) => [{ rw: `Uhira ${c.water.rw}.`, en: `Water ${c.water.en}.` }, { rw: "Uhira mu gitondo cyangwa nimugoroba.", en: "Water in the morning or evening." }, { rw: "Sasira kugira ngo ubutaka bugumane amazi.", en: "Mulch to keep soil moist." }, { rw: "Mu mvura, irinde amazi areka.", en: "In the rains, avoid standing water." }],
    questions: () => [{ rw: "Mumenya mute ko ubutaka bukeneye amazi?", en: "How do you know the soil needs water?" }, { rw: "Amazi yo kuhira muyakura he?", en: "Where do you get water for irrigation?" }, { rw: "Ese mwigeze gusasira? Byagenze bite?", en: "Have you tried mulching? How did it go?" }],
    quiz: () => [{ rw: "Ikibazo: Ni ryari byiza kuhira? — Igisubizo: mu gitondo cyangwa nimugoroba.", en: "Question: When is the best time to water? — Answer: morning or evening." }, { rw: "Ikibazo: Gusasira bimara iki? — Igisubizo: bigumana amazi mu butaka.", en: "Question: What does mulching do? — Answer: keeps moisture in the soil." }],
    examples: (c) => [{ rw: `Abahinzi b'i ${c.place} basasira imirima mu cyi, bagabanya inshuro zo kuhira kabiri.`, en: `Farmers in ${c.place} mulch in the dry season and halve how often they water.` }],
  },
  general: {
    topics: (c) => [
      { title: { rw: `Ibikenewe mu guhinga ${n(c).rw}`, en: `What ${n(c).en} need` },
        notes: { rw: `Mu guhinga ${n(c).rw} hakenewe izuba, ubutaka bworoshye, ifumbire y'imborera n'amazi ahagije. Tera ku ntera ya ${c.spacing.rw}.`, en: `${n(c).en} need sun, loose soil, compost and enough water. Plant at ${c.spacing.en}.` },
        practical: { rw: "Tangirira ku murima muto ushobora kwitaho neza.", en: "Start with a small plot you can look after well." } },
      { title: { rw: "Kwita ku murima buri cyumweru", en: "Weekly field care" },
        notes: { rw: `Bagara, uhire ${c.water.rw}, kandi ugenzure ibimenyetso nka ${c.pest.rw}.`, en: `Weed, water ${c.water.en}, and watch for signs such as ${c.pest.en}.` },
        practical: { rw: "Gena umunsi umwe mu cyumweru wo kugenzura umurima wose.", en: "Pick one day each week to walk the whole field." } },
      { title: { rw: "Gusarura no kugurisha", en: "Harvesting and selling" },
        notes: { rw: `Sarura ${c.ripe.rw}, ubike ${c.storage.rw}, kandi ushake isoko kare.`, en: `Harvest ${c.ripe.en}, store ${c.storage.en}, and find a buyer early.` },
        practical: { rw: "Andika ibyo wasaruye n'ibyo wagurishije.", en: "Record what you harvested and sold." } },
    ],
    materials: [{ rw: "Isuka n'indobo", en: "Hoe and bucket" }, { rw: "Ingemwe cyangwa imbuto", en: "Seedlings or seed" }, { rw: "Amafoto cyangwa ibishushanyo", en: "Photos or drawings" }, { rw: "Igitabo cy'umurima", en: "Farm notebook" }],
    demos: (c) => [{ rw: `Erekana ingemwe nziza n'izitameze neza (${n(c).rw}).`, en: `Show good and weak ${n(c).en} seedlings.` }, { rw: "Tegura umurongo w'icyitegererezo hamwe n'abahinzi.", en: "Prepare a demonstration row with the farmers." }, { rw: "Erekana uko bandika amakuru mu gitabo cy'umurima.", en: "Show how to write records in the farm notebook." }],
    keyPoints: (c) => [{ rw: "Izuba, ubutaka bworoshye n'ifumbire y'imborera.", en: "Sun, loose soil and compost." }, { rw: `Intera: ${c.spacing.rw}.`, en: `Spacing: ${c.spacing.en}.` }, { rw: "Genzura umurima buri cyumweru.", en: "Check the field every week." }, { rw: "Shaka isoko mbere yo gusarura.", en: "Find a market before harvest." }],
    questions: (c) => [{ rw: `Ni iki kibagora cyane mu buhinzi ${c.cult}?`, en: `What is hardest for you when growing ${n(c).en}?` }, { rw: "Ni iki mwakora ukundi nyuma y'aya mahugurwa?", en: "What will you do differently after this training?" }, { rw: "Ni nde wabafasha mu itsinda iyo mubonye ikibazo?", en: "Who in the group can help when there is a problem?" }],
    quiz: (c) => [{ rw: `Ikibazo: Ni iyihe ntera ikwiye mu guhinga ${n(c).rw}? — Igisubizo: ${c.spacing.rw}.`, en: `Question: What is the right spacing for ${n(c).en}? — Answer: ${c.spacing.en}.` }, { rw: "Ikibazo: Ni kangahe ugenzura umurima? — Igisubizo: buri cyumweru.", en: "Question: How often do you check the field? — Answer: every week." }],
    examples: (c) => [{ rw: `Itsinda ry'abahinzi b'i ${c.place} rihura buri cyumweru kugira ngo risangire ubumenyi.`, en: `A farmer group in ${c.place} meets every week to share what they learn.` }],
  },
};

const intros: Text[] = [
  { rw: "Muraho neza bahinzi! Uyu munsi turaganira ku ngingo: {topic}. Tuzigira hamwe, turebe mu murima, kandi buri wese azagerageza.", en: "Good morning, farmers! Today we will talk about {topic}. We will learn together, look at the field, and everyone will try it." },
  { rw: "Murakaza neza mu mahugurwa! Ingingo yacu y'uyu munsi ni: {topic}. Mubaze ibibazo igihe cyose mutasobanukiwe.", en: "Welcome to the training! Our topic today is {topic}. Ask questions any time something is unclear." },
  { rw: "Bahinzi, uyu munsi tuzibanda ku ngingo: {topic}. Tuzatangira tuganira ku byo musanzwe mukora, hanyuma twige uburyo bwiza.", en: "Farmers, today we focus on {topic}. We will start with what you already do, then learn the improved practice." },
];

const summaries: Text[] = [
  { rw: "Uyu munsi twize ku ngingo: {topic}. Ibuka ingingo z'ingenzi, uzigerageze mu murima wawe muri iki cyumweru, hanyuma tuzaganire ku musaruro mu nama itaha.", en: "Today we learned about {topic}. Remember the key points, try them in your field this week, and we will discuss results at the next meeting." },
  { rw: "Twarangije amahugurwa ku ngingo: {topic}. Buri muhinzi ahitemo igikorwa kimwe azakora mbere y'uko twongera guhura.", en: "We have finished the training on {topic}. Each farmer should choose one action to do before we meet again." },
  { rw: "Murakoze kwitabira! Ibyo twize ku ngingo ({topic}) bizabafasha kongera umusaruro. Musangire n'abaturanyi banyu.", en: "Thank you for taking part! What we learned about {topic} will help you grow more. Share it with your neighbours." },
];

const headings: Record<Exclude<TeachingSectionKind, "topic" | "custom">, Text> = {
  intro: { rw: "Intangiriro", en: "Introduction" },
  objectives: { rw: "Intego z'amahugurwa", en: "Learning objectives" },
  materials: { rw: "Ibikoresho bikenewe", en: "Required training materials" },
  examples: { rw: "Ingero zo mu Rwanda", en: "Examples from Rwandan farms" },
  demonstrations: { rw: "Imyitozo ngiro yo kwerekana", en: "Suggested demonstrations" },
  key_points: { rw: "Ingingo z'ingenzi", en: "Key learning points" },
  questions: { rw: "Ibibazo byo kubaza abahinzi", en: "Questions to ask farmers" },
  summary: { rw: "Incamake y'amahugurwa", en: "Training summary" },
  quiz: { rw: "Isuzuma ry'ubumenyi (si ngombwa)", en: "Knowledge check (optional)" },
};

const pick = (text: Text, lang: TeachingLanguage) => text[lang];
const rotate = <T,>(items: T[], by: number) => items.map((_, i) => items[(i + by) % items.length]!);
const bullets = (items: string[]) => items.map((item) => `• ${item}`).join("\n");
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function minutesPlan(total: number) {
  const intro = Math.max(5, Math.round(total * 0.1));
  const topic = Math.max(10, Math.round(total * 0.17));
  const demo = Math.max(10, Math.round(total * 0.2));
  const rest = Math.max(5, total - intro - topic * 3 - demo);
  return { intro, topic, demo, questions: Math.ceil(rest / 2), summary: Math.floor(rest / 2) || 5 };
}

function objectivesFrom(input: TeachingInput, topics: Topic[]) {
  const typed = input.objectives.split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (typed.length) return typed;
  const lang = input.language;
  const lead = lang === "rw" ? "Abahinzi bazashobora" : "Farmers will be able to work on";
  return topics.map((topic) => `${lead}: ${pick(topic.title, lang).toLowerCase()}`);
}

export function composeSections(input: TeachingInput, variant: number): TeachingSection[] {
  const lang = input.language;
  const crop = facts[input.crop];
  const bank = banks[themeOf(input.topic)];
  const topic = subjectOf(input);
  const plan = minutesPlan(input.durationMinutes);
  const topics = bank.topics(crop);
  const audience = pick(audienceNote[input.audience], lang);
  const fill = (text: Text) => pick(text, lang).replace("{topic}", topic);
  const extra = input.instructions.trim() ? `\n\n${lang === "rw" ? "Icyitonderwa cy'umufashamyumvire" : "Facilitator note"}: ${input.instructions.trim()}` : "";
  const make = (kind: TeachingSectionKind, heading: string, body: string, minutes: number | null, index = 0): TeachingSection => ({ id: `${kind}-${index}`, kind, heading, body, minutes });
  const timeLabel = lang === "rw" ? "Igihe" : "Time";
  const say = lang === "rw"
    ? { notes: "Inyandiko zo kwigisha", practical: "Ubusobanuro mu bikorwa", tip: "Inama" }
    : { notes: "Teaching notes", practical: "Practical explanation", tip: "Tip" };
  const tips = rotate(bank.keyPoints(crop).map((item) => pick(item, lang)), variant);
  return [
    make("intro", pick(headings.intro, lang), `${fill(rotate(intros, variant)[0]!)}\n\n${lang === "rw" ? "Abitabiriye" : "Audience"}: ${pick(audienceName[input.audience], lang)}.\n${lang === "rw" ? "Inama ku mufashamyumvire" : "Facilitator tip"}: ${audience}${extra}`, plan.intro),
    make("objectives", pick(headings.objectives, lang), bullets(objectivesFrom(input, topics)), null),
    make("materials", pick(headings.materials, lang), bullets(rotate(bank.materials.map((item) => pick(item, lang)), variant)), null),
    ...topics.map((item, index) => make("topic", cap(pick(item.title, lang)), `${say.notes}: ${pick(item.notes, lang)}\n\n${say.practical}: ${pick(item.practical, lang)}\n\n${say.tip}: ${tips[index % tips.length]}`, plan.topic, index)),
    make("examples", pick(headings.examples, lang), bullets(rotate(bank.examples(crop).map((item) => pick(item, lang)), variant)), null),
    make("demonstrations", pick(headings.demonstrations, lang), `${bullets(rotate(bank.demos(crop).map((item) => pick(item, lang)), variant))}\n\n${timeLabel}: ${plan.demo} min`, plan.demo),
    make("key_points", pick(headings.key_points, lang), bullets(rotate(bank.keyPoints(crop).map((item) => pick(item, lang)), variant)), null),
    make("questions", pick(headings.questions, lang), bullets(rotate(bank.questions(crop).map((item) => pick(item, lang)), variant)), plan.questions),
    make("summary", pick(headings.summary, lang), fill(rotate(summaries, variant)[0]!), plan.summary),
    make("quiz", pick(headings.quiz, lang), bullets(rotate(bank.quiz(crop).map((item) => pick(item, lang)), variant)), null),
  ];
}

const themeSubjects: Record<Theme, Text> = {
  pests: { rw: "kumenya, kwirinda no gucunga indwara n'udukoko {of}", en: "identifying, preventing and managing {crop} diseases and pests" },
  land: { rw: "gutegura umurima no gutera {crop}", en: "preparing land and planting {crop}" },
  harvest: { rw: "gusarura, kubika no kugurisha {crop}", en: "harvesting, storing and selling {crop}" },
  water: { rw: "kuhira {crop} neza", en: "watering {crop} well" },
  general: { rw: "ubuhinzi bwiza {cult}", en: "growing {crop} well" },
};

/** Long free-text requests are summarised into a short subject so titles stay readable. */
function subjectOf(input: TeachingInput) {
  const topic = input.topic.trim();
  if (topic && topic.length <= 60) return topic;
  const crop = facts[input.crop];
  return pick(themeSubjects[themeOf(topic)], input.language).replace("{crop}", pick(crop.name, input.language)).replace("{of}", crop.of).replace("{cult}", crop.cult);
}

export function composeTitle(input: TeachingInput) {
  const subject = subjectOf(input);
  return input.language === "en" ? `Training: ${cap(subject)}` : `Amahugurwa: ${cap(subject)}`;
}
