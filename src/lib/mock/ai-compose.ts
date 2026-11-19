import { cropFacts, moduleBank, pickFarmer } from "@/lib/mock/ai-content";
import { cropOf } from "@/lib/mock/crops";
import type { GeneratedCourse, GeneratedLesson, GeneratedModule, GenerationInput } from "@/lib/mock/types";

const topicStarts: [RegExp, number][] = [
  [/indwara|udukoko|disease|pest/i, 3],
  [/gusarura|kubika|harvest|storage/i, 4],
  [/isoko|kugurisha|market|inyungu/i, 5],
  [/ingemwe|imbuto|kubiba|seed/i, 1],
  [/kuhira|amazi|izuba|water|irrigation/i, 2],
];

function firstModule(input: GenerationInput) {
  const text = `${input.topic} ${input.description} ${input.instructions}`;
  return topicStarts.find(([pattern]) => pattern.test(text))?.[1] ?? 0;
}

const lessonsPerModule = (level: string) => (level === "Abamaze kumenya" ? 3 : 2);

export function composeLesson(input: GenerationInput, bankIndex: number, lessonIndex: number, variant = 0): GeneratedLesson {
  const bank = moduleBank[bankIndex % moduleBank.length]!;
  const template = bank.lessons[(lessonIndex + variant) % bank.lessons.length]!;
  const base = template(cropFacts[input.crop], pickFarmer(bankIndex + lessonIndex + variant));
  const narration = `Muraho muhinzi! Uyu munsi turiga isomo ryitwa "${base.title}". ${base.body} Urugero: ${base.example} Ibyo kwibuka: ${base.keyPoints.join(", ")}. Kanda 0 kugira ngo wumve isomo bundi bushya.`;
  return {
    ...base,
    durationMinutes: input.level === "Intangiriro" ? 8 : 12,
    narration,
    ussdText: `${base.title}: ${base.keyPoints.join("; ")}`.slice(0, 160),
  };
}

export function composeModule(input: GenerationInput, moduleIndex: number, variant = 0): GeneratedModule {
  const bankIndex = (firstModule(input) + moduleIndex + variant) % moduleBank.length;
  const bank = moduleBank[bankIndex]!;
  return {
    bankIndex,
    title: bank.title,
    description: bank.description,
    lessons: Array.from({ length: lessonsPerModule(input.level) }, (_, lessonIndex) => composeLesson(input, bankIndex, lessonIndex)),
  };
}

export function composeCourse(input: GenerationInput, variant = 0): GeneratedCourse {
  const crop = cropOf(input.crop);
  const count = Math.min(Math.max(input.moduleCount, 1), 6);
  const modules = Array.from({ length: count }, (_, index) => composeModule(input, index));
  if (variant) modules.forEach((module, index) => { module.lessons = module.lessons.map((_, lessonIndex) => composeLesson(input, module.bankIndex, lessonIndex, variant + index)); });
  const title = input.topic.trim() || `Ubuhinzi bwa ${crop.name_rw.toLowerCase()}: ${modules[0]?.title.toLowerCase() ?? "intangiriro"}`;
  const objectives = input.objectives.length ? input.objectives : [...new Set(modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.objectives)))].slice(0, 4);
  const intro = variant % 2 === 0 ? "Iri somo rifasha umuhinzi kumenya" : "Muri iri somo, umuhinzi aziga";
  return {
    title,
    description: input.description.trim() || `${intro} ${modules.map((module) => module.title.toLowerCase()).join(", ")} ku ${crop.name_rw.toLowerCase()}, mu Kinyarwanda cyoroshye n'ingero zo mu Rwanda.`,
    objectives,
    outline: modules.map((module, index) => `${index + 1}. ${module.title} — ${module.lessons.map((lesson) => lesson.title).join(", ")}`),
    modules,
    resources: [
      `Amafoto y'umurima wa ${crop.name_rw.toLowerCase()} mu bihe bitandukanye byo gukura`,
      "Amabwiriza ya RAB ku buhinzi bw'imboga",
      "Ijwi ry'isomo mu Kinyarwanda ku bahinzi bakoresha telefoni zisanzwe",
      ...(input.instructions.trim() ? [`Icyitonderwa: ${input.instructions.trim()}`] : []),
    ],
  };
}
