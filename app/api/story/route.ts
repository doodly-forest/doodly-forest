import { selectionSchema } from "@/src/lib/story-schema";
import { TIMEOUTS } from "@/src/lib/story-config";
import { ApiFailure } from "@/src/lib/server/api-errors";
import { generateStory } from "@/src/lib/server/generate-story";
import { handleRequest, readJson } from "@/src/lib/server/request-utils";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleRequest(request, TIMEOUTS.storyServer, async (context) => {
    const parsed = selectionSchema.safeParse(await readJson(request, context.signal));
    if (!parsed.success) throw new ApiFailure("INVALID_INPUT");
    const story = await generateStory(parsed.data, context.signal, (stage) => { context.stage = stage; });
    return Response.json({ requestId: context.requestId, story });
  });
}
