import "server-only";
import { TIMEOUTS } from "../story-config";
import { withDeadline } from "../deadline";
import { ApiFailure } from "./api-errors";
import { openAI } from "./openai-client";
import { aiProvider, modelSetting } from "./provider-config";
import { generateGeminiSpeech } from "./gemini-generation";
import { checkContent } from "./check-content";

export async function generateSpeech(text: string, signal: AbortSignal, stage: (name: string) => void) {
  const provider = aiProvider();
  stage("moderation");
  await checkContent(text, signal, provider);
  signal.throwIfAborted();
  stage("speech");
  if (provider === "gemini") return generateGeminiSpeech(text, signal);
  const client = openAI();
  const model = modelSetting("OPENAI_TTS_MODEL", "gpt-4o-mini-tts");
  const voice = modelSetting("OPENAI_TTS_VOICE", "coral");
  return withDeadline(signal, TIMEOUTS.speech, async (stageSignal) => {
    const response = await client.audio.speech.create({
      model, voice, input: text, response_format: "mp3",
      instructions: "쉬운 한국어를 따뜻하고 차분하게 읽어주세요. 과한 감정이나 소리 지르기 없이, 문장 사이를 자연스럽게 쉬며 읽어주세요.",
    }, { signal: stageSignal, timeout: TIMEOUTS.speech });
    if (!response.ok || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "audio/mpeg") throw new ApiFailure("INVALID_AUDIO_RESPONSE");
    const bytes = await response.arrayBuffer();
    stageSignal.throwIfAborted();
    if (!bytes.byteLength) throw new ApiFailure("INVALID_AUDIO_RESPONSE");
    return { bytes, contentType: "audio/mpeg" as const };
  });
}
