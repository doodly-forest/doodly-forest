import "server-only";
import OpenAI from "openai";
import { ApiError as GeminiApiError } from "@google/genai";
import { hasErrorName } from "../deadline";

const errors = {
  INVALID_INPUT: [400, "선택값이나 요청 내용을 확인해주세요.", false],
  FORBIDDEN_ORIGIN: [403, "허용하지 않은 요청이에요. 로컬 페이지에서 다시 시도해주세요.", false],
  PAYLOAD_TOO_LARGE: [413, "요청 내용이 너무 길어요.", false],
  UNSUPPORTED_MEDIA_TYPE: [415, "JSON 형식의 요청만 사용할 수 있어요.", false],
  CONTENT_BLOCKED: [422, "이 내용은 제공하기 어려워요. 다른 동화를 만들어주세요.", false],
  API_RATE_LIMITED: [429, "API 요청 한도에 도달했어요. 잠시 뒤 또는 한도 초기화 후 다시 시도해주세요.", true],
  INVALID_AI_RESPONSE: [502, "올바른 동화를 받지 못했어요. 다시 만들어주세요.", true],
  INVALID_AUDIO_RESPONSE: [502, "올바른 음성을 받지 못했어요. 음성을 다시 준비해주세요.", true],
  API_NOT_CONFIGURED: [503, "서버의 API 키·모델·목소리 설정과 접근 권한을 확인해주세요.", false],
  API_QUOTA_EXCEEDED: [503, "API 사용 한도와 결제 설정을 확인해주세요.", false],
  CONTENT_CHECK_UNAVAILABLE: [503, "내용 확인을 완료하지 못했어요. 잠시 뒤 다시 시도해주세요.", true],
  UPSTREAM_UNAVAILABLE: [503, "외부 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도해주세요.", true],
  GENERATION_TIMEOUT: [504, "요청 시간이 초과됐어요. 잠시 뒤 다시 시도해주세요.", true],
  REQUEST_CANCELLED: [499, "요청이 취소됐어요.", false],
} as const;
export type ErrorCode = keyof typeof errors;
// Internal, fixed identifiers only. Never copy provider text into diagnostics.
export type FailureReason = "RESPONSE_MAX_TOKENS" | "RESPONSE_INCOMPLETE" | "RESPONSE_MISSING_CANDIDATE"
  | "RESPONSE_INVALID_PARTS" | "RESPONSE_INVALID_JSON" | "CONTENT_VERDICT_INVALID"
  | "CONTENT_CHECK_TIMEOUT" | "CONTENT_CHECK_UPSTREAM_FAILURE";
export class ApiFailure extends Error {
  readonly status: number;
  readonly retryable: boolean;
  constructor(readonly code: ErrorCode, readonly reason?: FailureReason) {
    const [status, message, retryable] = errors[code];
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}
export function safeFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error;
  if (error instanceof OpenAI.APIConnectionTimeoutError || hasErrorName(error, "TimeoutError")) return new ApiFailure("GENERATION_TIMEOUT");
  if (error instanceof OpenAI.APIUserAbortError || hasErrorName(error, "AbortError")) return new ApiFailure("REQUEST_CANCELLED");
  if (error instanceof GeminiApiError) {
    if (error.status === 429) return new ApiFailure("API_RATE_LIMITED");
    if ([400, 401, 403, 404].includes(error.status)) return new ApiFailure("API_NOT_CONFIGURED");
    if ([408, 504].includes(error.status)) return new ApiFailure("GENERATION_TIMEOUT");
  }
  if (error instanceof OpenAI.APIError) {
    if (error.code === "insufficient_quota" || error.code === "billing_hard_limit_reached") return new ApiFailure("API_QUOTA_EXCEEDED");
    if (error.status === 429) return new ApiFailure("API_RATE_LIMITED");
    if ([400, 401, 403, 404].includes(error.status ?? 0)) return new ApiFailure("API_NOT_CONFIGURED");
  }
  return new ApiFailure("UPSTREAM_UNAVAILABLE");
}
