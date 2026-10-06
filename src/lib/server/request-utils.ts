import "server-only";
import { randomUUID } from "node:crypto";
import { STORY_LIMITS } from "../story-config";
import { withDeadline } from "../deadline";
import { ApiFailure, safeFailure, type FailureReason } from "./api-errors";

export async function readJson(request: Request, signal: AbortSignal): Promise<unknown> {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next may normalize request.url to localhost even when the browser uses
  // 127.0.0.1. Host is the actual browser authority; do not trust forwarded-host.
  const ownOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if ((origin && origin !== ownOrigin) || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiFailure("FORBIDDEN_ORIGIN");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ApiFailure("UNSUPPORTED_MEDIA_TYPE");
  const declared = Number(request.headers.get("content-length"));
  if (declared > STORY_LIMITS.requestBytes) throw new ApiFailure("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiFailure("INVALID_INPUT");
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > STORY_LIMITS.requestBytes) { cancel(); throw new ApiFailure("PAYLOAD_TOO_LARGE"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new ApiFailure("INVALID_INPUT"); }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

type Context = { requestId: string; signal: AbortSignal; stage: string };
export async function handleRequest(request: Request, timeout: number, work: (context: Context) => Promise<Response>) {
  const requestId = randomUUID();
  const start = Date.now();
  const context: Context = { requestId, signal: request.signal, stage: "input" };
  let code = "OK";
  let reason: FailureReason | undefined;
  let response: Response;
  try {
    response = await withDeadline(request.signal, timeout, async (signal) => {
      context.signal = signal;
      return work(context);
    });
  } catch (error) {
    const failure = safeFailure(error);
    code = failure.code;
    reason = failure.reason;
    response = Response.json({ requestId, error: { code, message: failure.message, retryable: failure.retryable } }, { status: failure.status });
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Request-Id", requestId);
  // Reason is a fixed internal identifier; raw provider responses stay private.
  // elapsedMs covers this entire request, not only its final stage.
  console.info(JSON.stringify({ requestId, stage: context.stage, elapsedMs: Date.now() - start, code, reason }));
  return response;
}
