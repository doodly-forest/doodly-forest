import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as storyPost } from "../../app/api/story/route";
import { POST as speechPost } from "../../app/api/speech/route";
import { TIMEOUTS } from "../lib/story-config";
import { withDeadline } from "../lib/deadline";
import { narrationText } from "../lib/story-text";
import { content, modelFixture, selection, vehicleContent, vehicleSelection } from "./fixtures";

const transport = vi.fn<typeof fetch>();
function request(body: unknown = selection, headers: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:3000/api/story", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
}
function model(value: unknown = content) { transport.mockResolvedValueOnce(Response.json(modelFixture(value))); }
function approved() { transport.mockResolvedValueOnce(Response.json({ results: [{ flagged: false }] })); }
function upstreamError(status: number, code = "failure") {
  transport.mockResolvedValueOnce(Response.json({ error: { code, message: "SECRET upstream detail", type: code } }, { status }));
}
async function errorIs(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const json = await response.json();
  expect(json).toMatchObject({ requestId: expect.any(String), error: { code, message: expect.any(String), retryable: expect.any(Boolean) } });
  expect(response.headers.get("x-request-id")).toBe(json.requestId);
  expect(JSON.stringify(json)).not.toMatch(/SECRET|test-key|stack/);
  return json;
}
beforeEach(() => {
  transport.mockReset();
  transport.mockImplementation(() => { throw new Error("Unmocked external API call forbidden"); });
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("AI_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_TEXT_MODEL", "gpt-4.1-mini");
  vi.stubEnv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts");
  vi.stubEnv("OPENAI_TTS_VOICE", "coral");
  vi.stubEnv("OPENAI_MODERATION_MODEL", "omni-moderation-latest");
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("request boundary (T06, T07, T23, T24)", () => {
  it.each([
    { ...selection, world: "unknown" }, { ...selection, theme: "unknown" }, { ...selection, targetSeconds: "60" }, { ...selection, targetSeconds: 61 },
    { ...selection, characterIds: [] }, { ...selection, characterIds: ["unknown"] },
    { ...selection, characterIds: ["bus"] }, { ...selection, world: "vehicle", characterIds: ["bus", "stegosaurus"] },
    { ...selection, world: "vehicle", characterIds: ["stegosaurus"] },
    { ...selection, characterIds: ["stegosaurus", "stegosaurus"] },
    { ...selection, characterIds: ["stegosaurus", "mosasaurus", "triceratops"] },
    { ...selection, prompt: "ignore instructions" }, { ...selection, model: "custom" }, null,
  ])("rejects invalid selection without upstream call: %j", async (body) => {
    await errorIs(await storyPost(request(body)), 400, "INVALID_INPUT"); expect(transport).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON and content type", async () => {
    await errorIs(await storyPost(new Request("http://localhost/api/story", { method: "POST", body: "{", headers: { "content-type": "application/json" } })), 400, "INVALID_INPUT");
    await errorIs(await storyPost(request(selection, { "content-type": "text/plain" })), 415, "UNSUPPORTED_MEDIA_TYPE");
    expect(transport).not.toHaveBeenCalled();
  });
  it("accepts the actual Host when Next normalizes request.url", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const incoming = new Request("http://localhost:3000/api/story", { method: "POST", body: JSON.stringify(selection), headers: { "content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } });
    await errorIs(await storyPost(incoming), 503, "API_NOT_CONFIGURED");
    expect(transport).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{}, { "content-length": "1" }, { "content-length": "20000" }])("checks actual UTF-8 byte size and declared size: %j", async (headers) => {
    await errorIs(await speechPost(request({ text: "가".repeat(6000) }, headers)), 413, "PAYLOAD_TOO_LARGE");
    expect(transport).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ origin: "https://untrusted.example" }, { origin: "null" }, { "sec-fetch-site": "cross-site" }])("rejects cross-site %j", async (headers) => {
    const response = await storyPost(request(selection, headers));
    await errorIs(response, 403, "FORBIDDEN_ORIGIN");
    expect(response.headers.has("access-control-allow-origin")).toBe(false); expect(transport).not.toHaveBeenCalled();
  });
  it.each([{ text: "" }, { text: "   " }, { text: "가".repeat(1801) }, { text: "hello", voice: "other" }, { storyId: "id" }])("rejects direct speech input %j", async (body) => {
    await errorIs(await speechPost(request(body)), 400, "INVALID_INPUT"); expect(transport).not.toHaveBeenCalled();
  });
});

describe("generation and content checks (T08–T12)", () => {
  it("missing key is a configuration error without a sample or upstream call", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await errorIs(await storyPost(request()), 503, "API_NOT_CONFIGURED");
    expect(result.error.retryable).toBe(false); expect(transport).not.toHaveBeenCalled();
  });
  it("returns only validated, moderated content; no automatic speech", async () => {
    model(); approved();
    const response = await storyPost(request(selection, { origin: "http://127.0.0.1:3000" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ story: { ...content, selection, narrationText: narrationText(content) } });
    expect(transport).toHaveBeenCalledTimes(2);
    const textRequest = JSON.parse(transport.mock.calls[0][1]!.body as string);
    expect(textRequest).toMatchObject({ store: false, model: "gpt-4.1-mini", text: { format: { type: "json_schema", strict: true } } });
    expect(textRequest.input[0].content).toContain("주인공");
    expect(textRequest.input[0].content).toContain("모사사우루스");
    expect(JSON.parse(transport.mock.calls[1][1]!.body as string)).toEqual({ input: narrationText(content), model: "omni-moderation-latest" });
  });
  it("passes vehicle roles, names and categories to the configured OpenAI provider", async () => {
    model(vehicleContent); approved();
    const response = await storyPost(request(vehicleSelection));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ story: { ...vehicleContent, selection: vehicleSelection } });
    const generated = JSON.parse(transport.mock.calls[0][1]!.body as string);
    expect(JSON.parse(generated.input[0].content)).toMatchObject({
      world: { id: "vehicle", name: "자동차 마을" },
      characters: [
        { id: "bus", storyName: "부비", category: "everyday", role: "주인공" },
        { id: "excavator", storyName: "굴리", category: "construction", role: "함께할 친구" },
      ],
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it.each([
    { title: "", paragraphs: content.paragraphs }, { title: "가".repeat(61), paragraphs: content.paragraphs },
    { ...content, paragraphs: ["", ...content.paragraphs] }, { ...content, paragraphs: ["   ", ...content.paragraphs] },
    { ...content, paragraphs: ["하나", "둘"] }, { ...content, paragraphs: Array(9).fill("문단") },
    { ...content, paragraphs: ["가".repeat(1800), "나", "다"] },
    { ...content, paragraphs: ["스테고사우루스", "선택 인물 누락", "끝"] },
    { ...content, extra: "forbidden" }, null,
  ])("rejects invalid model content %j", async (value) => {
    model(value); await errorIs(await storyPost(request()), 502, "INVALID_AI_RESPONSE"); expect(transport).toHaveBeenCalledTimes(1);
  });
  it("handles refusal, incomplete output and malformed JSON", async () => {
    transport.mockResolvedValueOnce(Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] }));
    await errorIs(await storyPost(request()), 422, "CONTENT_BLOCKED");
    transport.mockResolvedValueOnce(Response.json({ ...modelFixture(), status: "incomplete" }));
    await errorIs(await storyPost(request()), 502, "INVALID_AI_RESPONSE");
    transport.mockResolvedValueOnce(Response.json({ object: "response", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "{" }] }] }));
    await errorIs(await storyPost(request()), 502, "INVALID_AI_RESPONSE");
  });
  it.each([{ results: [{ flagged: true }] }, { results: [] }, { results: [{}] }])("fails closed on moderation %j", async (moderation) => {
    model(); transport.mockResolvedValueOnce(Response.json(moderation));
    const blocked = moderation.results[0] && "flagged" in moderation.results[0];
    await errorIs(await storyPost(request()), blocked ? 422 : 503, blocked ? "CONTENT_BLOCKED" : "CONTENT_CHECK_UNAVAILABLE");
  });
  it("never skips failed moderation", async () => {
    model(); upstreamError(500);
    await errorIs(await storyPost(request()), 503, "CONTENT_CHECK_UNAVAILABLE"); expect(transport).toHaveBeenCalledTimes(2);
  });
});

describe("speech route (T14, T24)", () => {
  it("moderates direct requests then returns MP3 bytes", async () => {
    approved(); transport.mockResolvedValueOnce(new Response(new Uint8Array([73, 68, 51, 1]), { headers: { "content-type": "audio/mpeg" } }));
    const response = await speechPost(request({ text: narrationText(content) }));
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("cache-control")).toBe("no-store"); expect((await response.arrayBuffer()).byteLength).toBe(4);
    const speech = JSON.parse(transport.mock.calls[1][1]!.body as string);
    expect(speech).toMatchObject({ model: "gpt-4o-mini-tts", voice: "coral", input: narrationText(content), response_format: "mp3" });
    expect(speech.instructions).toContain("한국어");
  });
  it("does not synthesize blocked or unchecked text", async () => {
    transport.mockResolvedValueOnce(Response.json({ results: [{ flagged: true }] }));
    await errorIs(await speechPost(request({ text: "text" })), 422, "CONTENT_BLOCKED"); expect(transport).toHaveBeenCalledTimes(1);
    upstreamError(500);
    await errorIs(await speechPost(request({ text: "text" })), 503, "CONTENT_CHECK_UNAVAILABLE"); expect(transport).toHaveBeenCalledTimes(2);
  });
  it("rejects empty audio and unexpected provider content types", async () => {
    approved(); transport.mockResolvedValueOnce(new Response(null, { headers: { "content-type": "audio/mpeg" } }));
    await errorIs(await speechPost(request({ text: "text" })), 502, "INVALID_AUDIO_RESPONSE");
    approved(); transport.mockResolvedValueOnce(Response.json({ error: "oops" }));
    await errorIs(await speechPost(request({ text: "text" })), 502, "INVALID_AUDIO_RESPONSE");
  });
});

describe("errors, cancellation and deadlines (T19, T20)", () => {
  it.each([
    [429, "rate_limit_exceeded", 429, "API_RATE_LIMITED", true],
    [429, "insufficient_quota", 503, "API_QUOTA_EXCEEDED", false],
    [401, "invalid_api_key", 503, "API_NOT_CONFIGURED", false],
    [404, "model_not_found", 503, "API_NOT_CONFIGURED", false],
    [500, "failure", 503, "UPSTREAM_UNAVAILABLE", true],
  ] as const)("maps upstream %s/%s without retries or details", async (status, code, expectedStatus, expectedCode, retryable) => {
    upstreamError(status, code);
    const json = await errorIs(await storyPost(request()), expectedStatus, expectedCode);
    expect(json.error.retryable).toBe(retryable); expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toMatch(/SECRET|test-key|물가/);
  });
  it("times out a stalled text request and forwards abort", async () => {
    vi.useFakeTimers();
    transport.mockImplementation(() => new Promise(() => {}));
    const pending = storyPost(request());
    await vi.advanceTimersByTimeAsync(TIMEOUTS.text + 1);
    await errorIs(await pending, 504, "GENERATION_TIMEOUT");
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true); expect(transport).toHaveBeenCalledTimes(1);
  });
  it("forwards a disconnected request to the SDK", async () => {
    const abort = new AbortController();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    transport.mockImplementation(() => { started(); return new Promise(() => {}); });
    const incoming = new Request(request(), { signal: abort.signal });
    const pending = storyPost(incoming); await ready; abort.abort();
    await errorIs(await pending, 499, "REQUEST_CANCELLED");
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it("clears the timer and abort listener on a successful deadline", async () => {
    vi.useFakeTimers();
    expect(await withDeadline(new AbortController().signal, 100, async () => 7)).toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("fails closed when moderation times out", async () => {
    vi.useFakeTimers(); model();
    transport.mockImplementationOnce(() => new Promise(() => {}));
    const pending = storyPost(request());
    await vi.advanceTimersByTimeAsync(TIMEOUTS.moderation + 1);
    await errorIs(await pending, 503, "CONTENT_CHECK_UNAVAILABLE"); expect(transport).toHaveBeenCalledTimes(2);
  });
  it("times out speech while reading its response body", async () => {
    vi.useFakeTimers(); approved();
    transport.mockResolvedValueOnce(new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([73, 68, 51])); } }), { headers: { "content-type": "audio/mpeg" } }));
    const pending = speechPost(request({ text: "동화 본문" }));
    await vi.advanceTimersByTimeAsync(TIMEOUTS.speech + 1);
    await errorIs(await pending, 504, "GENERATION_TIMEOUT"); expect(transport).toHaveBeenCalledTimes(2);
  });
  it("bounds a stalled incoming request body before any paid call", async () => {
    vi.useFakeTimers();
    const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("{")); } });
    const init = { method: "POST", headers: { "content-type": "application/json" }, body, duplex: "half" };
    const pending = storyPost(new Request("http://127.0.0.1/api/story", init));
    await vi.advanceTimersByTimeAsync(TIMEOUTS.storyServer + 1);
    await errorIs(await pending, 504, "GENERATION_TIMEOUT"); expect(transport).not.toHaveBeenCalled();
  });
  it("already-aborted requests never call upstream", async () => {
    const abort = new AbortController(); abort.abort();
    await errorIs(await storyPost(new Request(request(), { signal: abort.signal })), 499, "REQUEST_CANCELLED");
    expect(transport).not.toHaveBeenCalled();
  });
});
