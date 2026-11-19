import type { ContentLanguage, CourseStatus, CropSlug, LessonFormat } from "@/lib/mock/types";

export const crops: { slug: CropSlug; name_rw: string; name_en: string; sort_order: number }[] = [
  { slug: "tomato", name_rw: "Inyanya", name_en: "Tomato", sort_order: 1 },
  { slug: "cabbage", name_rw: "Amashu", name_en: "Cabbage", sort_order: 2 },
  { slug: "carrot", name_rw: "Karoti", name_en: "Carrot", sort_order: 3 },
];

export const cropOf = (slug: CropSlug) => crops.find((crop) => crop.slug === slug)!;

export const levels = ["Intangiriro", "Hagati", "Abamaze kumenya"];

export const languageNames: Record<ContentLanguage, string> = { rw: "Kinyarwanda", en: "English", fr: "Français" };

export const statusLabels: Record<CourseStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export const formatLabels: Record<LessonFormat, string> = { reading: "Reading", video: "Video", audio: "Audio" };

export const provinces: Record<string, string[]> = {
  "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Northern Province": ["Musanze", "Burera", "Gakenke"],
  "Southern Province": ["Huye", "Nyanza", "Muhanga"],
  "Western Province": ["Rubavu", "Karongi", "Rusizi"],
  "Eastern Province": ["Nyagatare", "Kayonza", "Rwamagana"],
};
