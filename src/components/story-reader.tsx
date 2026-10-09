"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { characterById, themes, worlds } from "@/src/lib/story-options";
import { formatDuration } from "@/src/lib/story-text";
import type { ApiError } from "@/src/lib/story-schema";
import { useStorySession } from "./story-session";
import { StoryShell } from "./story-shell";
import { StoryLoading } from "./story-loading";

function ErrorNotice({ error }: { error: ApiError }) {
  return <div className="error" role="alert"><p>{error.message}</p>
    {error.requestId && <details className="mt-2 text-xs"><summary>오류 확인 정보</summary><p className="mt-2">요청 번호: {error.requestId}</p><p>오류 코드: {error.code}</p></details>}
  </div>;
}

export function StoryReader() {
  const { audioRef, ...state } = useStorySession();
  const { story, storyStatus } = state;
  const router = useRouter();

  useEffect(() => {
    // Direct visits, refreshes and forward navigation never trigger paid work.
    if (storyStatus === "idle") router.replace("/");
  }, [storyStatus, router]);

  function goToSelection(reset: boolean) {
    if (reset) state.reset();
    else state.clearResults();
    router.replace("/");
  }

  if (storyStatus === "idle") {
    return <StoryShell reading><p role="status">이야기를 고르는 화면으로 이동하고 있어요.</p></StoryShell>;
  }

  return (
    <StoryShell reading>
      <div className="mb-5 flex flex-wrap gap-3">
        <button className="button" onClick={() => goToSelection(false)}>선택 바꾸기</button>
        <button className="button" onClick={() => goToSelection(true)}>처음으로</button>
      </div>
      <section aria-label="동화 결과" className="rounded-2xl border border-[#e0e4d8] bg-[#fffef9] p-5 sm:p-8">
        <div role="status" aria-live="polite" aria-atomic="true">
          {storyStatus === "loading" && <StoryLoading characterName={characterById(state.selection.characterIds[0])?.name} />}
          {storyStatus === "success" && <p className="helper mb-5">동화가 완성됐어요. 내용을 먼저 읽어보세요.</p>}
        </div>
        {state.storyError && <div className="space-y-4"><ErrorNotice error={state.storyError} />
          {state.storyError.retryable && <button className="button" onClick={state.generate} disabled={state.busy}>동화 다시 만들기</button>}
        </div>}
        {story && (
          <article>
            <p className="helper">{worlds.find((w) => w.id === story.selection.world)?.name} · {themes.find((t) => t.id === story.selection.theme)?.name} · 목표 길이 약 {story.selection.targetSeconds / 60}분</p>
            <p className="helper mt-1">{story.selection.characterIds.map((id, index) => `${index === 0 ? "주인공" : "함께할 친구"}: ${characterById(id)?.storyName}`).join(" / ")}</p>
            <h2 className="mt-5 break-words text-2xl font-bold leading-relaxed">{story.title}</h2>
            <div className="story-body mt-6">{story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            <div className="mt-8 space-y-4 border-t border-stone-200 pt-6">
              <p className="helper">AI가 만든 목소리로 읽어드려요. 보호자가 본문을 먼저 확인해주세요.</p>
              <div aria-live="polite" role="status">{state.speechStatus === "loading" && "음성을 준비하고 있어요."}</div>
              {state.speechError && <ErrorNotice error={state.speechError} />}
              {(state.speechStatus === "idle" || state.speechStatus === "loading" || (state.speechStatus === "error" && state.speechError?.retryable)) &&
                <button className="button primary" onClick={state.prepareSpeech} disabled={state.busy}>{state.speechStatus === "error" ? "음성 다시 준비하기" : "읽어주기"}</button>}
              <audio ref={audioRef} controls controlsList="nodownload" preload="metadata" hidden={!state.audioUrl} aria-label="동화 음성 플레이어" className="w-full"
                onLoadedMetadata={state.readDuration} onDurationChange={state.readDuration}
                onPlay={() => state.playbackEvent(true)} onPause={() => state.playbackEvent(false)} onEnded={() => state.playbackEvent(false)} onError={state.playbackError} />
              {state.audioUrl && <div className="space-y-3">
                <p className="helper">{state.playing ? "재생 중" : "음성 준비 완료"}{state.duration !== null && ` · 실제 길이 ${formatDuration(state.duration)}`}</p>
                <p role="status" className="helper">{state.playbackNote}</p>
                <button className="button" onClick={state.replay}>처음부터 다시 듣기</button>
              </div>}
              <button className="button block" disabled={state.busy} onClick={state.generate}>같은 조건으로 새 동화 만들기</button>
            </div>
          </article>
        )}
      </section>
    </StoryShell>
  );
}
