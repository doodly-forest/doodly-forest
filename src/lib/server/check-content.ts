import "server-only";
import { TIMEOUTS } from "../story-config";
import { withDeadline } from "../deadline";
import { openAI } from "./openai-client";
import { aiProvider, modelSetting, type AIProvider } from "./provider-config";
import { checkGeminiContent } from "./gemini-generation";
import { ApiFailure, safeFailure } from "./api-errors";

export async function checkContent(text: string, signal: AbortSignal, provider: AIProvider = aiProvider()) {
  try {
    if (provider === "gemini") return await checkGeminiContent(text, signal);
    const client = openAI();
    const result = await withDeadline(signal, TIMEOUTS.moderation, (stageSignal) => client.moderations.create({
      model: modelSetting("OPENAI_MODERATION_MODEL", "omni-moderation-latest"), input: text,
    }, { signal: stageSignal, timeout: TIMEOUTS.moderation }));
    if (!Array.isArray(result.results) || result.results.length !== 1 || typeof result.results[0].flagged !== "boolean") throw new ApiFailure("CONTENT_CHECK_UNAVAILABLE", "CONTENT_VERDICT_INVALID");
    if (result.results[0].flagged) throw new ApiFailure("CONTENT_BLOCKED");
  } catch (error) {
    const failure = safeFailure(error);
    if (failure.code === "GENERATION_TIMEOUT") throw new ApiFailure("CONTENT_CHECK_UNAVAILABLE", "CONTENT_CHECK_TIMEOUT");
    if (failure.code === "UPSTREAM_UNAVAILABLE") throw new ApiFailure("CONTENT_CHECK_UNAVAILABLE", "CONTENT_CHECK_UPSTREAM_FAILURE");
    throw failure;
  }
}
