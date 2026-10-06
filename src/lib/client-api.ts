import { z } from "zod";
import type { ApiError } from "./story-schema";
import { hasErrorName } from "./deadline";

export class ClientFailure extends Error {
  constructor(readonly detail: ApiError) { super(detail.message); }
}
const errorSchema = z.object({
  requestId: z.string(),
  error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }),
});
export async function postJson(path: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal, cache: "no-store",
  });
  if (!response.ok) {
    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) throw new ClientFailure({ ...parsed.data.error, requestId: parsed.data.requestId });
    throw new ClientFailure({ code: "INVALID_RESPONSE", message: "응답을 확인하지 못했어요. 잠시 뒤 다시 시도해주세요.", retryable: true });
  }
  return response;
}
export function clientError(error: unknown): ApiError {
  if (error instanceof ClientFailure) return error.detail;
  if (hasErrorName(error, "TimeoutError")) return { code: "GENERATION_TIMEOUT", message: "요청 시간이 초과됐어요. 잠시 뒤 다시 시도해주세요.", retryable: true };
  return { code: "NETWORK_ERROR", message: "연결을 확인하지 못했어요. 로컬 서버와 인터넷 연결을 확인한 뒤 다시 시도해주세요.", retryable: true };
}
