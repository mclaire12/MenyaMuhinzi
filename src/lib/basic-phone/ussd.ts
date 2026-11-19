import { getAdminState } from "@/lib/admin/store";
import { crops } from "@/lib/mock/crops";
import { questionsForCourse } from "@/lib/mock/services/farmer";
import type { CropSlug, LearningState } from "@/lib/mock/types";
import type { Caller, Identification, PhoneLanguage } from "@/lib/basic-phone/farmers";
import { courseStanding, enrolledCourses, findLesson, lessonRecord, lessonRefs, publishedCourses, type LessonRef } from "@/lib/basic-phone/progress";

/** Illustrative short code for testing; not an officially assigned code. */
export const USSD_CODE = "*675#";
export const USSD_MAX_CHARS = 182;
/** Idle time before a session expires; set in System Operations. */
export const ussdIdleMs = () => Math.min(600, Math.max(30, getAdminState().channels.sessionTimeoutSec)) * 1000;

export type UssdScreen =
  | { id: "lang" }
  | { id: "main" }
  | { id: "crops" }
  | { id: "courses"; crop: CropSlug; page: number }
  | { id: "course"; courseId: string }
  | { id: "modules"; courseId: string; page: number }
  | { id: "lessons"; courseId: string; moduleId: string; page: number }
  | { id: "lesson"; ref: LessonRef }
  | { id: "mine"; page: number }
  | { id: "progress"; page: number }
  | { id: "help"; page: number };

type PagedScreen = Extract<UssdScreen, { page: number }>;

export type CallRequest = LessonRef & { mode: "lesson" | "assessment"; resumeAt: number };

export type UssdSession = {
  id: string;
  phone: string;
  caller: Caller | null;
  lang: PhoneLanguage;
  screen: UssdScreen;
  history: UssdScreen[];
  status: "active" | "ended" | "expired";
  endText: string;
  notice: string;
  call: CallRequest | null;
  startedAt: number;
  lastInputAt: number;
  steps: string[];
};

type Go = { to: UssdScreen } | { call: CallRequest } | { lang: PhoneLanguage } | { end: true } | { back: true };
type Choice = { key: string; label: string; go: Go };
export type UssdView = { text: string; choices: Choice[] };
export type UssdEffect = { kind: "language"; lang: PhoneLanguage } | { kind: "call"; request: CallRequest } | { kind: "ended"; reason: "exit" | "call" | "timeout" };

const words = {
  rw: {
    main: ["Amasomo y'ubuhinzi", "Amasomo yanjye", "Aho ngeze niga", "Guhindura ururimi", "Gufasha"],
    choose: "Hitamo:",
    crop: "Hitamo igihingwa:",
    crops: { tomato: "Inyanya", cabbage: "Amashu", carrot: "Karoti" } as Record<CropSlug, string>,
    coursesOf: { tomato: "Amasomo y'inyanya:", cabbage: "Amasomo y'amashu:", carrot: "Amasomo ya karoti:" } as Record<CropSlug, string>,
    none: "Nta masomo arasohoka kuri iki gihingwa.",
    back: "Subira inyuma",
    home: "Ahabanza",
    exit: "Sohoka",
    more: "Ibikurikira",
    modules: "Reba ibice",
    start: "Tangira kwiga",
    resume: "Komeza kwiga",
    again: "Subiramo isomo rya mbere",
    quiz: "Isuzumabumenyi",
    parts: (m: number, l: number) => `Ibice ${m} | Amasomo ${l}`,
    done: (d: number, t: number) => `Warangije: ${d}/${t}`,
    score: (s: number) => `Amanota ya nyuma: ${s}%`,
    doneMark: "* = warangije",
    minutes: (m: number) => `Iminota ${m}`,
    listen: "Tangira kumva isomo",
    listenFrom: (t: string) => `Komeza aho wari ugeze (${t})`,
    restart: "Tangira bushya",
    noAudio: "Iri somo ntirirabona ijwi. Hitamo irindi.",
    gone: "Iri somo ntirikiboneka.",
    noMine: "Nta masomo wiyandikishijemo. Hitamo 1 ku rutonde rukuru.",
    progress: "Aho ngeze niga:",
    total: (d: number, t: number) => `Muri rusange: ${d}/${t}`,
    noProgress: "Nta somo uratangira.",
    invalid: "Igisubizo ntikizwi. Ongera ugerageze.",
    calling: "Murakoze. MenyaMuhinzi iraguhamagara mu kanya kugira ngo wumve isomo.",
    callingQuiz: "Murakoze. MenyaMuhinzi iraguhamagara mu kanya ku isuzumabumenyi.",
    bye: "Murakoze gukoresha MenyaMuhinzi. Mwirirwe!",
    timeout: "Igihe cyashize. Ongera ukande *675# utangire.",
    help: [
      "Gufasha 1/4: Andika umubare w'icyo uhisemo, wohereze. 0 = subira inyuma. 00 = ahabanza.",
      "Gufasha 2/4: Hitamo igihingwa, isomo, igice n'isomo rito. Kanda 1: MenyaMuhinzi iraguhamagara wumve isomo.",
      "Gufasha 3/4: Mu guhamagarwa: 1 hagarika/komeza, 0 subiramo, 2 iryabanje, 3 irikurikira, 8 baza, 9 isuzuma, # soza.",
      "Gufasha 4/4: Ufite ikibazo? Vugana n'umufashamyumvire wawe. Igihe nigishira, ongera ukande *675#.",
    ],
  },
  en: {
    main: ["Farming courses", "My courses", "My progress", "Change language", "Help"],
    choose: "Choose:",
    crop: "Choose a crop:",
    crops: { tomato: "Tomatoes", cabbage: "Cabbages", carrot: "Carrots" } as Record<CropSlug, string>,
    coursesOf: { tomato: "Tomato courses:", cabbage: "Cabbage courses:", carrot: "Carrot courses:" } as Record<CropSlug, string>,
    none: "No published courses for this crop yet.",
    back: "Back",
    home: "Main menu",
    exit: "Exit",
    more: "More",
    modules: "View modules",
    start: "Start learning",
    resume: "Continue learning",
    again: "Replay the first lesson",
    quiz: "Assessment",
    parts: (m: number, l: number) => `Modules ${m} | Lessons ${l}`,
    done: (d: number, t: number) => `Completed: ${d}/${t}`,
    score: (s: number) => `Last score: ${s}%`,
    doneMark: "* = completed",
    minutes: (m: number) => `${m} minutes`,
    listen: "Start listening",
    listenFrom: (t: string) => `Continue from ${t}`,
    restart: "Start again",
    noAudio: "This lesson has no audio yet. Choose another.",
    gone: "This course is no longer available.",
    noMine: "You are not enrolled yet. Choose 1 on the main menu.",
    progress: "My progress:",
    total: (d: number, t: number) => `Overall: ${d}/${t}`,
    noProgress: "You have not started a course yet.",
    invalid: "Invalid choice. Please try again.",
    calling: "Thank you. MenyaMuhinzi will call you shortly to play the lesson.",
    callingQuiz: "Thank you. MenyaMuhinzi will call you shortly for the assessment.",
    bye: "Thank you for using MenyaMuhinzi.",
    timeout: "Session timed out. Dial *675# to start again.",
    help: [
      "Help 1/4: Type the number of your choice and send. 0 = back. 00 = main menu.",
      "Help 2/4: Choose a crop, course, module and lesson. Press 1 and MenyaMuhinzi calls you to play it.",
      "Help 3/4: During the call: 1 pause/resume, 0 repeat, 2 previous, 3 next, 8 ask, 9 assessment, # end.",
      "Help 4/4: Need help? Contact your facilitator. If the session times out, dial *675# again.",
    ],
  },
};

export const identificationMessages: Record<Exclude<Identification["kind"], "ok">, string> = {
  missing: "Ntitwabashije kubona nimero yawe. Ongera ugerageze.\nWe could not read your number.",
  unregistered: "Iyi nimero ntiyanditswe kuri MenyaMuhinzi. Saba umufashamyumvire kukwandikisha.\nThis number is not registered.",
  inactive: "Konti yawe ntikora ubu. Vugana n'ubuyobozi bwa MenyaMuhinzi.\nYour account is not active.",
  duplicate: "Iyi nimero ifite konti zirenze imwe. Vugana n'ubuyobozi.\nThis number is linked to several accounts.",
  other_channel: "Iyi nimero yanditswe nk'ukoresha telefoni igezweho. Saba ubuyobozi kuyihindura.\nRegistered for the smartphone app.",
  no_profile: "Umwirondoro wawe w'imyigire ntubonetse. Vugana n'ubuyobozi.\nLearner profile not found.",
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 2).trimEnd()}..` : text);
export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function compose(head: string[], choices: Choice[]) {
  return [...head.filter(Boolean), ...choices.map((choice) => `${choice.key}. ${choice.label}`)].join("\n");
}

/** Splits a list into pages that fit the USSD character limit, at most 8 numbered items per page. */
function paged(head: string[], items: { label: string; go: Go }[], screen: PagedScreen, lang: PhoneLanguage, footer: Choice[]): UssdView {
  const more = (page: number): Choice => ({ key: "9", label: words[lang].more, go: { to: { ...screen, page } } });
  const ranges: [number, number][] = [];
  let start = 0;
  while (start < items.length) {
    let end = start;
    while (end < items.length && end - start < 8) {
      const slice = items.slice(start, end + 1).map((item, i) => ({ key: String(i + 1), ...item }));
      const tail = end + 1 < items.length ? [more(0)] : [];
      if (compose(head, [...slice, ...tail, ...footer]).length > USSD_MAX_CHARS && end > start) break;
      end += 1;
    }
    ranges.push([start, end]);
    start = end;
  }
  const page = Math.min(screen.page, Math.max(ranges.length - 1, 0));
  const [from, to] = ranges[page] ?? [0, 0];
  const choices = [...items.slice(from, to).map((item, i) => ({ key: String(i + 1), ...item })), ...(to < items.length ? [more(page + 1)] : []), ...footer];
  return { text: compose(head, choices), choices };
}

export function renderUssd(session: UssdSession, state: LearningState): UssdView {
  const t = words[session.lang];
  const screen = session.screen;
  const learnerId = session.caller?.learnerId ?? "";
  const back: Choice = { key: "0", label: t.back, go: { back: true } };
  const home: Choice = { key: "00", label: t.home, go: { to: { id: "main" } } };
  const notice = session.notice ? [session.notice] : [];
  const finish = (head: string[], choices: Choice[]): UssdView => ({ text: compose([...notice, ...head], choices), choices });
  const list = (head: string[], items: { label: string; go: Go }[], current: PagedScreen, footer: Choice[]) => paged([...notice, ...head], items, current, session.lang, footer);

  switch (screen.id) {
    case "lang": {
      const first = session.caller?.name.split(" ").at(-1) ?? "";
      const enabled = getAdminState().channels.ussdLanguages;
      const offered = ([{ lang: "rw", label: "Kinyarwanda" }, { lang: "en", label: "English" }] as const).filter((item) => item.lang === "rw" || enabled.includes(item.lang));
      return finish([`Murakaza neza kuri MenyaMuhinzi${first ? `, ${first}` : ""}.`, "Hitamo ururimi / Choose language:"], offered.map((item, index) => ({ key: String(index + 1), label: item.label, go: { lang: item.lang } })));
    }
    case "main":
      return finish(["MenyaMuhinzi", t.choose], [
        { key: "1", label: t.main[0]!, go: { to: { id: "crops" } } },
        { key: "2", label: t.main[1]!, go: { to: { id: "mine", page: 0 } } },
        { key: "3", label: t.main[2]!, go: { to: { id: "progress", page: 0 } } },
        { key: "4", label: t.main[3]!, go: { to: { id: "lang" } } },
        { key: "5", label: t.main[4]!, go: { to: { id: "help", page: 0 } } },
        { key: "0", label: t.exit, go: { end: true } },
      ]);
    case "crops":
      return finish([t.crop], [...crops.map((crop, i) => ({ key: String(i + 1), label: t.crops[crop.slug], go: { to: { id: "courses", crop: crop.slug, page: 0 } } as Go })), back]);
    case "courses": {
      const items = publishedCourses(state, learnerId).filter((course) => course.crop === screen.crop).map((course) => ({ label: clip(course.title, 34), go: { to: { id: "course", courseId: course.id } } as Go }));
      if (!items.length) return finish([t.none], [back, home]);
      return list([t.coursesOf[screen.crop]], items, screen, [back, home]);
    }
    case "course": {
      const course = publishedCourses(state, learnerId).find((item) => item.id === screen.courseId);
      if (!course) return finish([t.gone], [back, home]);
      const standing = courseStanding(state, learnerId, course);
      const enrolled = enrolledCourses(state, learnerId).some((item) => item.id === course.id);
      const first = lessonRefs(course)[0];
      const target = standing.next ?? (first ? { courseId: first.courseId, moduleId: first.moduleId, lessonId: first.lessonId } : null);
      const started = standing.done > 0 || state.progress.some((item) => item.learnerId === learnerId && item.courseId === course.id);
      const choices: Choice[] = [{ key: "1", label: t.modules, go: { to: { id: "modules", courseId: course.id, page: 0 } } }];
      if (target) choices.push({ key: "2", label: standing.next ? (started ? t.resume : t.start) : t.again, go: { to: { id: "lesson", ref: target } } });
      if (target && questionsForCourse(state, course.id).length) choices.push({ key: "3", label: t.quiz, go: { call: { ...target, mode: "assessment", resumeAt: 0 } } });
      return finish([clip(course.title, 40), t.parts(course.modules.length, standing.total), enrolled ? t.done(standing.done, standing.total) : "", standing.lastScore !== null ? t.score(standing.lastScore) : ""], [...choices, back, home]);
    }
    case "modules": {
      const course = publishedCourses(state, learnerId).find((item) => item.id === screen.courseId);
      if (!course) return finish([t.gone], [back, home]);
      const items = course.modules.map((module) => {
        const done = module.lessons.filter((lesson) => lessonRecord(state, learnerId, lesson.id)?.status === "completed").length;
        return { label: `${clip(module.title, 26)} (${done}/${module.lessons.length})`, go: { to: { id: "lessons", courseId: course.id, moduleId: module.id, page: 0 } } as Go };
      });
      return list([clip(course.title, 34)], items, screen, [back, home]);
    }
    case "lessons": {
      const course = publishedCourses(state, learnerId).find((item) => item.id === screen.courseId);
      const module = course?.modules.find((item) => item.id === screen.moduleId);
      if (!course || !module) return finish([t.gone], [back, home]);
      const items = module.lessons.map((lesson) => ({
        label: `${lessonRecord(state, learnerId, lesson.id)?.status === "completed" ? "*" : ""}${clip(lesson.title, 30)}`,
        go: { to: { id: "lesson", ref: { courseId: course.id, moduleId: module.id, lessonId: lesson.id } } } as Go,
      }));
      return list([clip(module.title, 34), t.doneMark], items, screen, [back, home]);
    }
    case "lesson": {
      const { course, lesson } = findLesson(state, screen.ref);
      if (!course || course.status !== "published" || !lesson) return finish([t.gone], [back, home]);
      const record = lessonRecord(state, learnerId, lesson.id);
      const head = [`${clip(lesson.title, 40)}${record?.status === "completed" ? " *" : ""}`, clip(lesson.summary, 64), t.minutes(lesson.durationMinutes)];
      if (!lesson.narration.trim() && !lesson.body.trim()) return finish([...head, t.noAudio], [back, home]);
      const position = record?.status === "in_progress" ? record.positionSec ?? 0 : 0;
      const choices: Choice[] = position > 5
        ? [{ key: "1", label: t.listenFrom(clock(position)), go: { call: { ...screen.ref, mode: "lesson", resumeAt: position } } }, { key: "2", label: t.restart, go: { call: { ...screen.ref, mode: "lesson", resumeAt: 0 } } }]
        : [{ key: "1", label: t.listen, go: { call: { ...screen.ref, mode: "lesson", resumeAt: 0 } } }];
      return finish(head, [...choices, back]);
    }
    case "mine": {
      const items = enrolledCourses(state, learnerId).map((course) => {
        const standing = courseStanding(state, learnerId, course);
        return { label: `${clip(course.title, 24)} ${standing.done}/${standing.total}`, go: { to: { id: "course", courseId: course.id } } as Go };
      });
      if (!items.length) return finish([t.noMine], [back, home]);
      return list([t.main[1]!], items, screen, [back, home]);
    }
    case "progress": {
      const courses = enrolledCourses(state, learnerId);
      if (!courses.length) return finish([t.progress, t.noProgress], [back, home]);
      const standings = courses.map((course) => ({ course, standing: courseStanding(state, learnerId, course) }));
      const done = standings.reduce((sum, item) => sum + item.standing.done, 0);
      const total = standings.reduce((sum, item) => sum + item.standing.total, 0);
      const items = standings.map(({ course, standing }) => ({ label: `${clip(course.title, 22)}: ${standing.done}/${standing.total}`, go: { to: { id: "course", courseId: course.id } } as Go }));
      return list([t.progress, t.total(done, total)], items, screen, [back, home]);
    }
    case "help": {
      const pages = t.help;
      const page = Math.min(screen.page, pages.length - 1);
      const more: Choice[] = page < pages.length - 1 ? [{ key: "9", label: t.more, go: { to: { id: "help", page: page + 1 } } }] : [];
      return finish([pages[page]!], [...more, back, home]);
    }
  }
}

export function startUssd(identification: Identification, phone: string, now = Date.now()): UssdSession {
  const base = { id: `ussd-${now.toString(36)}`, phone, history: [], notice: "", call: null, startedAt: now, lastInputAt: now, steps: [USSD_CODE] };
  if (identification.kind !== "ok") {
    return { ...base, caller: null, lang: "rw", screen: { id: "main" }, status: "ended", endText: identificationMessages[identification.kind] };
  }
  return { ...base, caller: identification.caller, lang: identification.caller.language, screen: { id: "lang" }, status: "active", endText: "" };
}

export function isExpired(session: UssdSession, now = Date.now()) {
  return session.status === "active" && now - session.lastInputAt > ussdIdleMs();
}

export function expireUssd(session: UssdSession): UssdSession {
  return { ...session, status: "expired", endText: words[session.lang].timeout };
}

export function respondUssd(session: UssdSession, rawInput: string, state: LearningState, now = Date.now()): { session: UssdSession; effects: UssdEffect[] } {
  if (session.status !== "active") return { session, effects: [] };
  if (isExpired(session, now)) return { session: expireUssd(session), effects: [{ kind: "ended", reason: "timeout" }] };
  const input = rawInput.trim();
  const t = words[session.lang];
  const touched = { ...session, lastInputAt: now, notice: "", steps: [...session.steps, input] };
  if (input === "00" && session.screen.id !== "lang") return { session: { ...touched, screen: { id: "main" }, history: [] }, effects: [] };
  const choice = renderUssd({ ...session, notice: "" }, state).choices.find((item) => item.key === input);
  if (!choice) return { session: { ...touched, notice: t.invalid }, effects: [] };
  const go = choice.go;
  if ("back" in go) {
    const previous = session.history.at(-1);
    return { session: { ...touched, screen: previous ?? { id: "main" }, history: session.history.slice(0, -1) }, effects: [] };
  }
  if ("end" in go) return { session: { ...touched, status: "ended", endText: t.bye }, effects: [{ kind: "ended", reason: "exit" }] };
  if ("lang" in go) return { session: { ...touched, lang: go.lang, screen: { id: "main" }, history: [] }, effects: [{ kind: "language", lang: go.lang }] };
  if ("call" in go) {
    const text = go.call.mode === "assessment" ? t.callingQuiz : t.calling;
    return { session: { ...touched, status: "ended", endText: text, call: go.call }, effects: [{ kind: "call", request: go.call }, { kind: "ended", reason: "call" }] };
  }
  return { session: { ...touched, screen: go.to, history: [...session.history, session.screen] }, effects: [] };
}
