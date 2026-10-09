"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { charactersForWorld, worlds, themes, characterById, type Selection } from "@/src/lib/story-options";
import { CharacterPicker } from "./character-picker";
type Props = {
  selection: Selection; busy: boolean;
  onSelection: (selection: Selection) => void;
  onGenerate: () => void; onReset: () => void;
};
export function StoryForm({ selection, busy, onSelection, onGenerate, onReset }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerTrigger = useRef<HTMLButtonElement>(null);
  function closePicker() { setPickerOpen(false); pickerTrigger.current?.focus(); }
  return (
    <>
    <form onSubmit={(event) => { event.preventDefault(); onGenerate(); }} className="space-y-8">
      <fieldset disabled={busy} aria-describedby="character-help">
        <legend><span className="step">1</span>어떤 친구와 함께할까요?</legend>
        <fieldset className="mb-4">
          <legend className="sr-only">이야기 세계</legend>
          <div className="grid grid-cols-2 gap-3">
            {worlds.map((world) => <label key={world.id} className="choice">
              <input type="radio" name="world" value={world.id} checked={selection.world === world.id} onChange={() => {
                if (selection.world !== world.id) onSelection({ ...selection, world: world.id, characterIds: [] });
              }} />
              <span><strong className="break-keep">{world.name}</strong><small>{charactersForWorld(world.id).length}가지 친구</small></span>
            </label>)}
          </div>
          <p className="helper mt-2">다른 세계를 고르면 선택한 친구가 초기화돼요.</p>
        </fieldset>
        <p id="character-help" className="helper mb-3">먼저 고른 친구가 이야기의 주인공이 돼요.</p>
        {selection.characterIds.length ? <ol aria-label="이야기에 나올 친구" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selection.characterIds.map((id, index) => <li className="rounded-xl border border-[#c9d7c3] bg-[#f1f6eb] p-4" key={id}>
            <p className="helper font-semibold">{index === 0 ? "주인공" : "함께할 친구"}</p>
            <p className="mt-1 font-bold">{characterById(id)?.name}</p>
            <p className="helper mt-1">{characterById(id)?.description}</p>
          </li>)}
        </ol> : <div className="mb-4 rounded-xl border border-dashed border-[#c9d3c5] bg-[#fafbf7] p-5">
          <p className="font-semibold">이야기의 주인공을 만나보세요</p>
          <p className="helper mt-2">{selection.world === "vehicle" ? "일상·중장비·도움 차량" : "초식·육식·바다 친구"} {charactersForWorld(selection.world).length}종 중에서 골라요.</p>
        </div>}
        <Link href="/characters" className="button block w-full text-center sm:hidden" aria-disabled={busy || undefined}
          tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy) event.preventDefault(); }}>
          {selection.characterIds.length ? "친구 바꾸기" : "친구 고르기"}
        </Link>
        <button ref={pickerTrigger} type="button" className="button hidden w-full sm:block" aria-haspopup="dialog" aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? "character-picker" : undefined} onClick={() => setPickerOpen(true)}>
          {selection.characterIds.length ? "친구 바꾸기" : "친구 고르기"}
        </button>
        <p className="helper mt-3" role="status">
          {selection.characterIds.length ? selection.characterIds.map((id, index) =>
            `${index === 0 ? "주인공" : "함께할 친구"}: ${characterById(id)?.storyName}`).join(" / ") : "친구를 1명 이상 골라주세요"}
        </p>
      </fieldset>
      <fieldset disabled={busy}>
        <legend><span className="step">2</span>어떤 이야기를 들을까요?</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {themes.map((theme) => (
            <label className="choice" key={theme.id}>
              <input type="radio" name="theme" checked={selection.theme === theme.id}
                onChange={() => onSelection({ ...selection, theme: theme.id })} />
              <span><strong>{theme.name}</strong><small>{theme.description}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={busy}>
        <legend><span className="step">3</span>얼마나 들을까요?</legend>
        <div className="grid grid-cols-2 gap-3">
          {([60, 120] as const).map((seconds) => (
            <label className="choice" key={seconds}>
              <input type="radio" name="length" checked={selection.targetSeconds === seconds}
                onChange={() => onSelection({ ...selection, targetSeconds: seconds })} />
              <strong>약 {seconds / 60}분</strong>
            </label>
          ))}
        </div>
        <p className="helper mt-3">목표 길이예요. 실제 읽는 시간은 조금 달라질 수 있어요.</p>
      </fieldset>
      <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-6">
        <button className="button primary grow sm:grow-0" disabled={busy || !selection.characterIds.length} type="submit">동화 만들기</button>
        <button className="button" type="button" onClick={onReset}>처음으로</button>
      </div>
    </form>
    {pickerOpen && <CharacterPicker world={selection.world} selectedIds={selection.characterIds} onDismiss={closePicker} onConfirm={(ids) => {
      onSelection({ ...selection, characterIds: ids });
      closePicker();
    }} />}
    </>
  );
}
