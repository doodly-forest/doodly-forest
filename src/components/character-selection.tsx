"use client";

import { useRouter } from "next/navigation";
import { CharacterPicker } from "./character-picker";
import { useStorySession } from "./story-session";

export function CharacterSelection() {
  const { selection, updateSelection } = useStorySession();
  const router = useRouter();

  // Replace the picker on completion so browser Back cannot reopen a stale draft.
  // This also provides a safe destination when /characters was opened directly.
  function returnToSelection() { router.replace("/"); }

  return <CharacterPicker mode="page" world={selection.world} selectedIds={selection.characterIds}
    onDismiss={returnToSelection} onConfirm={(ids) => {
      updateSelection({ ...selection, characterIds: ids });
      returnToSelection();
    }} />;
}
