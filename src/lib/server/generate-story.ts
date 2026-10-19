import "server-only";
import { randomUUID } from "node:crypto";
import { TIMEOUTS } from "../story-config";
import { characterById, storyNames, type Selection } from "../story-options";
import { z } from "zod";
import { contentSchema, validTranslation, type Story } from "../story-schema";
import { narrationText, type StoryContent } from "../story-text";
import { withDeadline } from "../deadline";
import { openAI } from "./openai-client";
import { aiProvider, modelSetting } from "./provider-config";
import { ApiFailure } from "./api-errors";
import { checkContent } from "./check-content";
import { generateGeminiStory } from "./gemini-generation";
import { storyInput, storyInstructions, storyJsonSchema } from "./story-prompt";

async function generateOpenAIStory(selection: Selection, signal: AbortSignal): Promise<unknown> {
  const client = openAI();
  const result = await withDeadline(signal, TIMEOUTS.text, (stageSignal) => client.responses.create({
    model: modelSetting("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
    store: false,
    instructions: storyInstructions(selection.language),
    input: [{ role: "user", content: storyInput(selection) }],
    max_output_tokens: 4000,
    text: { format: { type: "json_schema", name: "story", strict: true, schema: storyJsonSchema(selection.language) } },
  }, { signal: stageSignal, timeout: TIMEOUTS.text }));
  if (result.output?.some((item) => item.type === "message" && item.content.some((part) => part.type === "refusal"))) throw new ApiFailure("CONTENT_BLOCKED");
  if (result.status !== "completed" || !result.output_text) throw new ApiFailure("INVALID_AI_RESPONSE");
  try { return JSON.parse(result.output_text); } catch { throw new ApiFailure("INVALID_AI_RESPONSE"); }
}

const hangul = /[\u3131-\u318e\uac00-\ud7a3]/;
const englishRawSchema = z.object({ title: z.unknown(), paragraphs: z.unknown(), koreanTitle: z.unknown(), koreanParagraphs: z.unknown() }).strict();

function namesAppear(content: StoryContent, selection: Selection, language: Selection["language"]) {
  const body = content.paragraphs.join("\n").toLowerCase();
  return selection.characterIds.every((id) => body.includes(storyNames(characterById(id)!, language).name.toLowerCase()));
}

function parseContent(raw: unknown, selection: Selection): { content: StoryContent; translation?: StoryContent } {
  if (selection.language === "ko") {
    const parsed = contentSchema.safeParse(raw);
    if (!parsed.success || !namesAppear(parsed.data, selection, "ko")) throw new ApiFailure("INVALID_AI_RESPONSE");
    return { content: parsed.data };
  }
  const fields = englishRawSchema.safeParse(raw);
  if (!fields.success) throw new ApiFailure("INVALID_AI_RESPONSE");
  const content = contentSchema.safeParse({ title: fields.data.title, paragraphs: fields.data.paragraphs });
  const translation = contentSchema.safeParse({ title: fields.data.koreanTitle, paragraphs: fields.data.koreanParagraphs });
  if (!content.success || !translation.success || !validTranslation(content.data, translation.data)) throw new ApiFailure("INVALID_AI_RESPONSE");
  // The story must stay English and its explanation must actually be Korean.
  if (hangul.test(narrationText(content.data)) || !hangul.test(narrationText(translation.data))) throw new ApiFailure("INVALID_AI_RESPONSE");
  if (!namesAppear(content.data, selection, "en") || !namesAppear(translation.data, selection, "ko")) throw new ApiFailure("INVALID_AI_RESPONSE");
  return { content: content.data, translation: translation.data };
}

export async function generateStory(selection: Selection, signal: AbortSignal, stage: (name: string) => void): Promise<Story> {
  const provider = aiProvider();
  stage("story");
  const raw = provider === "gemini"
    ? await generateGeminiStory(selection, signal)
    : await generateOpenAIStory(selection, signal);
  const { content, translation } = parseContent(raw, selection);
  const text = narrationText(content);
  stage("moderation");
  // The Korean explanation is shown to readers too, so it is checked with the story.
  await checkContent(translation ? `${text}\n\n${narrationText(translation)}` : text, signal, provider);
  signal.throwIfAborted();
  return { id: randomUUID(), ...content, ...(translation && { translation }), narrationText: text, selection };
}
