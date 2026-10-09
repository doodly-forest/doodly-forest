"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { characterById, characterCategories, characters, type CharacterCategory } from "@/src/lib/story-options";
import { CharacterArtwork } from "./character-artwork";

const tabs = [{ id: "all", name: "전체" }, ...characterCategories] as const;
type Props = { selectedIds: string[]; onConfirm: (ids: string[]) => void; onDismiss: () => void; mode?: "dialog" | "page" };

export function CharacterPicker({ selectedIds, onConfirm, onDismiss, mode = "dialog" }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [draft, setDraft] = useState(() => [...selectedIds]);
  const [category, setCategory] = useState<CharacterCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const query = search.trim().normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const visible = characters.filter((character) => (category === "all" || character.category === category) &&
    [character.name, character.storyName, character.id].some((name) => name.toLowerCase().replace(/\s+/g, "").includes(query)));

  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    tabButtons.current[0]?.focus();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, [mode]);

  function dismiss() {
    dialog.current?.close();
    onDismiss();
  }
  function toggle(id: string) {
    if (!draft.includes(id) && draft.length >= 2) {
      setNotice("친구는 최대 2명까지 고를 수 있어요");
      return;
    }
    setDraft(draft.includes(id) ? draft.filter((value) => value !== id) : [...draft, id]);
    setNotice("");
  }
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
      : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setCategory(tabs[next].id);
    tabButtons.current[next]?.focus();
  }
  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]")]
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    // Native dialogs make the page inert, but Tab can still enter browser chrome.
    // Wrap at the edges so the complete keyboard sequence stays in this picker.
    const target = event.shiftKey && document.activeElement === first ? last
      : !event.shiftKey && document.activeElement === last ? first : null;
    if (target) { event.preventDefault(); target.focus(); }
  }

  const Heading = mode === "page" ? "h1" : "h2";
  const content = (
      <div className="picker-layout">
        <header className="picker-header shrink-0 px-4 pt-5 sm:px-6">
          <div className="picker-heading flex items-start justify-between gap-3">
            <div><p className="picker-count helper">공룡과 바다 친구 {characters.length}종</p>
              <Heading id="picker-title" className="mt-1 text-xl font-bold">함께할 친구 고르기</Heading></div>
            <button type="button" className="picker-dismiss button" onClick={dismiss} aria-label="친구 선택 닫기">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <p id="picker-help" className="helper mt-3"><span className="hidden sm:inline">1~2명을 골라주세요. 먼저 고른 친구가 주인공이 돼요.</span><span className="sm:hidden">최대 2명 · 먼저 고른 친구가 주인공</span></p>
          <div className="picker-search-row mt-3">
            <label htmlFor="character-search" className="sr-only">공룡 이름 검색</label>
            <input id="character-search" type="search" value={search} maxLength={60} onChange={(event) => setSearch(event.target.value)}
              placeholder="이름이나 별명으로 찾아보세요" className="character-search" />
          </div>
          <div role="tablist" aria-label="친구 분류" className="picker-tabs mt-4">
            {tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`picker-tab-${tab.id}`}
              aria-controls={`picker-panel-${tab.id}`} aria-selected={category === tab.id} tabIndex={category === tab.id ? 0 : -1}
              ref={(element) => { tabButtons.current[index] = element; }}
              onClick={() => setCategory(tab.id)} onKeyDown={(event) => moveTab(event, index)}>
              {tab.name} <span>{tab.id === "all" ? characters.length : characters.filter((character) => character.category === tab.id).length}</span>
            </button>)}
          </div>
        </header>
        {tabs.map((tab) => <div key={tab.id} role="tabpanel" id={`picker-panel-${tab.id}`} aria-labelledby={`picker-tab-${tab.id}`}
          hidden={category !== tab.id} className="picker-panel px-4 py-4 sm:px-6">
          {category === tab.id && <>
            <p className="helper mb-4">{category === "all" ? "여러 시대의 친구들이 함께하는 상상 동화예요." : characterCategories.find((item) => item.id === category)?.description}</p>
            {query && <p role="status" className="helper mb-3">검색 결과 {visible.length}종</p>}
            {!visible.length && <div className="py-6 text-center">
              <p className="helper">이 분류에는 찾는 친구가 없어요. 다른 이름이나 전체 탭에서 찾아보세요.</p>
              {category !== "all" && <button type="button" className="button mt-3" onClick={() => setCategory("all")}>전체에서 찾기</button>}
            </div>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((character, cardIndex) => {
                const index = draft.indexOf(character.id);
                return <button type="button" className="character-card" key={character.id}
                  aria-label={character.name} aria-pressed={index !== -1} onClick={() => toggle(character.id)}>
                  <CharacterArtwork characterId={character.id} name={character.name} eager={cardIndex < 3} />
                  <strong>{character.name}</strong>
                  <span className="character-nickname">{character.storyName}</span>
                  <span className="character-description">{character.description}</span>
                  {index !== -1 && <span className="character-role">{index === 0 ? "주인공" : "함께할 친구"}</span>}
                </button>;
              })}
            </div>
          </>}
        </div>)}
        <footer className="picker-footer shrink-0 border-t border-[#e0e4d8] bg-[#f7f9f3] px-4 py-4 sm:px-6">
          <div className="picker-summary flex items-center justify-between gap-2">
            <p className="helper font-semibold" aria-live="polite">선택한 친구 {draft.length}/2</p>
            <a href="/image-credits" target="_blank" rel="noopener noreferrer" className="helper underline underline-offset-4">그림 출처·이용 조건 <span className="sr-only">(새 탭)</span>↗</a>
          </div>
          <ol aria-label="선택한 친구" className="picker-selected mt-2 flex flex-wrap gap-2">
            {draft.map((id, index) => <li key={id}>
              <button type="button" className="selected-chip" onClick={() => toggle(id)} aria-label={`${characterById(id)?.name} 선택 해제`}>
                {index === 0 ? "주인공" : "함께할 친구"}: {characterById(id)?.storyName} <span aria-hidden="true">×</span>
              </button>
            </li>)}
          </ol>
          <p role="status" className="notice">{notice}</p>
          <div className="picker-actions mt-2 flex">
            <button type="button" className="button primary grow" disabled={!draft.length} onClick={() => {
              dialog.current?.close();
              onConfirm([...draft]);
            }}>선택 완료</button>
          </div>
        </footer>
      </div>
  );
  if (mode === "page") return <main id="character-picker" className="character-picker-page" aria-labelledby="picker-title" aria-describedby="picker-help"
    onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); dismiss(); } }}>{content}</main>;
  return <dialog ref={dialog} id="character-picker" aria-modal="true" aria-labelledby="picker-title" aria-describedby="picker-help"
    className="character-dialog" onKeyDown={keepFocusInside} onCancel={(event) => { event.preventDefault(); dismiss(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
    }}>{content}</dialog>;
}
