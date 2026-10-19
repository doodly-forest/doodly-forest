import { z } from "zod";
import { characterById } from "./story-options";
import { STORY_LIMITS } from "./story-config";
import { narrationText, type StoryContent } from "./story-text";
export const selectionSchema = z.object({
  world: z.enum(["dinosaur", "vehicle"]),
  characterIds: z.array(z.string()).min(1).max(2),
  theme: z.enum(["family", "friendship", "kindness", "courage", "habits"]),
  targetSeconds: z.union([z.literal(60), z.literal(120)]),
  language: z.enum(["ko", "en"]).default("ko"),
}).strict().refine((s) => new Set(s.characterIds).size === s.characterIds.length &&
  s.characterIds.every((id) => characterById(id)?.world === s.world));
export const contentSchema = z.object({
  title: z.string().trim().min(1).max(STORY_LIMITS.title),
  paragraphs: z.array(z.string().trim().min(1)).min(STORY_LIMITS.minParagraphs).max(STORY_LIMITS.maxParagraphs),
}).strict().refine((content) => narrationText(content).length <= STORY_LIMITS.narration);
export const speechSchema = z.object({
  text: z.string().trim().min(1).max(STORY_LIMITS.narration),
  language: z.enum(["ko", "en"]).default("ko"),
}).strict();
// English stories carry a Korean explanation with one paragraph per English paragraph.
export const translationSchema = z.object({ title: z.string(), paragraphs: z.array(z.string()) }).strict();
export function validTranslation(content: StoryContent, translation: StoryContent) {
  return contentSchema.safeParse(translation).success && translation.paragraphs.length === content.paragraphs.length;
}
export const storySchema = z.object({
  id: z.string().uuid(), title: z.string(), paragraphs: z.array(z.string()),
  translation: translationSchema.optional(),
  narrationText: z.string(), selection: selectionSchema,
}).strict().refine((s) => contentSchema.safeParse({ title: s.title, paragraphs: s.paragraphs }).success && s.narrationText === narrationText(s) &&
  (s.selection.language === "en" ? !!s.translation && validTranslation(s, s.translation) : !s.translation));
export const storyResponseSchema = z.object({ requestId: z.string(), story: storySchema }).strict();
export type Story = z.infer<typeof storySchema>;
export type ApiError = { code: string; message: string; retryable: boolean; requestId?: string };
