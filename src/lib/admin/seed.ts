import type { AdminState, PortalUser } from "@/lib/admin/types";

const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const farmers: PortalUser[] = [
  ["Mukamana Aline", "0788123401", "aline@example.com", "Gasabo", "smartphone", 0, "g1", 82],
  ["Ndayisaba Eric", "0782123402", "", "Musanze", "basic_phone", 1, "g1", 40],
  ["Uwimana Chantal", "0783123403", "", "Huye", "basic_phone", 3, "g2", 15],
  ["Habimana Pierre", "0784123404", "pierre@example.com", "Rubavu", "smartphone", 6, "g3", 100],
  ["Ingabire Diane", "0785123405", "", "Nyagatare", "basic_phone", 8, "g2", 0],
  ["Mugisha Kevin", "0786123406", "kevin@example.com", "Gasabo", "smartphone", 12, "", 55],
  ["Uwase Josiane", "0787123407", "", "Musanze", "basic_phone", 14, "g1", 20],
  ["Bizimana Claude", "0788123408", "", "Huye", "smartphone", 20, "g2", 70],
  ["Mukandayisenga Olive", "0789123409", "olive@example.com", "Rubavu", "smartphone", 2, "g3", 33],
  ["Niyonsenga Patrick", "0780123410", "", "Nyagatare", "basic_phone", 4, "", 0],
  ["Iradukunda Grace", "0781123411", "", "Musanze", "basic_phone", 5, "", 0],
  ["Mukeshimana Vestine", "0788555100", "", "Musanze", "basic_phone", 0, "", 0],
].map((row, i): PortalUser => ({
  id: `f${i + 1}`,
  name: String(row[0]),
  phone: String(row[1]),
  email: String(row[2]),
  district: String(row[3]),
  language: "rw",
  channel: row[4] as PortalUser["channel"],
  role: row[4] === "smartphone" ? "SMARTPHONE_FARMER" : "BASIC_PHONE_FARMER",
  status: i === 4 ? "suspended" : i === 9 ? "deactivated" : "active",
  registeredAt: day(Number(row[5])),
  lastActiveAt: day(i === 9 ? 30 : i % 5),
  qualification: "",
  verified: false,
  groupId: String(row[6]),
  enrollments: row[6] ? [{ courseId: row[6] === "g2" ? "cabbage" : row[6] === "g3" ? "carrot" : "tomato", progress: Number(row[7]) }] : [],
  notes: [],
}));

const farmerPrompt = "Subiza umuhinzi mu Kinyarwanda cyoroshye. Koresha gusa ibiri mu masomo yemewe y'isomo yiyandikishijemo. Niba ikibazo kiri hanze y'isomo, bivuge kandi umwohereze ku mufashamyumvire. Ntutange imiti cyangwa ingano y'ifumbire.";
const coursePrompt = "Draft a Kinyarwanda vegetable course for Rwandan farmers: title, description, objectives, modules, lessons with a practical example and key points, USSD text, narration, resources, and assessment questions. Mark everything as a draft for expert review. Never publish.";
const teachingPrompt = "Prepare a facilitator session plan in the requested language: introduction, objectives, materials, timed topics, demonstrations, key points, discussion questions, a short quiz, and a summary. Keep advice general and never give chemical doses.";

export function seedAdmin(): AdminState {
  return {
    users: [
      ...farmers,
      { id: "adm1", name: "Uwase Diane", phone: "0788000001", email: "admin@menyamuhinzi.rw", district: "Gasabo", language: "rw", channel: "smartphone", role: "ADMIN", status: "active", registeredAt: day(60), lastActiveAt: day(0), qualification: "Platform administrator", verified: true, groupId: "", enrollments: [], notes: [], approvedAt: day(60), location: { province: "Kigali City", district: "Gasabo", sector: "Kimironko", cell: "Bibare", village: "Imena" } },
      { id: "fac1", name: "Habimana Jean", phone: "0782001100", email: "facilitator@menyamuhinzi.rw", district: "Musanze", language: "rw", channel: "smartphone", role: "FACILITATOR", status: "active", registeredAt: day(40), lastActiveAt: day(1), qualification: "Agronomist, University of Rwanda", verified: true, groupId: "g1", enrollments: [], notes: [], approvedAt: day(39), reviewedBy: "Uwase Diane", location: { province: "Northern Province", district: "Musanze", sector: "Muhoza", cell: "Mpenge", village: "Kabeza" } },
      { id: "fac2", name: "Mukamana Beatrice", phone: "0782001101", email: "beatrice@menyamuhinzi.rw", district: "Huye", language: "rw", channel: "smartphone", role: "FACILITATOR", status: "active", registeredAt: day(28), lastActiveAt: day(2), qualification: "Crop extension officer", verified: true, groupId: "g2", enrollments: [], notes: [], approvedAt: day(27), reviewedBy: "Uwase Diane", location: { province: "Southern Province", district: "Huye", sector: "Tumba", cell: "Cyimana", village: "Gitwa" } },
      { id: "fac3", name: "Nkurunziza Samuel", phone: "0782001102", email: "samuel@example.com", district: "Rubavu", language: "fr", channel: "smartphone", role: "FACILITATOR", status: "pending", registeredAt: day(3), lastActiveAt: day(3), qualification: "Diploma in horticulture", verified: false, groupId: "", enrollments: [], notes: [], location: { province: "Western Province", district: "Rubavu", sector: "Gisenyi", cell: "Umuganda", village: "Bugoyi" } },
      { id: "req1", name: "Uwamahoro Claudine", phone: "0788200301", email: "claudine@example.com", district: "Kicukiro", language: "rw", channel: "smartphone", role: "SMARTPHONE_FARMER", status: "pending", registeredAt: day(1), lastActiveAt: day(1), qualification: "", verified: false, groupId: "", enrollments: [], notes: [], location: { province: "Kigali City", district: "Kicukiro", sector: "Gahanga", cell: "Kagasa", village: "Rebero" } },
      { id: "req2", name: "Nyirahabimana Jeanne", phone: "0783200303", email: "", district: "Gakenke", language: "rw", channel: "basic_phone", role: "BASIC_PHONE_FARMER", status: "pending", registeredAt: day(2), lastActiveAt: day(2), qualification: "", verified: false, groupId: "", enrollments: [], notes: [{ at: day(2), text: "Registered during a field visit by Habimana Jean." }], location: { province: "Northern Province", district: "Gakenke", sector: "Ruli", cell: "Gikingo", village: "Kanyana" } },
      { id: "req3", name: "Mutabazi Eric", phone: "0784200304", email: "", district: "Huye", language: "rw", channel: "smartphone", role: "SMARTPHONE_FARMER", status: "rejected", registeredAt: day(9), lastActiveAt: day(9), qualification: "", verified: false, groupId: "", enrollments: [], notes: [], reviewedAt: day(8), reviewedBy: "Uwase Diane", rejectionReason: "Duplicate request: the farmer is already registered with another number.", location: { province: "Southern Province", district: "Huye", sector: "Ngoma", cell: "Butare", village: "Kaburemera" } },
    ],
    knowledge: [
      { id: "k1", title: "Inyanya: indwara z'amababi", kind: "PDF", vegetable: "Tomato", language: "rw", author: "RAB", status: "indexed", updatedAt: day(12), addedAt: day(30), topic: "Pests and diseases", description: "Guide to recognising early and late blight on tomato leaves." },
      { id: "k2", title: "Amashu: gutera ingemwe", kind: "DOCX", vegetable: "Cabbage", language: "rw", author: "Habimana Jean", status: "awaiting_review", updatedAt: day(2), addedAt: day(2), topic: "Planting", description: "Field notes on transplanting cabbage seedlings in Musanze." },
      { id: "k3", title: "Karoti: ubutaka bukwiye", kind: "PDF", vegetable: "Carrot", language: "en", author: "FAO", status: "processing_failed", updatedAt: day(1), addedAt: day(1), topic: "Land preparation", description: "Soil depth and texture for carrots." },
      { id: "k4", title: "Kubika umusaruro w'imboga", kind: "TXT", vegetable: "All", language: "rw", author: "MenyaMuhinzi", status: "approved", updatedAt: day(4), addedAt: day(20), topic: "Harvest and storage", description: "Simple storage practices for tomatoes, cabbages and carrots." },
    ],
    glossary: [
      { id: "t1", rw: "Ifumbire y'imborera", en: "Compost", fr: "Compost", definition: "Ifumbire ikomoka ku bisigazwa by'ibihingwa n'amatungo yaboze.", status: "reviewed" },
      { id: "t2", rw: "Ingemwe", en: "Seedling", fr: "Plantule", definition: "Igihingwa gito gitangiriye mu gitaka cyo gutera.", status: "reviewed" },
      { id: "t3", rw: "Gusarura", en: "Harvest", fr: "Récolte", definition: "Gukuramo umusaruro wabutse.", status: "draft" },
    ],
    prompts: [
      { id: "p1", name: "Learning answer", purpose: "Answer a farmer from approved knowledge", version: 3, active: true, body: "Answer in Kinyarwanda using only approved MenyaMuhinzi knowledge. Say when you are not sure." },
      { id: "p2", name: "Lesson draft", purpose: "Draft a lesson for agronomist review", version: 1, active: false, body: "Draft a short Kinyarwanda lesson. Mark it as a draft. Do not publish it." },
    ],
    ai: { model: "lovable-gateway", timeoutSec: 20, retries: 2, dailyLimit: 500, fallback: "ask the facilitator", active: true },
    aiEvents: Array.from({ length: 18 }, (_, i) => ({
      id: `ai${i}`,
      at: day(i % 10),
      question: ["Ni iki gituma amababi y'inyanya yuma?", "Ni ryari nsarura amashu?", "Ubutaka bwa karoti bugomba kuba gute?"][i % 3]!,
      ok: i % 7 !== 0,
      latencyMs: 700 + i * 40,
      confidence: i % 5 === 0 ? "low" as const : "high" as const,
      flagged: i % 5 === 0,
    })),
    menus: [
      { id: "root", title: "MenyaMuhinzi", options: [{ key: "1", label: "Kinyarwanda", next: "crop" }, { key: "2", label: "English", next: "crop" }] },
      { id: "crop", title: "Hitamo imboga", options: [{ key: "1", label: "Inyanya", next: "lesson" }, { key: "2", label: "Amashu", next: "lesson" }, { key: "3", label: "Karoti", next: "lesson" }] },
      { id: "lesson", title: "Isomo: Gutegura umurima", options: [{ key: "1", label: "Komeza", next: "end" }, { key: "0", label: "Subira", next: "crop" }] },
      { id: "end", title: "Murakoze. Isomo rirarangiye.", options: [] },
    ],
    sessions: [
      { id: "s1", at: day(0), kind: "ussd", who: "0782123402", result: "completed", simulated: false, detail: "Inyanya · Gutegura umurima" },
      { id: "s2", at: day(1), kind: "ussd", who: "0783123403", result: "timeout", simulated: false, detail: "Session ended" },
      { id: "s3", at: day(0), kind: "ivr", who: "0785123405", result: "completed", simulated: false, detail: "4 min · key 0 repeat" },
      { id: "s4", at: day(2), kind: "ivr", who: "0780123410", result: "failed", simulated: false, detail: "Audio not reached" },
    ],
    assessments: [
      { id: "a1", title: "Inyanya: isuzumabumenyi", courseId: "tomato", questions: 5, attempts: 12, avgScore: 78, status: "published" },
      { id: "a2", title: "Amashu: isuzumabumenyi", courseId: "cabbage", questions: 5, attempts: 0, avgScore: 0, status: "draft" },
    ],
    groups: [
      { id: "g1", name: "Itsinda rya Musanze", district: "Musanze", facilitatorId: "fac1", members: 3 },
      { id: "g2", name: "Itsinda rya Huye", district: "Huye", facilitatorId: "fac2", members: 3 },
      { id: "g3", name: "Itsinda rya Rubavu", district: "Rubavu", facilitatorId: "fac3", members: 2 },
    ],
    notices: [
      { id: "n1", at: day(0), severity: "warning", title: "Two facilitator courses are waiting for review", read: false, acked: false },
      { id: "n2", at: day(1), severity: "critical", title: "Carrot document processing failed", read: false, acked: false },
      { id: "n3", at: day(2), severity: "info", title: "New facilitator is waiting for verification", read: true, acked: false },
    ],
    audit: [{ id: "au0", at: day(6), actor: "Uwase Diane", action: "publish", resource: "course:tomato", detail: "Published tomato course" }],
    integrations: [
      { id: "ai", name: "Lovable AI gateway", status: "connected", note: "Used for lesson answers. No API key in the browser." },
      { id: "ussd", name: "USSD provider", status: "not_connected", note: "No short code yet. The simulator is separate." },
      { id: "ivr", name: "IVR provider", status: "not_connected", note: "No call number yet. The simulator is separate." },
      { id: "sms", name: "SMS", status: "not_connected", note: "Needed later for phone account recovery." },
    ],
    languages: [
      { code: "rw", name: "Kinyarwanda", default: true, coverage: 100, enabled: true },
      { code: "en", name: "English", default: false, coverage: 40, enabled: true },
      { code: "fr", name: "French", default: false, coverage: 15, enabled: true },
    ],
    permissions: {
      FACILITATOR: { view: true, create: true, update: true, approve: true, publish: false, export: false, manage: false, delete: false },
      SMARTPHONE_FARMER: { view: true, create: false, update: false, delete: false, approve: false, publish: false, export: false, manage: false },
      BASIC_PHONE_FARMER: { view: true, create: false, update: false, delete: false, approve: false, publish: false, export: false, manage: false },
    },
    targetGroups: [
      { id: "tg1", name: "Northern Province Tomato Farmers", description: "Tomato growers across the Northern Province, mostly small plots near Musanze.", audience: "all", province: "Northern Province", district: "", sector: "", crop: "tomato", estimatedFarmers: 420, language: "rw", notes: "Main tomato season starts in September.", status: "active", createdAt: day(21), updatedAt: day(21), createdBy: "Uwase Diane" },
      { id: "tg2", name: "Kigali Vegetable Farmers", description: "Peri-urban vegetable farmers in Kigali selling to city markets.", audience: "intermediate", province: "Kigali City", district: "", sector: "", crop: "mixed", estimatedFarmers: 260, language: "rw", notes: "", status: "active", createdAt: day(15), updatedAt: day(15), createdBy: "Uwase Diane" },
      { id: "tg3", name: "Beginner Cabbage Farmers", description: "New cabbage growers in Huye who joined this season.", audience: "beginner", province: "Southern Province", district: "Huye", sector: "", crop: "cabbage", estimatedFarmers: 150, language: "rw", notes: "Pair with the Huye facilitator visits.", status: "active", createdAt: day(9), updatedAt: day(9), createdBy: "Uwase Diane" },
      { id: "tg4", name: "Carrot Production Training Group", description: "Carrot training cohort in Rubavu.", audience: "advanced", province: "Western Province", district: "Rubavu", sector: "Gisenyi", crop: "carrot", estimatedFarmers: 80, language: "rw", notes: "Paused until the next training round.", status: "inactive", createdAt: day(40), updatedAt: day(5), createdBy: "Uwase Diane" },
    ],
    models: [
      { id: "m-mock", name: "MenyaMuhinzi mock LLM", type: "llm", provider: "Built-in mock (runs in the browser)", version: "menyamuhinzi-mock-v1", purposes: ["chat", "generation"], languages: ["rw", "en"], status: "active", defaultFor: ["chat", "generation"], notes: "Answers from approved lessons and composes drafts from templates. No network call.", updatedAt: day(6) },
      { id: "m-gateway", name: "Gateway LLM (placeholder)", type: "llm", provider: "Lovable AI Gateway (not connected)", version: "to be confirmed", purposes: ["chat", "generation"], languages: ["rw", "en", "fr"], status: "testing", defaultFor: [], notes: "Placeholder for the production model. The key is held on the server, never in the browser.", updatedAt: day(6) },
      { id: "m-embed", name: "Knowledge embeddings (placeholder)", type: "embedding", provider: "To be selected", version: "—", purposes: ["embedding"], languages: ["rw", "en"], status: "inactive", defaultFor: ["embedding"], notes: "Would index approved knowledge resources for search.", updatedAt: day(12) },
      { id: "m-tts", name: "MMS text-to-speech, Kinyarwanda", type: "tts", provider: "Meta MMS (facebook/mms-tts-kin), run offline", version: "mms-tts-kin", purposes: ["tts"], languages: ["rw"], status: "active", defaultFor: ["tts"], notes: "Used offline to record the lesson narrations served as audio files. Nothing is synthesised in the browser.", updatedAt: day(3) },
      { id: "m-stt", name: "Kinyarwanda speech-to-text (planned)", type: "stt", provider: "To be selected", version: "—", purposes: ["stt"], languages: ["rw"], status: "unavailable", defaultFor: [], notes: "Needed for spoken IVR questions. Not available in this phase.", updatedAt: day(12) },
    ],
    chatbots: [
      { id: "cb-farmer", name: "Farmer Learning Assistant", description: "Answers farmers' questions about the course they are enrolled in (Baza, and key 8 on IVR).", purpose: "Course-grounded answers for farmers", feature: "farmer_assistant", modelId: "m-mock", status: "active", languages: ["rw", "en"], scope: "Only the lessons of the published course the farmer is enrolled in.", behavior: { tone: "simple", maxWords: 120, groundedOnly: true, refuseRestricted: true, fallback: "Baza umufashamyumvire wawe." }, prompt: farmerPrompt, promptVersion: 2, versions: [{ version: 2, body: farmerPrompt, at: day(6), by: "Uwase Diane", note: "Added the referral to the facilitator" }, { version: 1, body: "Subiza umuhinzi mu Kinyarwanda ukoresheje amasomo yemewe gusa.", at: day(30), by: "Uwase Diane", note: "First version" }], updatedAt: day(6) },
      { id: "cb-course", name: "Course Content Generation Assistant", description: "Drafts full courses for administrators and facilitators to review.", purpose: "Course drafting", feature: "course_generation", modelId: "m-mock", status: "active", languages: ["rw", "en"], scope: "Tomatoes, cabbages and carrots only. Output is always a draft.", behavior: { tone: "simple", maxWords: 600, groundedOnly: false, refuseRestricted: true, fallback: "Generation is unavailable. Create the course manually." }, prompt: coursePrompt, promptVersion: 1, versions: [{ version: 1, body: coursePrompt, at: day(20), by: "Uwase Diane", note: "First version" }], updatedAt: day(20) },
      { id: "cb-teaching", name: "Teaching Material Generation Assistant", description: "Prepares session plans for facilitators' farmer groups.", purpose: "Facilitator teaching materials", feature: "teaching_generation", modelId: "m-mock", status: "active", languages: ["rw", "en"], scope: "Group sessions on tomatoes, cabbages and carrots.", behavior: { tone: "simple", maxWords: 800, groundedOnly: false, refuseRestricted: true, fallback: "Generation is unavailable. Write the session plan manually." }, prompt: teachingPrompt, promptVersion: 1, versions: [{ version: 1, body: teachingPrompt, at: day(10), by: "Uwase Diane", note: "First version" }], updatedAt: day(10) },
    ],
    channels: { ussdStatus: "simulated", ussdLanguages: ["rw", "en"], ivrStatus: "simulated", completionPercent: 90, sessionTimeoutSec: 120 },
    platform: { name: "MenyaMuhinzi", tagline: "Iga. Hinga. Usarure neza.", supportEmail: "support@menyamuhinzi.rw", supportPhone: "0788000000", defaultLanguage: "rw", defaultScope: "platform", notifications: { accountRequests: true, aiFailures: true, coursePublished: true, weeklySummary: false } },
  };
}
