import { test, expect, type Page } from "@playwright/test";
import { storyFixture, content } from "../src/tests/fixtures";
import { silentMp3, silentWav } from "./audio-fixture";
import { characters } from "../src/lib/story-options";
import { dinosaurImages } from "../src/lib/dinosaur-images";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    await route.continue();
  });
});
async function mockStory(page: Page, count: { story: number; speech: number }) {
  await page.route("**/api/story", async (route) => {
    count.story += 1;
    await route.fulfill({ json: storyFixture(route.request().postDataJSON()) });
  });
}
function isMobile(page: Page) { return page.viewportSize()!.width < 640; }
function pickerTrigger(page: Page, name: string | RegExp = /친구 (고르기|바꾸기)/) {
  return page.getByRole(isMobile(page) ? "link" : "button", { name });
}
function pickerSurface(page: Page) {
  return page.getByRole(isMobile(page) ? "main" : "dialog", { name: "함께할 친구 고르기" });
}
async function chooseFriends(page: Page, names = ["스테고사우루스", "모사사우루스"]) {
  await pickerTrigger(page).click();
  for (const name of names) await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "선택 완료" }).click();
}
async function selectAndGenerate(page: Page) {
  await page.goto("/");
  await chooseFriends(page);
  await page.getByRole("button", { name: "동화 만들기", exact: true }).click();
  await expect(page).toHaveURL("/story");
  await expect(page.getByRole("heading", { name: content.title })).toBeVisible();
  await expect(page.getByRole("region", { name: "동화 고르기" })).toHaveCount(0);
}

for (const format of ["mp3", "wav"] as const) {
test(`selection → story → ${format} playback → reuse → reset and no persistence`, async ({ page, context }) => {
  const count = { story: 0, speech: 0 };
  await mockStory(page, count);
  await page.route("**/api/speech", async (route) => {
    count.speech += 1;
    expect(route.request().postDataJSON().text).toBe([content.title, ...content.paragraphs].join("\n\n"));
    await route.fulfill({ contentType: format === "wav" ? "audio/wav" : "audio/mpeg", body: format === "wav" ? silentWav() : silentMp3() });
  });
  await selectAndGenerate(page);
  expect(count).toEqual({ story: 1, speech: 0 });
  await page.getByRole("button", { name: "읽어주기", exact: true }).dblclick();
  const audio = page.getByLabel("동화 음성 플레이어");
  await expect(audio).toBeVisible();
  await expect(page.getByText(/실제 길이 00:02/)).toBeVisible();
  await audio.evaluate((node: HTMLAudioElement) => { node.pause(); node.currentTime = 1; });
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeCloseTo(1, 0);
  await page.getByRole("button", { name: "처음부터 다시 듣기" }).click();
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.paused)).toBe(false);
  expect(count).toEqual({ story: 1, speech: 1 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(await context.cookies()).toEqual([]);
  await page.screenshot({ path: `test-results/${test.info().project.name}-${format}-story.png`, fullPage: true });
  await page.getByRole("button", { name: "같은 조건으로 새 동화 만들기" }).click();
  await expect(page.getByRole("heading", { name: content.title })).toBeVisible();
  expect(count).toEqual({ story: 2, speech: 1 });
  await expect(audio).toBeHidden();
  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "동화 만들기", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: content.title })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "약 1분", exact: true })).toBeChecked();
});
}

test("responsive picker keyboard navigation, cross-tab selection and maximum selection", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("자동차 마을")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(pickerTrigger(page, "친구 고르기")).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = pickerSurface(page);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("tab", { name: /전체/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /초식/ })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("tabpanel").getByRole("button")).toHaveCount(30);
  await page.keyboard.press("Tab"); await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "스테고사우루스", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: /바다/ }).click();
  await expect(dialog.getByRole("tabpanel").getByRole("button")).toHaveCount(6);
  await page.getByRole("button", { name: "모사사우루스", exact: true }).click();
  await page.getByRole("tab", { name: /육식/ }).click();
  await expect(dialog.getByRole("tabpanel").getByRole("button")).toHaveCount(24);
  await page.getByRole("button", { name: "티라노사우루스", exact: true }).click();
  await expect(page.getByText("친구는 최대 2명까지 고를 수 있어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "티라노사우루스", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("tab", { name: /초식/ }).click();
  await expect(page.getByRole("button", { name: "스테고사우루스", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "스테고사우루스 선택 해제" }).click();
  await expect(page.getByRole("button", { name: "모사사우루스 선택 해제" })).toContainText("주인공: 모사");
  await page.getByRole("button", { name: "브라키오사우루스", exact: true }).click();
  expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  const rect = await dialog.boundingBox();
  expect(rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: `test-results/${test.info().project.name}-character-modal.png` });
  await page.getByRole("button", { name: "선택 완료" }).click();
  await expect(dialog).toHaveCount(0);
  if (!isMobile(page)) await expect(pickerTrigger(page, "친구 바꾸기")).toBeFocused();
  else await expect(page).toHaveURL("/");
  await expect(page.getByText("주인공: 모사 / 함께할 친구: 브라키")).toBeVisible();
  await page.getByRole("radio", { name: "약 2분", exact: true }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${test.info().project.name}-selection.png`, fullPage: true });
});

test("desktop focus trap and shared Escape/cancel draft handling", async ({ page }) => {
  let apiCalls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/")) apiCalls += 1; });
  await page.goto("/");
  await chooseFriends(page, ["스테고사우루스"]);
  const trigger = pickerTrigger(page, "친구 바꾸기");
  await trigger.click();
  const dialog = pickerSurface(page);
  await page.getByRole("tab", { name: /바다/ }).click();
  await page.getByRole("button", { name: "모사사우루스", exact: true }).click();
  const done = page.getByRole("button", { name: "선택 완료" });
  await done.focus();
  if (!isMobile(page)) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "친구 선택 닫기" })).toBeFocused();
    await page.keyboard.press("Shift+Tab"); await expect(done).toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  if (!isMobile(page)) await expect(trigger).toBeFocused();
  else await expect(page).toHaveURL("/");
  await expect(page.getByText("주인공: 스테고", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await trigger.click();
  await expect(page.getByRole("button", { name: "스테고사우루스", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "모사사우루스", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "스테고사우루스 선택 해제" }).click();
  await expect(done).toBeDisabled();
  await page.getByRole("button", { name: "친구 선택 닫기", exact: true }).click();
  await expect(page.getByText("주인공: 스테고", { exact: true })).toBeVisible();
  expect(apiCalls).toBe(0);
});

test("whole-card border selection, name search and new catalog IDs", async ({ page }) => {
  const count = { story: 0, speech: 0 }; await mockStory(page, count);
  await page.goto("/");
  await pickerTrigger(page, "친구 고르기").click();
  const dialog = pickerSurface(page);
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  const search = page.getByRole("searchbox", { name: "공룡 이름 검색" });
  await search.fill("브론토");
  const card = page.getByRole("button", { name: "브론토사우루스", exact: true });
  const unselectedBorder = await card.evaluate((node) => getComputedStyle(node).borderTopColor);
  await card.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  expect(await card.evaluate((node) => getComputedStyle(node).borderTopColor)).not.toBe(unselectedBorder);
  await page.getByRole("tab", { name: /바다/ }).click();
  await expect(page.getByText(/이 분류에는 찾는 친구가 없어요/)).toBeVisible();
  await page.getByRole("button", { name: "전체에서 찾기" }).click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await search.fill("없는공룡이름");
  await expect(page.getByText("검색 결과 0종")).toBeVisible();
  await expect(page.getByRole("button", { name: "브론토사우루스 선택 해제" })).toBeVisible();
  await search.fill("TYLOSAURUS");
  await page.getByRole("button", { name: "틸로사우루스", exact: true }).click();
  await page.getByRole("button", { name: "선택 완료" }).click();
  expect(count).toEqual({ story: 0, speech: 0 });
  await expect(page.getByText("주인공: 브론토 / 함께할 친구: 틸로")).toBeVisible();
  await page.getByRole("button", { name: "동화 만들기", exact: true }).click();
  await expect(page.getByRole("heading", { name: content.title })).toBeVisible();
  expect(count).toEqual({ story: 1, speech: 0 });
});

test("responsive picker gives cards space and keeps navigation and confirmation visible", async ({ page }) => {
  await page.goto("/");
  await pickerTrigger(page).click();
  const surface = pickerSurface(page);
  const card = page.getByRole("button", { name: "스테고사우루스", exact: true });
  const description = card.getByText("신중하고 다정하며, 주변을 잘 살펴봐요");
  if (isMobile(page)) {
    await expect(page).toHaveURL("/characters");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const bounds = (await surface.boundingBox())!;
    expect(bounds.x).toBe(0); expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(page.viewportSize()!.width);
    expect(bounds.height).toBe(page.viewportSize()!.height);
    await expect(description).toBeHidden();
    expect((await page.getByRole("tabpanel").boundingBox())!.height).toBeGreaterThan(450);
  } else {
    await expect(page).toHaveURL("/");
    expect((await surface.boundingBox())!.width).toBeLessThan(page.viewportSize()!.width);
    await expect(description).toBeVisible();
  }
  const initialBounds = await surface.boundingBox();
  const initialPanelWidth = (await page.getByRole("tabpanel").boundingBox())!.width;
  for (const tab of [/바다/, /초식/, /전체/]) {
    await page.getByRole("tab", { name: tab }).click();
    expect(await surface.boundingBox()).toEqual(initialBounds);
  }
  const search = page.getByRole("searchbox", { name: "공룡 이름 검색" });
  for (const [query, count] of [["브론토", 1], ["없는공룡이름", 0]] as const) {
    await search.fill(query);
    await expect(page.getByRole("tabpanel").getByRole("button")).toHaveCount(count);
    expect(await surface.boundingBox()).toEqual(initialBounds);
    expect((await page.getByRole("tabpanel").boundingBox())!.width).toBe(initialPanelWidth);
    await expect(page.getByRole("button", { name: "선택 완료" })).toBeInViewport();
  }
  await expect(page.getByRole("button", { name: "검색 지우기" })).toHaveCount(0);
  // Chromium's native search-input X lives in browser UI, outside the DOM.
  const searchBounds = (await search.boundingBox())!;
  await search.click({ position: { x: searchBounds.width - 18, y: searchBounds.height / 2 } });
  await expect(search).toHaveValue("");
  await expect(page.getByRole("tabpanel").getByRole("button")).toHaveCount(60);
  await card.click();
  expect(await surface.boundingBox()).toEqual(initialBounds);
  await expect(description).toBeVisible();
  await page.screenshot({ path: `test-results/${test.info().project.name}-picker-selected.png` });
  await card.click();
  const tabs = page.getByRole("tablist"); const tabsY = (await tabs.boundingBox())!.y;
  await page.getByRole("tabpanel").evaluate((node) => { node.scrollTop = node.scrollHeight; });
  expect((await tabs.boundingBox())!.y).toBe(tabsY);
  await expect(page.getByRole("searchbox")).toBeInViewport();
  await expect(page.getByRole("button", { name: "선택 완료" })).toBeInViewport();
  await page.getByRole("button", { name: "틸로사우루스", exact: true }).click();
  await page.getByRole("button", { name: "선택 완료" }).click();
  await expect(page.getByText("주인공: 틸로", { exact: true })).toBeVisible();
});

test("picker page back and reload discard drafts, while confirmation preserves other choices", async ({ page }) => {
  let apiCalls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/")) apiCalls += 1; });
  await page.goto("/");
  await page.getByRole("radio", { name: /배려/ }).check();
  await page.getByRole("radio", { name: "약 2분", exact: true }).check();
  await chooseFriends(page, ["스테고사우루스"]);
  // Exercise the real route on both viewport sizes, including direct page visits.
  if (isMobile(page)) await pickerTrigger(page).click();
  else await page.evaluate(() => { (document.querySelector('a[href="/characters"]') as HTMLAnchorElement).click(); });
  await expect(page).toHaveURL("/characters");
  await page.getByRole("button", { name: "모사사우루스", exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("주인공: 스테고", { exact: true })).toBeVisible();
  if (isMobile(page)) await pickerTrigger(page).click();
  else await page.evaluate(() => { (document.querySelector('a[href="/characters"]') as HTMLAnchorElement).click(); });
  await expect(page.getByRole("button", { name: "모사사우루스", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "모사사우루스", exact: true }).click();
  await page.getByRole("button", { name: "선택 완료" }).click();
  await expect(page.getByRole("radio", { name: /배려/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "약 2분", exact: true })).toBeChecked();
  await expect(page.getByText("주인공: 스테고 / 함께할 친구: 모사")).toBeVisible();
  await page.goto("/characters");
  await expect(page.getByRole("button", { name: "선택 완료" })).toBeDisabled();
  await page.getByRole("button", { name: "스테고사우루스", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "선택 완료" })).toBeDisabled();
  await page.getByRole("button", { name: "친구 선택 닫기" }).click();
  await expect(page).toHaveURL("/");
  expect(apiCalls).toBe(0);
});

test("all 60 local restorations decode and have visible attribution", async ({ page }) => {
  let apiCalls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/")) apiCalls += 1; });
  await page.goto("/image-credits");
  await expect(page.getByRole("heading", { name: "그림 출처·이용 조건", exact: true })).toBeVisible();
  const articles = page.getByRole("article");
  await expect(articles).toHaveCount(60);
  const images = articles.getByRole("img");
  await expect(images).toHaveCount(60);
  await images.evaluateAll((nodes) => nodes.forEach((node) => { (node as HTMLImageElement).loading = "eager"; }));
  await expect.poll(() => images.evaluateAll((nodes) => nodes.filter((node) => {
    const image = node as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  }).length)).toBe(60);
  for (const character of characters) {
    const article = articles.filter({ has: page.getByRole("heading", { name: character.name, exact: true }) });
    const artwork = dinosaurImages[character.id];
    await expect(article).toContainText(artwork.author);
    await expect(article.getByRole("link", { name: artwork.license, exact: true })).toHaveAttribute("href", artwork.licenseUrl || artwork.source);
    await expect(article.getByRole("link", { name: "Wikimedia Commons 원본 파일" })).toHaveAttribute("href", artwork.source);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(apiCalls).toBe(0);
  await page.screenshot({ path: `test-results/${test.info().project.name}-credits.png` });

  // Developer contact sheets for reviewing every downloaded picture, without editing assets.
  if (test.info().project.name === "desktop-chromium") {
    const cards = await articles.evaluateAll((nodes) => nodes.map((node) => ({
      name: node.querySelector("h2")!.textContent!, src: node.querySelector("img")!.src,
    })));
    await page.setViewportSize({ width: 1200, height: 1100 });
    for (let start = 0; start < cards.length; start += 15) {
      await page.setContent('<main style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-family:sans-serif"></main>');
      await page.evaluate((batch) => {
        const main = document.querySelector("main")!;
        for (const card of batch) {
          const figure = document.createElement("figure"); figure.style.margin = "0";
          const image = document.createElement("img"); image.src = card.src; image.style.cssText = "width:100%;height:170px;object-fit:contain";
          const caption = document.createElement("figcaption"); caption.textContent = card.name;
          figure.append(image, caption); main.append(figure);
        }
      }, cards.slice(start, start + 15));
      await page.getByRole("img").evaluateAll((nodes) => Promise.all(nodes.map((node) => (node as HTMLImageElement).decode())));
      await page.screenshot({ path: `test-results/dinosaur-contact-${start / 15 + 1}.png`, fullPage: true });
    }
  }
});

test("missing artwork keeps card selection usable", async ({ page }) => {
  await page.route("**/dinosaurs/stegosaurus.png", (route) => route.fulfill({ status: 404, body: "Not found" }));
  await page.goto("/");
  await pickerTrigger(page, "친구 고르기").click();
  const card = page.getByRole("button", { name: "스테고사우루스", exact: true });
  await expect(card.getByText("그림을 불러오지 못했어요")).toBeVisible();
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "선택 완료" }).click();
  await expect(page.getByText("주인공: 스테고", { exact: true })).toBeVisible();
});

test("TTS error retries only audio; autoplay rejection keeps prepared audio", async ({ page }) => {
  const count = { story: 0, speech: 0 }; await mockStory(page, count);
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Test policy rejection", "NotAllowedError"));
  });
  await page.route("**/api/speech", async (route) => {
    count.speech += 1;
    if (count.speech === 1) return route.fulfill({ status: 503, json: { requestId: "test", error: { code: "UPSTREAM_UNAVAILABLE", message: "잠시 뒤 음성을 다시 준비해주세요.", retryable: true } } });
    await route.fulfill({ contentType: "audio/mpeg", body: silentMp3() });
  });
  await selectAndGenerate(page);
  await page.getByRole("button", { name: "읽어주기", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: content.title })).toBeVisible();
  await page.getByRole("button", { name: "음성 다시 준비하기" }).click();
  await expect(page.getByText("음성이 준비됐어요. 재생 버튼을 눌러주세요")).toBeVisible();
  await expect(page.getByLabel("동화 음성 플레이어")).toBeVisible();
  expect(count).toEqual({ story: 1, speech: 2 });
});

test("reset during a request leaves defaults and ignores late response", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/story", async (route) => {
    await gate;
    await route.fulfill({ json: storyFixture(route.request().postDataJSON()) }).catch(() => {});
  });
  await page.goto("/");
  await chooseFriends(page, ["스테고사우루스"]);
  await page.getByRole("button", { name: "동화 만들기", exact: true }).click();
  await expect(page.getByText("동화를 만들고 내용을 확인하고 있어요.")).toBeVisible();
  await expect(page).toHaveURL("/story");
  await expect(page.getByRole("button", { name: "선택 바꾸기" })).toBeEnabled();
  await page.getByRole("button", { name: "처음으로" }).click();
  release();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "동화 만들기", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: content.title })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("real local route returns configuration error with no API key", async ({ page, request }) => {
  await page.goto("/");
  await chooseFriends(page, ["스테고사우루스"]);
  await page.getByRole("button", { name: "동화 만들기", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("API 키·모델·목소리 설정");
  await expect(page.getByRole("button", { name: "동화 다시 만들기", exact: true })).toHaveCount(0);
  const crossSite = await request.post("/api/speech", { headers: { origin: "https://example.com" }, data: { text: "안녕하세요" } });
  expect(crossSite.status()).toBe(403);
  expect(crossSite.headers()["cache-control"]).toBe("no-store");
  const vehicle = await request.post("/api/story", { data: { world: "vehicle", characterIds: ["bus"], theme: "friendship", targetSeconds: 60 } });
  expect(vehicle.status()).toBe(400);
  expect((await vehicle.json()).error.code).toBe("INVALID_INPUT");
});

test("selection changes keep choices and release audio on returning", async ({ page }) => {
  const count = { story: 0, speech: 0 }; await mockStory(page, count);
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL;
    const released: string[] = [];
    Object.assign(window, { releasedAudioUrls: released });
    URL.revokeObjectURL = (url) => { released.push(url); revoke(url); };
  });
  await page.route("**/api/speech", async (route) => {
    count.speech += 1;
    await route.fulfill({ contentType: "audio/mpeg", body: silentMp3() });
  });
  await page.goto("/");
  await chooseFriends(page);
  await page.getByRole("radio", { name: /배려/ }).check();
  await page.getByRole("radio", { name: "약 2분", exact: true }).check();
  await page.getByRole("button", { name: "동화 만들기", exact: true }).click();
  await expect(page).toHaveURL("/story");
  await page.getByRole("button", { name: "읽어주기", exact: true }).click();
  const audio = page.getByLabel("동화 음성 플레이어");
  await expect(audio).toBeVisible();
  const oldAudio = await audio.elementHandle();
  await page.getByRole("button", { name: "선택 바꾸기" }).click();
  await expect(page).toHaveURL("/");
  expect(await oldAudio!.evaluate((node: HTMLAudioElement) => ({ paused: node.paused, src: node.getAttribute("src") }))).toEqual({ paused: true, src: null });
  expect(await page.evaluate(() => (window as unknown as { releasedAudioUrls: string[] }).releasedAudioUrls.length)).toBe(1);
  await expect(page.getByText("주인공: 스테고 / 함께할 친구: 모사")).toBeVisible();
  await expect(page.getByRole("radio", { name: /배려/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "약 2분", exact: true })).toBeChecked();
  expect(count).toEqual({ story: 1, speech: 1 });
  await page.getByRole("button", { name: "동화 만들기", exact: true }).click();
  await expect(page).toHaveURL("/story");
  await expect(page.getByRole("heading", { name: content.title })).toBeVisible();
  expect(count).toEqual({ story: 2, speech: 1 });
});

test("browser back cancels in-flight speech; forward never regenerates", async ({ page }) => {
  const count = { story: 0, speech: 0 }; await mockStory(page, count);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/speech", async (route) => {
    count.speech += 1;
    await gate;
    await route.fulfill({ contentType: "audio/mpeg", body: silentMp3() }).catch(() => {});
  });
  await selectAndGenerate(page);
  await page.getByRole("button", { name: "읽어주기", exact: true }).click();
  await expect(page.getByText("음성을 준비하고 있어요.")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("주인공: 스테고 / 함께할 친구: 모사")).toBeVisible();
  await expect(page.getByRole("button", { name: "동화 만들기", exact: true })).toBeEnabled();
  release();
  await page.goForward();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("동화 음성 플레이어")).toHaveCount(0);
  expect(count).toEqual({ story: 1, speech: 1 });
});

test("opening the reader directly does not generate a story", async ({ page }) => {
  const count = { story: 0, speech: 0 }; await mockStory(page, count);
  await page.goto("/story");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "동화 만들기", exact: true })).toBeDisabled();
  expect(count).toEqual({ story: 0, speech: 0 });
});
