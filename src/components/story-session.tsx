"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useStoryPlayground } from "@/src/hooks/use-story-playground";

const StorySession = createContext<ReturnType<typeof useStoryPlayground> | null>(null);

export function StorySessionProvider({ children }: { children: ReactNode }) {
  const state = useStoryPlayground();
  const { clearResults } = state;
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const leavingReader = previousPath.current === "/story" && pathname !== "/story";
    previousPath.current = pathname;
    // Browser back/forward must cancel work too, not only our navigation buttons.
    if (leavingReader) clearResults();
  }, [pathname, clearResults]);

  // Shared layout memory survives client navigation, never a full page reload.
  return <StorySession.Provider value={state}>{children}</StorySession.Provider>;
}

export function useStorySession() {
  const state = useContext(StorySession);
  if (!state) throw new Error("StorySessionProvider is required");
  return state;
}
