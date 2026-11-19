import { composeCourse } from "@/lib/mock/ai-compose";
import { assessmentFromGenerated, courseFromGenerated, courseLessons } from "@/lib/mock/builders";
import type { AIContentGeneration, AIQuestion, AssessmentAttempt, ContentReview, Course, CourseAssignment, CourseRevision, CropSlug, Farmer, FarmerGroup, GenerationInput, LearningProgress, LearningState, Lesson } from "@/lib/mock/types";

const DAY = 86400000;
const day = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const ahead = (n: number) => new Date(Date.now() + n * DAY).toISOString();

const baseLessons = (veg: string): [string, string, string, string[]][][] => [
  [
    ["Guhitamo aho guhinga", `Aho ${veg} zera neza.`, `Hitamo umurima ubona izuba nibura amasaha atandatu ku munsi. Ubutaka bugomba kuba bworoshye kandi butareka amazi. Irinde guhinga ${veg} aho wahinze ibihingwa byo mu muryango umwe mu gihembwe gishize.`, ["Izuba amasaha 6 ku munsi", "Ubutaka butareka amazi", "Simburanya ibihingwa"]],
    ["Gutegura ubutaka n'ifumbire", "Uko wategura ubutaka.", "Hinga ubutaka neza, ukureho ibyatsi n'amabuye. Shyiramo ifumbire y'imborera yaboze neza ibyumweru bibiri mbere yo gutera. Ifumbire nziza yongera umusaruro.", ["Kuraho ibyatsi", "Ifumbire y'imborera yaboze", "Tegura ibyumweru 2 mbere"]],
  ],
  [
    ["Gutera", "Intera n'uburyo bwo gutera.", "Tera ku ntera ikwiye kugira ngo ibihingwa bibone umwuka n'izuba. Vomera neza nyuma yo gutera. Tera mu gitondo cyangwa nimugoroba.", ["Intera ikwiye", "Vomera nyuma yo gutera", "Tera mu gitondo cyangwa nimugoroba"]],
    ["Kurwanya udukoko n'indwara", "Menya ibimenyetso hakiri kare.", "Genzura umurima buri cyumweru. Reba amababi afite amabara adasanzwe cyangwa udukoko. Kuraho ibihingwa birwaye. Baza umujyanama w'ubuhinzi mbere yo gukoresha imiti.", ["Genzura buri cyumweru", "Kuraho ibirwaye", "Baza umujyanama"]],
  ],
  [
    ["Gusarura", "Igihe n'uburyo bwo gusarura.", "Sarura igihe ibihingwa byeze neza. Koresha ibikoresho bisukuye kandi wirinde gukomeretsa umusaruro. Sarura mu gihe hakonje.", ["Sarura byeze", "Ibikoresho bisukuye", "Sarura hakonje"]],
    ["Kubika no kugurisha", "Uko wabika umusaruro neza.", "Bika umusaruro ahantu hakonje kandi hari umwuka. Tandukanya umusaruro mwiza n'uwangiritse. Shaka isoko mbere yo gusarura.", ["Ahantu hakonje", "Tandukanya umusaruro", "Shaka isoko kare"]],
  ],
];

const moduleTitles = ["Gutegura umurima", "Gutera no kwita ku bihingwa", "Gusarura no kubika"];
const moduleDescriptions = ["Guhitamo umurima no gutegura ubutaka.", "Gutera, kuhira no kurinda ibihingwa.", "Gusarura, kubika no kugurisha umusaruro."];

function baseCourse(id: CropSlug, slug: string, title: string, description: string, veg: string): Course {
  return {
    id, slug, title, description, crop: id, level: "Intangiriro", language: "rw", durationWeeks: 4, status: "published", ownerId: "fac1", aiGenerated: false, revision: 3,
    objectives: ["Gutegura umurima ukwiye", "Kwita ku bihingwa no kubirinda", "Gusarura no kubika umusaruro"],
    createdAt: day(60), updatedAt: day(30), publishedAt: day(30),
    modules: baseLessons(veg).map((lessons, m) => ({
      id: `${id}-m${m + 1}`,
      title: moduleTitles[m]!,
      description: moduleDescriptions[m]!,
      lessons: lessons.map(([lessonTitle, summary, body, keyPoints], l): Lesson => ({
        id: `${id}-m${m + 1}-l${l + 1}`, title: lessonTitle, summary, body, keyPoints, objectives: [summary], example: "", durationMinutes: 8, format: "reading",
        narration: `Muraho muhinzi! ${lessonTitle}. ${body}`, narrationLanguage: "rw", ussdText: `${lessonTitle}: ${keyPoints.join("; ")}`.slice(0, 160),
        videoScenes: m === 0 && l === 0 ? [
          { id: `${id}-s1`, title: "Intangiriro", narration: "Muraho! Reka turebe aho guhinga.", visual: "Umurima ubona izuba", subtitle: "Muraho! Reka turebe aho guhinga.", seconds: 15 },
          { id: `${id}-s2`, title: "Ubutaka", narration: "Ubutaka bugomba kuba butareka amazi.", visual: "Intoki zikora ku butaka bworoshye", subtitle: "Ubutaka butareka amazi.", seconds: 20 },
        ] : [],
        illustration: "", aiGenerated: false, validated: true,
      })),
    })),
  };
}

function generatedCourse(id: string, input: GenerationInput, status: Course["status"], ownerId: string, at: number, validatedLessons: number) {
  const generated = composeCourse(input);
  const course = courseFromGenerated(generated, { id, crop: input.crop, level: input.level, ownerId, durationWeeks: input.durationWeeks, language: input.language, at: day(at) });
  let count = 0;
  course.modules.forEach((module) => module.lessons.forEach((lesson) => { lesson.validated = count++ < validatedLessons; }));
  return { course: { ...course, status, ...(status === "published" ? { publishedAt: day(at) } : {}) }, generated, assessment: assessmentFromGenerated(generated, id) };
}

const input = (topic: string, crop: CropSlug, moduleCount: number, level = "Intangiriro"): GenerationInput => ({ topic, crop, level, description: "", objectives: [], language: "rw", durationWeeks: 3, moduleCount, instructions: "" });

const farmerRows: [string, string, Farmer["channel"], string, string, string, string, string, CropSlug[], string][] = [
  ["Mukamana Aline", "0788123401", "smartphone", "Kigali City", "Gasabo", "Kimironko", "Bibare", "Imena", ["tomato", "cabbage"], "fac1"],
  ["Ndayisaba Eric", "0782123402", "basic_phone", "Northern Province", "Musanze", "Muhoza", "Mpenge", "Rukoro", ["tomato"], "fac1"],
  ["Uwase Josiane", "0787123407", "basic_phone", "Northern Province", "Musanze", "Muhoza", "Ruhengeri", "Kigombe", ["tomato"], "fac1"],
  ["Habimana Pierre", "0784123404", "smartphone", "Western Province", "Rubavu", "Gisenyi", "Umuganda", "Bugoyi", ["carrot"], "fac1"],
  ["Mukandayisenga Olive", "0789123409", "smartphone", "Western Province", "Rubavu", "Gisenyi", "Nengo", "Iwawa", ["carrot"], "fac1"],
  ["Mugisha Kevin", "0786123406", "smartphone", "Kigali City", "Gasabo", "Kimironko", "Kibagabaga", "Akintwari", ["cabbage"], "fac1"],
  ["Niyonsenga Patrick", "0780123410", "basic_phone", "Eastern Province", "Nyagatare", "Nyagatare", "Barija", "Nsheke", ["cabbage"], "fac1"],
  ["Iradukunda Grace", "0781123411", "basic_phone", "Northern Province", "Musanze", "Cyuve", "Kabeza", "Gakoro", ["tomato"], "fac1"],
  ["Uwimana Chantal", "0783123403", "basic_phone", "Southern Province", "Huye", "Tumba", "Cyarwa", "Gitwa", ["cabbage"], "fac2"],
  ["Bizimana Claude", "0788123408", "smartphone", "Southern Province", "Huye", "Tumba", "Mpare", "Nyakagezi", ["tomato"], "fac2"],
  ["Ingabire Diane", "0785123405", "basic_phone", "Southern Province", "Huye", "Ngoma", "Butare", "Kaburemera", ["cabbage"], "fac2"],
  ["Twagirayezu Samuel", "0789123412", "smartphone", "Southern Province", "Nyanza", "Busasamana", "Gahondo", "Rubona", ["tomato"], "fac2"],
  ["Mukeshimana Vestine", "0788555100", "basic_phone", "Northern Province", "Musanze", "Cyuve", "Kabeza", "Gakoro", ["tomato", "cabbage"], "fac1"],
];

const farmers: Farmer[] = farmerRows.map(([name, phone, channel, province, district, sector, cell, village, cropInterest, facilitatorId], i) => ({
  id: `f${i + 1}`, ...(i === 0 ? { accountId: "demo-farmer" } : {}), name, phone, channel, province, district, sector, cell, village, cropInterest, facilitatorId, joinedAt: day(45 - i * 3),
}));

const groups: FarmerGroup[] = [
  { id: "g1", name: "Abahinzi b'inyanya ba Muhoza", facilitatorId: "fac1", province: "Northern Province", district: "Musanze", sector: "Muhoza", cell: "Mpenge", village: "Rukoro", crop: "tomato", programme: "Inyanya 2026 – Igihembwe A", memberIds: ["f2", "f3", "f8"], createdAt: day(30), activity: [{ at: day(20), text: "Ubuhinzi bw'inyanya bwahawe itsinda" }] },
  { id: "g2", name: "Koperative Twiteze Imbere", facilitatorId: "fac1", province: "Kigali City", district: "Gasabo", sector: "Kimironko", cell: "Bibare", village: "Imena", crop: "cabbage", programme: "Amashu mu mujyi", memberIds: ["f1", "f6"], createdAt: day(25), activity: [{ at: day(15), text: "Ubuhinzi bw'amashu bwahawe itsinda" }] },
  { id: "g3", name: "Itsinda rya karoti rya Gisenyi", facilitatorId: "fac1", province: "Western Province", district: "Rubavu", sector: "Gisenyi", cell: "Umuganda", village: "Bugoyi", crop: "carrot", programme: "Karoti ku isoko", memberIds: ["f4", "f5"], createdAt: day(22), activity: [{ at: day(12), text: "Ubuhinzi bwa karoti bwahawe itsinda" }] },
  { id: "g4", name: "Abahinzi ba Tumba", facilitatorId: "fac2", province: "Southern Province", district: "Huye", sector: "Tumba", cell: "Cyarwa", village: "Gitwa", crop: "mixed", programme: "Imboga z'Amajyepfo", memberIds: ["f9", "f10", "f11"], createdAt: day(28), activity: [] },
];

const assignments: CourseAssignment[] = [
  { id: "as1", courseId: "tomato", target: { kind: "group", id: "g1" }, assignedBy: "fac1", assignedAt: day(20), startAt: day(20), dueAt: ahead(10), note: "Igihembwe A" },
  { id: "as2", courseId: "cabbage", target: { kind: "group", id: "g2" }, assignedBy: "fac1", assignedAt: day(15), startAt: day(15), dueAt: null, note: "" },
  { id: "as3", courseId: "carrot", target: { kind: "group", id: "g3" }, assignedBy: "fac1", assignedAt: day(12), startAt: day(12), dueAt: ahead(20), note: "Mbere y'isoko rya Gisenyi" },
  { id: "as4", courseId: "cabbage", target: { kind: "farmer", id: "f7" }, assignedBy: "fac1", assignedAt: day(5), startAt: day(5), dueAt: ahead(25), note: "" },
  { id: "as5", courseId: "tomato", target: { kind: "farmer", id: "f1" }, assignedBy: "fac1", assignedAt: day(3), startAt: day(3), dueAt: ahead(14), note: "Tangira n'igice cya mbere" },
  { id: "as6", courseId: "cabbage", target: { kind: "group", id: "g4" }, assignedBy: "fac2", assignedAt: day(18), startAt: day(18), dueAt: null, note: "" },
];

const progressPlan: [string, CropSlug, number, number][] = [
  ["f1", "tomato", 3, 1], ["f1", "cabbage", 1, 2], ["f2", "tomato", 6, 2], ["f3", "tomato", 2, 18], ["f4", "carrot", 4, 1], ["f5", "carrot", 6, 3],
  ["f6", "cabbage", 3, 4], ["f6", "tomato", 2, 6], ["f7", "cabbage", 1, 0], ["f9", "cabbage", 2, 5], ["f10", "cabbage", 5, 2],
];

function seedProgress(courses: Course[]): LearningProgress[] {
  return progressPlan.flatMap(([learnerId, courseId, done, lastDaysAgo]) => {
    const farmer = farmers.find((item) => item.id === learnerId)!;
    const lessons = courseLessons(courses.find((course) => course.id === courseId)!);
    return lessons.slice(0, done).map((lesson, index) => {
      const at = day(lastDaysAgo + (done - 1 - index) * 2);
      return { learnerId, courseId, lessonId: lesson.id, status: "completed" as const, channel: farmer.channel === "smartphone" ? "web" as const : index % 2 ? "ivr" as const : "ussd" as const, updatedAt: at, completedAt: at };
    });
  });
}

const attempts: AssessmentAttempt[] = [
  ["f2", "tomato", 92, []], ["f5", "carrot", 85, ["Kubika umusaruro"]], ["f4", "carrot", 64, ["Igihe cyo gusarura", "Indwara"]], ["f10", "cabbage", 71, ["Indwara"]],
  ["f6", "cabbage", 58, ["Ifumbire", "Indwara"]], ["f1", "tomato", 76, ["Ifumbire"]], ["f3", "tomato", 45, ["Indwara", "Gukoresha imiti", "Ifumbire"]],
].map(([learnerId, courseId, score, missedTopics], i) => ({ id: `at${i + 1}`, assessmentId: `as-${courseId}`, courseId: String(courseId), learnerId: String(learnerId), score: Number(score), missedTopics: missedTopics as string[], at: day(i + 1) }));

const aiQuestionRows: [string, CropSlug, string, string, string, AIQuestion["status"], AIQuestion["rating"], number][] = [
  ["f2", "tomato", "Indwara", "Ni iki gituma amababi y'inyanya yuma akirabura?", "Bishobora kuba kuma kw'amababi (late blight). Kuraho amababi arwaye kandi ubaze umujyanama.", "answered", "helpful", 1],
  ["f3", "tomato", "Indwara", "Amababi y'inyanya zanjye afite utudomo tw'umukara, nkore iki?", "", "unanswered", null, 2],
  ["f8", "tomato", "Gukoresha imiti", "Ni uwuhe muti nakoresha ku isazi z'umweru?", "Koresha umuti wemewe ukurikije amabwiriza. Banza ukoreshe isuku y'umurima.", "flagged", "not_helpful", 1],
  ["f1", "tomato", "Ifumbire", "Ifumbire ya NPK nyishyiramo ryari ku nyanya?", "Shyiramo ifumbire mvaruganda nyuma y'ibyumweru 2 wimuye ingemwe.", "answered", "helpful", 0],
  ["f6", "cabbage", "Ifumbire", "Ni ingano ingana iki y'ifumbire ya azote ku mashu?", "Koresha ifumbire ukurikije amabwiriza y'umujyanama w'ubuhinzi.", "flagged", "not_helpful", 3],
  ["f7", "cabbage", "Udukoko", "Inyo zirya amashu nazirwanya nte nta muti?", "Genzura amababi buri cyumweru, ukureho inyo n'intoki kandi ukoreshe imitego.", "answered", "helpful", 2],
  ["f1", "cabbage", "Igihe cyo gusarura", "Nzamenya nte ko amashu yeze?", "Umutwe ukomeye kandi wuzuye iyo uwukanze.", "answered", "helpful", 4],
  ["f4", "carrot", "Igihe cyo gusarura", "Karoti zisarurwa nyuma y'iminsi ingahe?", "Iminsi 70 kugeza kuri 100 nyuma yo kubiba.", "answered", null, 1],
  ["f5", "carrot", "Kubika umusaruro", "Nabika karoti igihe kirekire nte nta firigo?", "", "unanswered", null, 3],
  ["f4", "carrot", "Ubutaka", "Kuki karoti zanjye zikura zigoramye?", "Ubutaka bufite amabuye cyangwa bukomeye. Koresha ubutaka bworoshye.", "answered", "helpful", 5],
  ["f2", "tomato", "Isoko", "Ni hehe nagurisha inyanya ku giciro cyiza i Musanze?", "", "unanswered", null, 6],
  ["f10", "cabbage", "Indwara", "Amashu yanjye arabora imbere, ni iki?", "Bishobora kuba kubora kw'umukara (black rot).", "answered", "not_helpful", 2],
  ["f6", "tomato", "Kuhira", "Ni kangahe nuhira inyanya mu cyi?", "Uhira kabiri cyangwa gatatu mu cyumweru, ku muzi.", "answered", "helpful", 7],
  ["f3", "tomato", "Gukoresha imiti", "Nyuma yo gutera umuti, ntegereza iminsi ingahe ngo nsarure?", "", "flagged", "not_helpful", 4],
];

const aiQuestions: AIQuestion[] = aiQuestionRows.map(([learnerId, crop, topic, question, answer, status, rating, ago], i) => ({
  id: `q${i + 1}`, learnerId, courseId: crop, lessonId: null, crop, topic, question, answer, status, rating,
  channel: farmers.find((item) => item.id === learnerId)?.channel === "smartphone" ? "web" : "ussd", at: day(ago), facilitatorNote: "", correction: null, reviewed: false,
}));

export function seedLearning(): LearningState {
  const base = [
    baseCourse("tomato", "ubuhinzi-bw-inyanya", "Ubuhinzi bw'inyanya", "Menya guhitamo imbuto, gutegura umurima, kwita ku nyanya no kuzisarura neza.", "inyanya"),
    baseCourse("cabbage", "ubuhinzi-bw-amashu", "Ubuhinzi bw'amashu", "Iga gutegura ingemwe, kuzitera, kurwanya udukoko no gusarura amashu meza.", "amashu"),
    baseCourse("carrot", "ubuhinzi-bwa-karoti", "Ubuhinzi bwa karoti", "Menya ubutaka bukwiye karoti, kubiba, kubagara no gusarura karoti nziza.", "karoti"),
  ];
  const extra = [
    generatedCourse("c-tomato-disease", input("Kurwanya indwara z'inyanya", "tomato", 2), "pending_review", "fac1", 2, 4),
    generatedCourse("c-cabbage-water", input("Kuhira no gufumbira amashu", "cabbage", 2), "rejected", "fac1", 6, 4),
    generatedCourse("c-carrot-sowing", input("Kubiba karoti neza", "carrot", 2), "draft", "fac1", 1, 0),
    generatedCourse("c-cabbage-seedlings", input("Gutegura ingemwe z'amashu", "cabbage", 2), "approved", "fac1", 7, 4),
    generatedCourse("c-tomato-dry", input("Inyanya mu gihe cy'izuba: kuhira", "tomato", 2), "pending_review", "fac2", 1, 4),
    generatedCourse("c-carrot-market", input("Kugurisha karoti ku isoko", "carrot", 1), "archived", "fac1", 40, 2),
  ];
  const courses = [...base, ...extra.map((item) => item.course)];
  const reviews: ContentReview[] = [
    { id: "r1", courseId: "tomato", revision: 3, action: "published", authorId: "admin", authorName: "Uwase Diane", comment: "Ryatangajwe nyuma yo kwemezwa.", moduleId: null, lessonId: null, resolved: true, at: day(30) },
    { id: "r2", courseId: "c-tomato-disease", revision: 1, action: "submitted", authorId: "fac1", authorName: "Habimana Jean", comment: "Ryateguwe na AI, amasomo abiri arasuzumwe.", moduleId: null, lessonId: null, resolved: true, at: day(2) },
    { id: "r3", courseId: "c-tomato-disease", revision: 1, action: "comment", authorId: "rev1", authorName: "Dr. Mukeshimana Odette", comment: "Ongeraho izina ry'umuti wemewe na RAB n'iminsi yo gutegereza mbere yo gusarura.", moduleId: "c-tomato-disease-m1", lessonId: "c-tomato-disease-m1-l2", resolved: false, at: day(1) },
    { id: "r4", courseId: "c-cabbage-water", revision: 1, action: "submitted", authorId: "fac1", authorName: "Habimana Jean", comment: "", moduleId: null, lessonId: null, resolved: true, at: day(9) },
    { id: "r5", courseId: "c-cabbage-water", revision: 1, action: "rejected", authorId: "rev1", authorName: "Dr. Mukeshimana Odette", comment: "Ingano y'ifumbire ya azote ntihuye n'amabwiriza ya RAB. Kosora isomo rya kabiri kandi wongereho uko kuhira bihinduka mu gihe cy'imvura.", moduleId: null, lessonId: null, resolved: false, at: day(6) },
    { id: "r6", courseId: "c-cabbage-water", revision: 1, action: "comment", authorId: "rev1", authorName: "Dr. Mukeshimana Odette", comment: "Iri somo rigomba kuvuga ingano y'amazi ku murongo.", moduleId: "c-cabbage-water-m1", lessonId: "c-cabbage-water-m1-l2", resolved: false, at: day(6) },
    { id: "r7", courseId: "c-cabbage-seedlings", revision: 1, action: "submitted", authorId: "fac1", authorName: "Habimana Jean", comment: "", moduleId: null, lessonId: null, resolved: true, at: day(10) },
    { id: "r8", courseId: "c-cabbage-seedlings", revision: 1, action: "approved", authorId: "rev1", authorName: "Dr. Mukeshimana Odette", comment: "Amakuru y'ubuhinzi ni ukuri. Rishobora gutangazwa.", moduleId: null, lessonId: null, resolved: true, at: day(7) },
    { id: "r9", courseId: "c-tomato-dry", revision: 1, action: "submitted", authorId: "fac2", authorName: "Mukamana Beatrice", comment: "Ndasaba isuzuma rya mugenzi wanjye.", moduleId: null, lessonId: null, resolved: true, at: day(1) },
  ];
  const revisions: CourseRevision[] = courses.map((course) => ({ id: `rv-${course.id}`, courseId: course.id, revision: course.revision, by: course.ownerId === "fac2" ? "Mukamana Beatrice" : "Habimana Jean", summary: course.aiGenerated ? "Ryateguwe na AI kandi rihindurwa n'umufashamyumvire" : "Ivugurura rya gatatu ry'isomo", at: course.updatedAt }));
  const generations: AIContentGeneration[] = [
    { id: "gen1", facilitatorId: "fac1", input: input("Kubiba karoti neza", "carrot", 2), result: extra[2]!.generated, status: "saved", courseId: "c-carrot-sowing", model: "menyamuhinzi-mock-v1", createdAt: day(1) },
    { id: "gen2", facilitatorId: "fac1", input: input("Gusarura no kubika inyanya", "tomato", 2), result: composeCourse(input("Gusarura no kubika inyanya", "tomato", 2)), status: "generated", courseId: null, model: "menyamuhinzi-mock-v1", createdAt: day(0) },
  ];
  const assessments = [
    ...base.map((course) => ({ id: `as-${course.id}`, courseId: course.id, title: `Isuzumabumenyi: ${course.title}`, status: "published" as const, questions: [
      { id: `${course.id}-q1`, kind: "choice" as const, question: "Ni amasaha angahe y'izuba ibihingwa bikenera ku munsi?", options: ["Amasaha 2", "Amasaha 6", "Nta zuba"], answer: 1, topic: "Guhitamo aho guhinga", explanation: "Ibihingwa bikenera nibura amasaha atandatu y'izuba ku munsi." },
      { id: `${course.id}-q2`, kind: "choice" as const, question: "Ifumbire y'imborera ishyirwamo ryari?", options: ["Umunsi wo gutera", "Ibyumweru 2 mbere", "Nyuma yo gusarura"], answer: 1, topic: "Ifumbire", explanation: "Ifumbire y'imborera ishyirwamo ibyumweru bibiri mbere yo gutera." },
      { id: `${course.id}-q3`, kind: "true_false" as const, question: "Ni byiza kugenzura umurima buri cyumweru?", options: ["Yego", "Oya"], answer: 0, topic: "Kwita ku murima", explanation: "Genzura buri cyumweru kugira ngo ubone ikibazo hakiri kare." },
      { id: `${course.id}-q4`, kind: "short" as const, question: "Andika umubare w'amasaha y'izuba ibihingwa bikenera ku munsi.", options: [], answer: 0, accept: "6|atandatu", topic: "Izuba", explanation: "Igisubizo ni amasaha atandatu." },
    ] })),
    ...extra.map((item) => item.assessment),
  ];
  return {
    version: 1,
    facilitators: [
      { id: "fac1", accountId: "demo-facilitator", name: "Habimana Jean", email: "facilitator@menyamuhinzi.rw", phone: "0782001100", title: "Agronomist", organisation: "Rwanda Agriculture Board (RAB) – Musanze", qualification: "BSc Agronomy, University of Rwanda", yearsOfExperience: 8, district: "Musanze", specialties: ["tomato", "cabbage", "carrot"], language: "rw", notifications: { reviewDecisions: true, farmerQuestions: true, weeklySummary: true, smsAlerts: false }, responsibilities: ["Gutegura amasomo y'inyanya, amashu na karoti", "Gusuzuma ibyateguwe na AI mbere yo kubyohereza", "Gukurikirana amatsinda 3 y'abahinzi", "Gusubiza ibibazo abahinzi babajije AI"] },
      { id: "fac2", accountId: "", name: "Mukamana Beatrice", email: "beatrice@menyamuhinzi.rw", phone: "0782001101", title: "Crop extension officer", organisation: "Akarere ka Huye", qualification: "Diploma in Crop Production", yearsOfExperience: 5, district: "Huye", specialties: ["tomato", "cabbage"], language: "rw", notifications: { reviewDecisions: true, farmerQuestions: true, weeklySummary: false, smsAlerts: true }, responsibilities: ["Gukurikirana itsinda rya Tumba"] },
    ],
    farmers,
    groups,
    courses,
    resources: [
      { id: "res1", courseId: "tomato", lessonId: "tomato-m1-l1", kind: "image", title: "Umurima ubona izuba", note: "Ifoto yafatiwe i Musanze", language: "rw", url: "", createdAt: day(20) },
      { id: "res2", courseId: "tomato", lessonId: "tomato-m2-l2", kind: "document", title: "Amabwiriza ya RAB ku ndwara z'inyanya", note: "PDF y'impapuro 4", language: "rw", url: "", createdAt: day(18) },
      { id: "res3", courseId: "c-carrot-sowing", lessonId: "c-carrot-sowing-m1-l1", kind: "audio", title: "Ijwi: guhitamo imbuto za karoti", note: "Rizafatwa mu Kinyarwanda", language: "rw", url: "", createdAt: day(1) },
    ],
    assignments,
    enrollments: [{ learnerId: "f6", courseId: "tomato", enrolledAt: day(10) }],
    progress: seedProgress(courses),
    assessments,
    attempts,
    reviews,
    revisions,
    aiQuestions,
    generations,
    settings: [{ learnerId: "f1", language: "rw", notifyNew: true, notifyAssigned: true, notifyReminder: true, notifyResults: true }],
    noticeReads: [],
    config: { latencyMs: 350, failNextLoad: false },
  };
}
