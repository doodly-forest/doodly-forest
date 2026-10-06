// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { StorySelection } from "../components/story-selection";
import { StoryReader } from "../components/story-reader";
import { StorySessionProvider } from "../components/story-session";

const navigation = vi.hoisted(() => ({ pathname: "/", listeners: new Set<() => void>() }));
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const navigate = (pathname: string) => {
    if (navigation.pathname === pathname) return;
    navigation.pathname = pathname;
    navigation.listeners.forEach((listener) => listener());
  };
  const router = { push: navigate, replace: navigate };
  return {
    useRouter: () => router,
    usePathname: () => useSyncExternalStore(
      (listener) => { navigation.listeners.add(listener); return () => { navigation.listeners.delete(listener); }; },
      () => navigation.pathname,
      () => navigation.pathname,
    ),
  };
});
function TestApp() {
  const pathname = usePathname();
  return <StorySessionProvider>{pathname === "/story" ? <StoryReader /> : <StorySelection />}</StorySessionProvider>;
}
import { useStoryPlayground } from "../hooks/use-story-playground";
import { TIMEOUTS } from "../lib/story-config";
import { defaultSelection } from "../lib/story-options";
import { content, storyFixture } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();
const createUrl = vi.fn(() => "blob:test-audio");
const revokeUrl = vi.fn();
beforeEach(() => {
  navigation.pathname = "/";
  fetchMock.mockReset(); createUrl.mockClear(); revokeUrl.mockClear();
  fetchMock.mockImplementation(async (path, init) => {
    if (path === "/api/story") return Response.json(storyFixture(JSON.parse(init!.body as string)));
    if (path === "/api/speech") return new Response(new Uint8Array([73, 68, 51]), { headers: { "content-type": "audio/mpeg" } });
    throw new Error("Unmocked network call forbidden");
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("URL", class extends URL { static createObjectURL = createUrl; static revokeObjectURL = revokeUrl; });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  // jsdom does not implement the top layer. Real modal focus is tested in Chromium.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } },
  });
});
afterEach(cleanup);
async function chooseFriends(user: ReturnType<typeof userEvent.setup>, names = ["스테고사우루스"]) {
  await user.click(screen.getByRole("button", { name: /친구 (고르기|바꾸기)/ }));
  for (const name of names) await user.click(screen.getByRole("button", { name }));
  await user.click(screen.getByRole("button", { name: "선택 완료" }));
}
async function readyStory() {
  const user = userEvent.setup();
  render(<TestApp />);
  await chooseFriends(user);
  await user.click(screen.getByRole("button", { name: "동화 만들기" }));
  await screen.findByRole("heading", { name: content.title });
  return user;
}
function hookWithSelection() {
  const hook = renderHook(() => useStoryPlayground());
  act(() => hook.result.current.updateSelection({ ...defaultSelection(), characterIds: ["stegosaurus"] }));
  return hook;
}
it("T01–T04: dinosaur-only defaults, category tabs, ordered roles and cross-tab limit", async () => {
  const user = userEvent.setup(); render(<TestApp />);
  expect(screen.getByRole("button", { name: "동화 만들기" })).toBeDisabled();
  expect(screen.queryByText(/자동차/)).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: /우정/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: "약 1분" })).toBeChecked();
  await user.click(screen.getByRole("radio", { name: /배려/ }));
  await user.click(screen.getByRole("radio", { name: "약 2분" }));
  await user.click(screen.getByRole("button", { name: "친구 고르기" }));
  expect(within(screen.getByRole("tabpanel")).getAllByRole("button")).toHaveLength(60);
  await user.click(screen.getByRole("tab", { name: /초식/ }));
  expect(within(screen.getByRole("tabpanel")).getAllByRole("button")).toHaveLength(30);
  await user.click(screen.getByRole("button", { name: "스테고사우루스" }));
  await user.click(screen.getByRole("tab", { name: /바다/ }));
  expect(within(screen.getByRole("tabpanel")).getAllByRole("button")).toHaveLength(6);
  expect(screen.getByText(/공룡과는 다른 동물/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "모사사우루스" }));
  await user.click(screen.getByRole("tab", { name: /육식/ }));
  expect(within(screen.getByRole("tabpanel")).getAllByRole("button")).toHaveLength(24);
  await user.click(screen.getByRole("button", { name: "티라노사우루스" }));
  expect(screen.getByText("친구는 최대 2명까지 고를 수 있어요")).toBeVisible();
  expect(screen.getByRole("button", { name: "티라노사우루스" })).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getByRole("button", { name: "스테고사우루스 선택 해제" }));
  expect(screen.getByRole("button", { name: "모사사우루스 선택 해제" })).toHaveTextContent("주인공: 모사");
  await user.click(screen.getByRole("button", { name: "티라노사우루스" }));
  await user.click(screen.getByRole("button", { name: "선택 완료" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("주인공: 모사 / 함께할 친구: 티노")).toBeVisible();
  expect(screen.getByRole("radio", { name: /배려/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: "약 2분" })).toBeChecked();
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["취소", "친구 선택 닫기", "Escape"])("dismiss via %s discards the draft and reopens with committed choices", async (action) => {
  const user = userEvent.setup(); render(<TestApp />);
  await chooseFriends(user);
  await user.click(screen.getByRole("button", { name: "친구 바꾸기" }));
  await user.click(screen.getByRole("button", { name: "모사사우루스" }));
  if (action === "Escape") fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  else await user.click(screen.getByRole("button", { name: action }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("주인공: 스테고")).toBeVisible();
  expect(document.body.style.overflow).toBe("");
  await user.click(screen.getByRole("button", { name: "친구 바꾸기" }));
  expect(screen.getByRole("button", { name: "스테고사우루스" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "모사사우루스" })).toHaveAttribute("aria-pressed", "false");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("tab keyboard navigation and removing all draft choices never submit a story", async () => {
  const user = userEvent.setup(); render(<TestApp />);
  await user.click(screen.getByRole("button", { name: "친구 고르기" }));
  expect(screen.getByRole("tab", { name: /전체/ })).toHaveFocus();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("tab", { name: /바다/ })).toHaveAttribute("aria-selected", "true");
  await user.keyboard("{Home}");
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: /초식/ })).toHaveFocus();
  expect(within(screen.getByRole("tabpanel")).getAllByRole("button")).toHaveLength(30);
  await user.click(screen.getByRole("button", { name: "스테고사우루스" }));
  await user.click(screen.getByRole("button", { name: "스테고사우루스 선택 해제" }));
  expect(screen.getByRole("button", { name: "선택 완료" })).toBeDisabled();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("image failures leave named cards selectable and attribution opens separately", async () => {
  const user = userEvent.setup(); render(<TestApp />);
  await user.click(screen.getByRole("button", { name: "친구 고르기" }));
  const card = screen.getByRole("button", { name: "스테고사우루스" });
  const picture = within(card).getByRole("img", { name: "스테고사우루스 복원도" });
  expect(new URL((picture as HTMLImageElement).src).pathname).toBe("/dinosaurs/stegosaurus.png");
  fireEvent.error(picture);
  expect(within(card).getByText("그림을 불러오지 못했어요")).toBeVisible();
  await user.click(card);
  expect(card).toHaveAttribute("aria-pressed", "true");
  const credits = screen.getByRole("link", { name: /그림 출처·이용 조건/ });
  expect(credits).toHaveAttribute("href", "/image-credits");
  expect(credits).toHaveAttribute("target", "_blank");
  expect(credits).toHaveAttribute("rel", "noopener noreferrer");
  await user.click(screen.getByRole("button", { name: "선택 완료" }));
  expect(screen.getByText("주인공: 스테고", { exact: true })).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("cards are toggle buttons with no checkbox, and search preserves selection across filters", async () => {
  const user = userEvent.setup(); render(<TestApp />);
  await user.click(screen.getByRole("button", { name: "친구 고르기" }));
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  const search = screen.getByRole("searchbox", { name: "공룡 이름 검색" });
  await user.type(search, "브론토");
  const card = screen.getByRole("button", { name: "브론토사우루스" });
  card.focus(); await user.keyboard(" ");
  expect(card).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("tab", { name: /바다/ }));
  expect(screen.getByText(/이 분류에는 찾는 친구가 없어요/)).toBeVisible();
  expect(screen.getByRole("button", { name: "브론토사우루스 선택 해제" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "전체에서 찾기" }));
  expect(screen.getByRole("button", { name: "브론토사우루스" })).toHaveAttribute("aria-pressed", "true");
  await user.clear(search); await user.type(search, "  TYLOSAURUS  ");
  await user.click(screen.getByRole("button", { name: "틸로사우루스" }));
  await user.click(screen.getByRole("button", { name: "선택 완료" }));
  expect(screen.getByText("주인공: 브론토 / 함께할 친구: 틸로")).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("Enter selects and deselects a card without submitting the story form", async () => {
  const user = userEvent.setup(); render(<TestApp />);
  await user.click(screen.getByRole("button", { name: "친구 고르기" }));
  const card = screen.getByRole("button", { name: "스테고사우루스" });
  card.focus(); await user.keyboard("{Enter}");
  expect(card).toHaveAttribute("aria-pressed", "true");
  await user.keyboard("{Enter}");
  expect(card).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "선택 완료" })).toBeDisabled();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("T05, T12: sends only IDs and selected values, never automatically requests TTS", async () => {
  await readyStory();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ ...defaultSelection(), characterIds: ["stegosaurus"] });
  expect(screen.getByRole("button", { name: "읽어주기" })).toBeEnabled();
});
it("T13–T15: one speech request, actual metadata, replay and seek reuse the Blob", async () => {
  const user = await readyStory();
  const button = screen.getByRole("button", { name: "읽어주기" });
  fireEvent.click(button); fireEvent.click(button);
  await screen.findByRole("button", { name: "처음부터 다시 듣기" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(createUrl).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/실제 길이/)).not.toBeInTheDocument();
  const audio = screen.getByLabelText("동화 음성 플레이어") as HTMLAudioElement;
  Object.defineProperty(audio, "duration", { configurable: true, value: Infinity }); fireEvent.durationChange(audio);
  expect(screen.queryByText(/실제 길이/)).not.toBeInTheDocument();
  Object.defineProperty(audio, "duration", { configurable: true, value: 83 }); fireEvent.loadedMetadata(audio);
  expect(screen.getByText(/실제 길이 01:23/)).toBeVisible();
  audio.currentTime = 20; fireEvent.seeked(audio);
  await user.click(screen.getByRole("button", { name: "처음부터 다시 듣기" }));
  expect(audio.currentTime).toBe(0); expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.play(audio); expect(screen.getByText(/재생 중/)).toBeVisible();
  fireEvent.ended(audio); expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("T16: TTS failure preserves story, retries speech alone and never treats JSON as audio", async () => {
  const user = await readyStory();
  fetchMock.mockResolvedValueOnce(Response.json({ requestId: "failure", error: { code: "UPSTREAM_UNAVAILABLE", message: "음성 연결 실패", retryable: true } }, { status: 503 }));
  await user.click(screen.getByRole("button", { name: "읽어주기" }));
  await screen.findByRole("alert"); expect(screen.getByRole("heading", { name: content.title })).toBeVisible();
  expect(createUrl).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "음성 다시 준비하기" }));
  await screen.findByRole("button", { name: "처음부터 다시 듣기" });
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(["/api/story", "/api/speech", "/api/speech"]);
});
it("rejects a 200 JSON response instead of playing it as MP3", async () => {
  const user = await readyStory(); fetchMock.mockResolvedValueOnce(Response.json({ invalid: true }));
  await user.click(screen.getByRole("button", { name: "읽어주기" }));
  await screen.findByRole("alert"); expect(createUrl).not.toHaveBeenCalled();
});
it("T17: blocked autoplay preserves audio and presents native play guidance", async () => {
  const user = await readyStory();
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException("policy", "NotAllowedError"));
  await user.click(screen.getByRole("button", { name: "읽어주기" }));
  await screen.findByText("음성이 준비됐어요. 재생 버튼을 눌러주세요");
  expect(screen.getByLabelText("동화 음성 플레이어")).toBeVisible();
  expect(screen.queryByRole("button", { name: "음성 다시 준비하기" })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2); expect(revokeUrl).not.toHaveBeenCalled();
});
it.each(["theme", "character", "length", "reset", "regenerate"])("T18: %s stops, detaches and revokes the prior audio", async (change) => {
  const user = await readyStory();
  await user.click(screen.getByRole("button", { name: "읽어주기" }));
  await screen.findByRole("button", { name: "처음부터 다시 듣기" });
  const audio = screen.getByLabelText("동화 음성 플레이어");
  revokeUrl.mockImplementationOnce(() => { expect(audio.hasAttribute("src")).toBe(false); });
  const targets = {
    theme: () => screen.getByRole("radio", { name: /배려/ }),
    length: () => screen.getByRole("radio", { name: "약 2분" }),
    reset: () => screen.getByRole("button", { name: "처음으로" }),
    regenerate: () => screen.getByRole("button", { name: "같은 조건으로 새 동화 만들기" }),
  };
  if (["theme", "character", "length"].includes(change)) {
    await user.click(screen.getByRole("button", { name: "선택 바꾸기" }));
  }
  if (change === "character") await chooseFriends(user, ["모사사우루스"]);
  else await user.click(targets[change as keyof typeof targets]());
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith("blob:test-audio");
  if (change !== "regenerate") expect(screen.queryByRole("heading", { name: content.title })).not.toBeInTheDocument();
});
it("setting the same selection preserves the result and audio", async () => {
  const hook = hookWithSelection();
  await act(async () => { await hook.result.current.generate(); });
  await act(async () => { await hook.result.current.prepareSpeech(); });
  act(() => hook.result.current.updateSelection({ ...hook.result.current.selection }));
  expect(revokeUrl).not.toHaveBeenCalled();
  expect(hook.result.current.story?.title).toBe(content.title);
  expect(hook.result.current.audioUrl).toBe("blob:test-audio");
});
it("returning to selection keeps choices and clears the result without generating again", async () => {
  const user = await readyStory();
  expect(navigation.pathname).toBe("/story");
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "선택 바꾸기" }));
  expect(navigation.pathname).toBe("/");
  expect(screen.getByText("주인공: 스테고")).toBeVisible();
  expect(screen.queryByRole("heading", { name: content.title })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("direct reader visits return to selection without an API call", async () => {
  navigation.pathname = "/story";
  render(<TestApp />);
  await screen.findByRole("button", { name: "동화 만들기" });
  expect(navigation.pathname).toBe("/");
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["success", "error"])("T19: synchronous lock, reset abort and late %s cannot overwrite a new request", async (responseType) => {
  const hook = hookWithSelection();
  let resolveOld!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  let old!: Promise<void>;
  act(() => { old = hook.result.current.generate(); void hook.result.current.generate(); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  act(() => hook.result.current.reset());
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  act(() => hook.result.current.updateSelection({ ...defaultSelection(), characterIds: ["mosasaurus"] }));
  await act(async () => { await hook.result.current.generate(); });
  await act(async () => { resolveOld(responseType === "success" ? Response.json(storyFixture()) : Response.json({ error: "late" }, { status: 500 })); await old; });
  expect(hook.result.current.story?.selection.characterIds).toEqual(["mosasaurus"]);
  expect(hook.result.current.storyError).toBeNull();
});
it("T19: ignores late speech after reset and creates no Blob", async () => {
  const hook = hookWithSelection(); await act(async () => { await hook.result.current.generate(); });
  let resolveOld!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = hook.result.current.prepareSpeech(); });
  act(() => hook.result.current.reset());
  await act(async () => { resolveOld(new Response("audio", { headers: { "content-type": "audio/mpeg" } })); await pending; });
  expect(createUrl).not.toHaveBeenCalled(); expect(hook.result.current.story).toBeNull();
});
it("T19: unmount releases audio and cancels in-flight work", async () => {
  const hook = hookWithSelection(); await act(async () => { await hook.result.current.generate(); });
  await act(async () => { await hook.result.current.prepareSpeech(); });
  hook.unmount(); expect(revokeUrl).toHaveBeenCalledTimes(1);
  const next = hookWithSelection();
  fetchMock.mockImplementationOnce(() => new Promise(() => {}));
  let pending!: Promise<void>; act(() => { pending = next.result.current.generate(); }); next.unmount();
  await act(async () => { await pending; });
  expect(fetchMock.mock.lastCall?.[1]?.signal?.aborted).toBe(true);
});
it("T20: client deadline releases loading even if transport ignores cancellation", async () => {
  vi.useFakeTimers(); const hook = hookWithSelection(); fetchMock.mockImplementation(() => new Promise(() => {}));
  let pending!: Promise<void>; act(() => { pending = hook.result.current.generate(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(TIMEOUTS.storyClient + 1); await pending; });
  expect(hook.result.current.busy).toBe(false); expect(hook.result.current.storyError?.code).toBe("GENERATION_TIMEOUT");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("does not interpret story markup as HTML", async () => {
  const user = userEvent.setup(); render(<TestApp />);
  await chooseFriends(user);
  const fixture = storyFixture({ ...defaultSelection(), characterIds: ["stegosaurus"] });
  fixture.story.title = "<script>window.bad=true</script>";
  fixture.story.narrationText = [fixture.story.title, ...fixture.story.paragraphs].join("\n\n");
  fetchMock.mockResolvedValueOnce(Response.json(fixture));
  await user.click(screen.getByRole("button", { name: "동화 만들기" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: fixture.story.title })).toBeVisible());
  expect(document.querySelector("script")).toBeNull();
});
