import { z } from "zod";
import { characterById } from "./story-options";
import { STORY_LIMITS } from "./story-config";
import { narrationText } from "./story-text";
export const selectionSchema = z.object({
  world: z.literal("dinosaur"),
  characterIds: z.array(z.string()).min(1).max(2),
  theme: z.enum(["family", "friendship", "kindness", "courage", "habits"]),
  targetSeconds: z.union([z.literal(60), z.literal(120)]),
}).strict().refine((s) => new Set(s.characterIds).size === s.characterIds.length &&
  s.characterIds.every((id) => characterById(id)?.world === s.world));
export const contentSchema = z.object({
  title: z.string().trim().min(1).max(STORY_LIMITS.title),
  paragraphs: z.array(z.string().trim().min(1)).min(STORY_LIMITS.minParagraphs).max(STORY_LIMITS.maxParagraphs),
}).strict().refine((content) => narrationText(content).length <= STORY_LIMITS.narration);
export const speechSchema = z.object({ text: z.string().trim().min(1).max(STORY_LIMITS.narration) }).strict();
export const storySchema = z.object({
  id: z.string().uuid(), title: z.string(), paragraphs: z.array(z.string()),
  narrationText: z.string(), selection: selectionSchema,
}).strict().refine((s) => contentSchema.safeParse({ title: s.title, paragraphs: s.paragraphs }).success && s.narrationText === narrationText(s));
export const storyResponseSchema = z.object({ requestId: z.string(), story: storySchema }).strict();
export type Story = z.infer<typeof storySchema>;
export type ApiError = { code: string; message: string; retryable: boolean; requestId?: string };
