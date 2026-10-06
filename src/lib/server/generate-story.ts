import "server-only";
import { randomUUID } from "node:crypto";
import { TIMEOUTS } from "../story-config";
import { characterById, type Selection } from "../story-options";
import { contentSchema, type Story } from "../story-schema";
import { narrationText } from "../story-text";
import { withDeadline } from "../deadline";
import { openAI } from "./openai-client";
import { aiProvider, modelSetting } from "./provider-config";
import { ApiFailure } from "./api-errors";
import { checkContent } from "./check-content";
import { generateGeminiStory } from "./gemini-generation";
import { STORY_INSTRUCTIONS, STORY_JSON_SCHEMA, storyInput } from "./story-prompt";

async function generateOpenAIStory(selection: Selection, signal: AbortSignal): Promise<unknown> {
  const client = openAI();
  const result = await withDeadline(signal, TIMEOUTS.text, (stageSignal) => client.responses.create({
    model: modelSetting("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
    store: false,
    instructions: STORY_INSTRUCTIONS,
    input: [{ role: "user", content: storyInput(selection) }],
    max_output_tokens: 4000,
    text: { format: { type: "json_schema", name: "story", strict: true, schema: STORY_JSON_SCHEMA } },
  }, { signal: stageSignal, timeout: TIMEOUTS.text }));
  if (result.output?.some((item) => item.type === "message" && item.content.some((part) => part.type === "refusal"))) throw new ApiFailure("CONTENT_BLOCKED");
  if (result.status !== "completed" || !result.output_text) throw new ApiFailure("INVALID_AI_RESPONSE");
  try { return JSON.parse(result.output_text); } catch { throw new ApiFailure("INVALID_AI_RESPONSE"); }
}

export async function generateStory(selection: Selection, signal: AbortSignal, stage: (name: string) => void): Promise<Story> {
  const provider = aiProvider();
  stage("story");
  const raw = provider === "gemini"
    ? await generateGeminiStory(selection, signal)
    : await generateOpenAIStory(selection, signal);
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) throw new ApiFailure("INVALID_AI_RESPONSE");
  const content = parsed.data;
  if (!selection.characterIds.every((id) => content.paragraphs.join("\n").includes(characterById(id)!.name))) throw new ApiFailure("INVALID_AI_RESPONSE");
  const text = narrationText(content);
  stage("moderation");
  await checkContent(text, signal, provider);
  signal.throwIfAborted();
  return { id: randomUUID(), ...content, narrationText: text, selection };
}
