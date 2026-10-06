"use client";

import { useRouter } from "next/navigation";
import { StoryForm } from "./story-form";
import { useStorySession } from "./story-session";
import { StoryShell } from "./story-shell";

export function StorySelection() {
  const state = useStorySession();
  const router = useRouter();

  function createStory() {
    if (state.busy || !state.selection.characterIds.length) return;
    // Start only from this explicit click, never from a page mount effect.
    void state.generate();
    router.push("/story");
  }

  return (
    <StoryShell>
      <section aria-label="동화 고르기" className="rounded-2xl border border-[#e0e4d8] bg-white p-4 sm:p-8">
        <StoryForm selection={state.selection} busy={state.busy}
          onSelection={state.updateSelection}
          onGenerate={createStory} onReset={state.reset} />
      </section>
    </StoryShell>
  );
}
