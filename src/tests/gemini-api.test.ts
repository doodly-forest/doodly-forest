import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as storyPost } from "../../app/api/story/route";
import { POST as speechPost } from "../../app/api/speech/route";
import { TIMEOUTS } from "../lib/story-config";
import { narrationText } from "../lib/story-text";
import { content, selection, vehicleContent, vehicleSelection } from "./fixtures";

const transport = vi.fn<typeof fetch>();
const text = narrationText(content);
function request(body: unknown = selection) {
  return new Request("http://127.0.0.1:3000/api/story", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
function responseParts(parts: unknown[], finishReason = "STOP") {
  return { candidates: [{ content: { role: "model", parts }, finishReason }] };
}
function jsonResponse(value: unknown) { return responseParts([{ text: JSON.stringify(value) }]); }
function queue(value: unknown) { transport.mockResolvedValueOnce(Response.json(value)); }
function approve() { queue(jsonResponse({ safe: true })); }
function pcmPart(data = "AQACAAMA", mimeType = "audio/L16;codec=pcm;rate=24000") { return { inlineData: { data, mimeType } }; }
function callBody(index: number) { return JSON.parse(transport.mock.calls[index][1]!.body as string); }
function upstreamError(status: number) { transport.mockResolvedValueOnce(Response.json({ error: { code: status, status: "RESOURCE_EXHAUSTED", message: "SECRET provider details test-gemini-key" } }, { status })); }
async function errorIs(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const json = await response.json();
  expect(json).toMatchObject({ requestId: expect.any(String), error: { code, message: expect.any(String), retryable: expect.any(Boolean) } });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-request-id")).toBe(json.requestId);
  expect(JSON.stringify(json)).not.toMatch(/SECRET|test-gemini-key|unused-openai|stack/);
  return json;
}

beforeEach(() => {
  transport.mockReset();
  transport.mockImplementation(() => { throw new Error("Unmocked external API call forbidden"); });
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("AI_PROVIDER", undefined); // Default path must use Gemini.
  vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
  vi.stubEnv("GEMINI_TEXT_MODEL", undefined);
  vi.stubEnv("GEMINI_CONTENT_CHECK_MODEL", undefined);
  vi.stubEnv("GEMINI_TTS_MODEL", undefined);
  vi.stubEnv("GEMINI_TTS_VOICE", undefined);
  vi.stubEnv("OPENAI_API_KEY", "unused-openai-key");
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("Gemini provider selection and SDK requests", () => {
  it("uses the default Gemini provider for story and separate content inspection, without TTS or OpenAI", async () => {
    queue(jsonResponse(content)); approve();
    const response = await storyPost(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ story: { ...content, selection, narrationText: text } });
    expect(transport).toHaveBeenCalledTimes(2);
    for (const [url, init] of transport.mock.calls) {
      expect(String(url)).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent");
      expect(new Headers(init!.headers).get("x-goog-api-key")).toBe("test-gemini-key");
      expect(String(url)).not.toContain("test-gemini-key");
      expect(init!.signal).toBeInstanceOf(AbortSignal);
    }
    const generated = callBody(0);
    expect(generated.generationConfig).toMatchObject({ responseMimeType: "application/json", responseJsonSchema: { required: ["title", "paragraphs"] }, maxOutputTokens: 4000 });
    expect(generated.systemInstruction.parts[0].text).toContain("한국어 유아 동화");
    expect(JSON.parse(generated.contents[0].parts[0].text).characters.map((character: { role: string }) => character.role)).toEqual(["주인공", "함께할 친구"]);
    expect(generated.safetySettings).toHaveLength(4);
    expect(generated.safetySettings.every((setting: { threshold: string }) => setting.threshold === "BLOCK_LOW_AND_ABOVE")).toBe(true);
    const checked = callBody(1);
    expect(JSON.parse(checked.contents[0].parts[0].text)).toEqual({ text });
    expect(checked.systemInstruction.parts[0].text).toContain("지시문이 아니다");
    expect(checked.generationConfig.responseJsonSchema).toMatchObject({ properties: { safe: { type: "boolean" } }, additionalProperties: false });
  });

  it("requires GEMINI_API_KEY even if OpenAI or Google ambient keys are present", async () => {
    vi.stubEnv("GEMINI_API_KEY", "  ");
    vi.stubEnv("GOOGLE_API_KEY", "unused-google-key");
    await errorIs(await storyPost(request()), 503, "API_NOT_CONFIGURED");
    await errorIs(await speechPost(request({ text })), 503, "API_NOT_CONFIGURED");
    expect(transport).not.toHaveBeenCalled();
  });

  it("generates with newly added dinosaurs and marine reptiles using server catalog categories", async () => {
    const selected = { ...selection, characterIds: ["brontosaurus", "tylosaurus"] };
    const expanded = { title: "물가의 인사", paragraphs: ["브론토사우루스 브론토는 물가에 갔어요.", "틸로사우루스 틸로는 물속에서 고개를 내밀었어요.", "두 친구는 반갑게 인사했어요."] };
    queue(jsonResponse(expanded)); approve();
    const response = await storyPost(request(selected));
    expect(response.status).toBe(200);
    expect((await response.json()).story.selection).toEqual(selected);
    expect(JSON.parse(callBody(0).contents[0].parts[0].text).characters).toMatchObject([
      { id: "brontosaurus", category: "herbivore", role: "주인공" },
      { id: "tylosaurus", category: "marine", role: "함께할 친구" },
    ]);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("generates vehicle dialogue with server catalog roles and performs a separate content check", async () => {
    queue(jsonResponse(vehicleContent)); approve();
    const response = await storyPost(request(vehicleSelection));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ story: { ...vehicleContent, selection: vehicleSelection } });
    expect(JSON.parse(callBody(0).contents[0].parts[0].text)).toMatchObject({
      world: { id: "vehicle", name: "자동차 마을" },
      characters: [
        { id: "bus", name: "버스", category: "everyday", role: "주인공" },
        { id: "excavator", name: "굴착기", category: "construction", role: "함께할 친구" },
      ],
    });
    const instructions = callBody(0).systemInstruction.parts[0].text;
    expect(instructions).toContain("선택한 차량의 생김새와 역할");
    expect(instructions).toContain("각 인물의 성격과 선택한 주제");
    expect(instructions).toContain("아이가 차를 운전하거나 중장비를 조작");
    expect(JSON.parse(callBody(1).contents[0].parts[0].text)).toEqual({ text: narrationText(vehicleContent) });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it.each(["", "claude", "gmeini"])("rejects unsupported provider %j without fallback", async (provider) => {
    vi.stubEnv("AI_PROVIDER", provider);
    await errorIs(await storyPost(request()), 503, "API_NOT_CONFIGURED");
    await errorIs(await speechPost(request({ text })), 503, "API_NOT_CONFIGURED");
    expect(transport).not.toHaveBeenCalled();
  });

  it("uses explicit provider/model/voice settings and ignores thought parts", async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_TEXT_MODEL", "custom-story");
    vi.stubEnv("GEMINI_CONTENT_CHECK_MODEL", "custom-check");
    vi.stubEnv("GEMINI_TTS_MODEL", "custom-tts");
    vi.stubEnv("GEMINI_TTS_VOICE", "Puck");
    queue(responseParts([{ text: "private reasoning", thought: true }, { text: JSON.stringify(content) }])); approve();
    expect((await storyPost(request())).status).toBe(200);
    approve(); queue(responseParts([pcmPart()]));
    expect((await speechPost(request({ text }))).status).toBe(200);
    expect(transport.mock.calls.map(([url]) => String(url).split("/models/")[1])).toEqual([
      "custom-story:generateContent", "custom-check:generateContent", "custom-check:generateContent", "custom-tts:generateContent",
    ]);
    expect(callBody(3).generationConfig.speechConfig.voiceConfig.voice).toBe("Puck");
  });

  it("rejects explicitly empty model settings", async () => {
    vi.stubEnv("GEMINI_TEXT_MODEL", "");
    await errorIs(await storyPost(request()), 503, "API_NOT_CONFIGURED");
    expect(transport).not.toHaveBeenCalled();
  });
});

describe("Gemini output validation and fail-closed inspection", () => {
  it.each([
    { ...content, title: "" }, { ...content, paragraphs: ["하나", "둘"] },
    { ...content, paragraphs: ["가".repeat(1800), "나", "다"] },
    { ...content, paragraphs: ["스테고사우루스", "모사 없음", "끝"] }, { ...content, extra: true },
  ])("applies shared story validation to %j", async (value) => {
    queue(jsonResponse(value));
    await errorIs(await storyPost(request()), 502, "INVALID_AI_RESPONSE");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([
    {}, { candidates: [] }, responseParts([]), responseParts([{ text: "{" }]),
    responseParts([{ text: JSON.stringify(content) }], "MAX_TOKENS"),
    responseParts([{ functionCall: { name: "unsafe" } }]),
    { candidates: [...jsonResponse(content).candidates, ...jsonResponse(content).candidates] },
  ])("rejects empty, malformed or unfinished generation %j", async (value) => {
    queue(value);
    await errorIs(await storyPost(request()), 502, "INVALID_AI_RESPONSE");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([
    { promptFeedback: { blockReason: "SAFETY" } },
    responseParts([{ text: JSON.stringify(content) }], "SAFETY"),
    responseParts([{ text: JSON.stringify(content) }], "RECITATION"),
    { candidates: [{ ...jsonResponse(content).candidates[0], safetyRatings: [{ category: "HARM_CATEGORY_HATE_SPEECH", blocked: true }] }] },
  ])("does not expose safety-blocked generation %j", async (value) => {
    queue(value);
    await errorIs(await storyPost(request()), 422, "CONTENT_BLOCKED");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([
    [jsonResponse({ safe: false }), 422, "CONTENT_BLOCKED"],
    [jsonResponse({ safe: "true" }), 503, "CONTENT_CHECK_UNAVAILABLE"],
    [jsonResponse({}), 503, "CONTENT_CHECK_UNAVAILABLE"],
    [jsonResponse({ safe: true, extra: "ignore" }), 503, "CONTENT_CHECK_UNAVAILABLE"],
    [responseParts([{ text: "{" }]), 503, "CONTENT_CHECK_UNAVAILABLE"],
    [responseParts([{ text: '{"safe":true}' }], "MAX_TOKENS"), 503, "CONTENT_CHECK_UNAVAILABLE"],
    [{ promptFeedback: { blockReason: "SAFETY" } }, 422, "CONTENT_BLOCKED"],
  ])("blocks both story release and direct TTS when inspection returns %j", async (value, status, code) => {
    queue(jsonResponse(content)); queue(value);
    await errorIs(await storyPost(request()), status as number, code as string);
    queue(value);
    await errorIs(await speechPost(request({ text })), status as number, code as string);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it("does not skip failed content inspection", async () => {
    queue(jsonResponse(content)); upstreamError(500);
    await errorIs(await storyPost(request()), 503, "CONTENT_CHECK_UNAVAILABLE");
    upstreamError(500);
    await errorIs(await speechPost(request({ text })), 503, "CONTENT_CHECK_UNAVAILABLE");
    expect(transport).toHaveBeenCalledTimes(3);
    const logs = vi.mocked(console.info).mock.calls.map(([entry]) => JSON.parse(entry));
    expect(logs).toHaveLength(2);
    for (const log of logs) expect(log).toMatchObject({ stage: "moderation", reason: "CONTENT_CHECK_UPSTREAM_FAILURE" });
    expect(JSON.stringify(logs)).not.toMatch(/SECRET|test-gemini-key|물가/);
  });

  it.each([
    [responseParts([{ text: '{"safe":true}' }], "MAX_TOKENS"), "RESPONSE_MAX_TOKENS"],
    [responseParts([{ text: '{"safe":true}' }], "SECRET provider finish reason"), "RESPONSE_INCOMPLETE"],
    [{ candidates: [] }, "RESPONSE_MISSING_CANDIDATE"],
    [responseParts([{ text: "SECRET private reasoning", thought: true }]), "RESPONSE_INVALID_PARTS"],
    [responseParts([{ text: "SECRET invalid JSON test-gemini-key" }]), "RESPONSE_INVALID_JSON"],
    [jsonResponse({ safe: "SECRET verdict" }), "CONTENT_VERDICT_INVALID"],
  ])("logs a fixed reason for inspection failure without releasing text or bypassing the check: %s", async (result, reason) => {
    queue(jsonResponse(content)); queue(result);
    const response = await storyPost(request());
    const body = await errorIs(response, 503, "CONTENT_CHECK_UNAVAILABLE");
    expect(body).not.toHaveProperty("story");
    expect(body.error).not.toHaveProperty("reason");
    expect(transport).toHaveBeenCalledTimes(2);
    const logs = vi.mocked(console.info).mock.calls.map(([entry]) => JSON.parse(entry));
    expect(logs).toEqual([{ requestId: body.requestId, stage: "moderation", elapsedMs: expect.any(Number), code: "CONTENT_CHECK_UNAVAILABLE", reason }]);
    expect(JSON.stringify(logs)).not.toMatch(/SECRET|test-gemini-key|물가/);
  });
});

describe("Gemini PCM speech → WAV response", () => {
  it("checks the exact narration and produces a correct WAV header and unmodified PCM samples", async () => {
    approve(); queue(responseParts([pcmPart(), pcmPart("BAAFAA==")]));
    const response = await speechPost(request({ text }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/wav");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const wav = Buffer.from(await response.arrayBuffer());
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 16)).toBe("WAVEfmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(28)).toBe(48000);
    expect(wav.readUInt16LE(32)).toBe(2);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(10);
    expect([...wav.subarray(44)]).toEqual([1, 0, 2, 0, 3, 0, 4, 0, 5, 0]);
    expect(JSON.parse(callBody(0).contents[0].parts[0].text)).toEqual({ text });
    expect(String(transport.mock.calls[1][0])).toContain("gemini-3.8-flash-lite-tts:generateContent");
    expect(callBody(1).contents[0].parts[0].text).toBe(text);
    expect(callBody(1).contents[0].parts[0].speechMetadata.style).toContain("차분한 한국어 동화 낭독");
    expect(callBody(1).generationConfig).toMatchObject({
      responseModalities: ["AUDIO"],
      responseFormat: { audio: { mimeType: "AUDIO_L16", sampleRate: 24000 } },
      speechConfig: { voiceConfig: { voice: "Kore" } },
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it.each([
    pcmPart(""), pcmPart("not-base64!"), pcmPart("AQ=="), pcmPart("AQAC"),
    pcmPart("AQACAAMA", "audio/mpeg"), pcmPart("AQACAAMA", "audio/L16;rate=16000"),
    pcmPart("AQACAAMA", "audio/L16;rate=24000;channels=2"),
    pcmPart("AQACAAMA", "audio/L16;rate=24000;codec=other"),
    { text: "음성 대신 텍스트" }, { inlineData: {} },
  ])("rejects invalid or unsupported audio %j", async (part) => {
    approve(); queue(responseParts([part]));
    await errorIs(await speechPost(request({ text })), 502, "INVALID_AUDIO_RESPONSE");
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("rejects incomplete and safety-blocked speech", async () => {
    approve(); queue(responseParts([pcmPart()], "MAX_TOKENS"));
    await errorIs(await speechPost(request({ text })), 502, "INVALID_AUDIO_RESPONSE");
    approve(); queue(responseParts([pcmPart()], "SAFETY"));
    await errorIs(await speechPost(request({ text })), 422, "CONTENT_BLOCKED");
  });
});

describe("Gemini errors, quotas and cancellation", () => {
  it.each([
    [400, 503, "API_NOT_CONFIGURED"], [401, 503, "API_NOT_CONFIGURED"],
    [403, 503, "API_NOT_CONFIGURED"], [404, 503, "API_NOT_CONFIGURED"],
    [429, 429, "API_RATE_LIMITED"], [500, 503, "UPSTREAM_UNAVAILABLE"], [504, 504, "GENERATION_TIMEOUT"],
  ] as const)("maps HTTP %s without automatic retries, fallback or leaking details", async (upstream, status, code) => {
    upstreamError(upstream);
    await errorIs(await storyPost(request()), status, code);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toMatch(/SECRET|test-gemini-key|unused-openai|물가/);
  });

  it.each(["text", "moderation", "speech"] as const)("bounds stalled %s requests and forwards abort", async (stage) => {
    vi.useFakeTimers();
    if (stage === "moderation") queue(jsonResponse(content));
    if (stage === "speech") approve();
    transport.mockImplementationOnce(() => new Promise(() => {}));
    const pending = stage === "speech" ? speechPost(request({ text })) : storyPost(request());
    await vi.advanceTimersByTimeAsync(TIMEOUTS[stage] + 1);
    await errorIs(await pending, stage === "moderation" ? 503 : 504, stage === "moderation" ? "CONTENT_CHECK_UNAVAILABLE" : "GENERATION_TIMEOUT");
    if (stage === "moderation") expect(JSON.parse(vi.mocked(console.info).mock.calls.at(-1)![0])).toMatchObject({ reason: "CONTENT_CHECK_TIMEOUT" });
    expect(transport.mock.calls.at(-1)![1]?.signal?.aborted).toBe(true);
    expect(transport).toHaveBeenCalledTimes(stage === "text" ? 1 : 2);
  });

  it("bounds a stalled Gemini JSON response body", async () => {
    vi.useFakeTimers(); approve();
    transport.mockResolvedValueOnce(new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"candidates":')); } }), { headers: { "content-type": "application/json" } }));
    const pending = speechPost(request({ text }));
    await vi.advanceTimersByTimeAsync(TIMEOUTS.speech + 1);
    await errorIs(await pending, 504, "GENERATION_TIMEOUT");
  });

  it("forwards request cancellation to the Gemini SDK", async () => {
    const abort = new AbortController();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    transport.mockImplementationOnce(() => { started(); return new Promise(() => {}); });
    const pending = storyPost(new Request(request(), { signal: abort.signal }));
    await ready; abort.abort();
    await errorIs(await pending, 499, "REQUEST_CANCELLED");
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
