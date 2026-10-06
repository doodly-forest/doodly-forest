import { speechSchema } from "@/src/lib/story-schema";
import { TIMEOUTS } from "@/src/lib/story-config";
import { ApiFailure } from "@/src/lib/server/api-errors";
import { generateSpeech } from "@/src/lib/server/generate-speech";
import { handleRequest, readJson } from "@/src/lib/server/request-utils";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleRequest(request, TIMEOUTS.speechServer, async (context) => {
    const parsed = speechSchema.safeParse(await readJson(request, context.signal));
    if (!parsed.success) throw new ApiFailure("INVALID_INPUT");
    const audio = await generateSpeech(parsed.data.text, context.signal, (stage) => { context.stage = stage; });
    return new Response(audio.bytes, { headers: { "Content-Type": audio.contentType } });
  });
}
