export type Question = { id: string; label: string; options: string[] };

/** Thumbtack-style quick questions shown on every project. Answers are stored by id. */
export const QUESTIONS: Question[] = [
  { id: "supplies", label: "Who is expected to provide the supplies?", options: ["Homeowner", "Contractor", "Open to either"] },
  { id: "property", label: "What type of property is it?", options: ["House", "Apartment / condo", "Townhouse", "Business"] },
  { id: "timing", label: "How flexible is your timing?", options: ["Must be done by the date", "Within a week of the date", "Flexible"] },
  { id: "stage", label: "Where are you in the hiring process?", options: ["Ready to hire", "Planning & budgeting", "Just comparing prices"] },
];

export type Answers = Record<string, string>;

export function toAnswers(v: unknown): Answers {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "string")) as Answers;
}
