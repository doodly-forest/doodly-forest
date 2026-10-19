"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultSelection, type Language, type Selection } from "@/src/lib/story-options";
import { storyResponseSchema, type Story, type ApiError } from "@/src/lib/story-schema";
import { TIMEOUTS } from "@/src/lib/story-config";
import { narrationText } from "@/src/lib/story-text";
import { hasErrorName, withDeadline } from "@/src/lib/deadline";
import { ClientFailure, clientError, postJson } from "@/src/lib/client-api";

export function useStoryPlayground() {
  const [selection, setSelection] = useState<Selection>(defaultSelection);
  const [story, setStory] = useState<Story | null>(null);
  const [storyStatus, setStoryStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [speechStatus, setSpeechStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [storyError, setStoryError] = useState<ApiError | null>(null);
  const [speechError, setSpeechError] = useState<ApiError | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [playbackNote, setPlaybackNote] = useState("");
  const [playing, setPlaying] = useState(false);
  // English stories can be read aloud in English or as their Korean explanation.
  const [speechLanguage, setSpeechLanguage] = useState<Language>("en");
  const player = useRef<HTMLAudioElement | null>(null);
  const mediaUrl = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  const locked = useRef(false);

  const disposeMedia = useCallback(() => {
    if (player.current && mediaUrl.current) {
      player.current.pause();
      player.current.removeAttribute("src");
      player.current.load();
    }
    if (mediaUrl.current) URL.revokeObjectURL(mediaUrl.current);
    mediaUrl.current = null;
  }, []);
  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    if (!node) disposeMedia();
    player.current = node;
  }, [disposeMedia]);
  const cancelRequest = useCallback(() => {
    version.current += 1;
    request.current?.abort();
    request.current = null;
    locked.current = false;
  }, []);
  useEffect(() => () => { cancelRequest(); disposeMedia(); }, [cancelRequest, disposeMedia]);

  const clearSpeech = useCallback(() => {
    disposeMedia();
    setSpeechStatus("idle"); setSpeechError(null); setAudioUrl(null);
    setDuration(null); setPlaybackNote(""); setPlaying(false);
  }, [disposeMedia]);
  const clearResults = useCallback(() => {
    cancelRequest();
    clearSpeech();
    setStory(null); setStoryStatus("idle"); setStoryError(null);
    setSpeechLanguage("en");
  }, [cancelRequest, clearSpeech]);
  function chooseSpeechLanguage(next: Language) {
    if (locked.current || next === speechLanguage) return;
    // Prepared audio belongs to the previous language; never reuse it.
    clearSpeech();
    setSpeechLanguage(next);
  }
  function updateSelection(next: Selection) {
    if (locked.current || JSON.stringify(next) === JSON.stringify(selection)) return;
    clearResults();
    setSelection(next);
  }
  function reset() { clearResults(); setSelection(defaultSelection()); }
  function beginRequest() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++version.current;
    locked.current = true;
    return { id, controller };
  }
  function current(id: number) { return id === version.current; }
  function finish(id: number) {
    if (current(id)) { locked.current = false; request.current = null; }
  }
  async function generate() {
    if (locked.current || !selection.characterIds.length) return;
    const snapshot = { ...selection, characterIds: [...selection.characterIds] };
    clearResults();
    const { id, controller } = beginRequest();
    setStoryStatus("loading");
    try {
      const result = await withDeadline(controller.signal, TIMEOUTS.storyClient, async (signal) => {
        const response = await postJson("/api/story", snapshot, signal);
        if (!response.headers.get("content-type")?.includes("application/json")) throw new ClientFailure({ code: "INVALID_RESPONSE", message: "올바른 동화를 받지 못했어요. 다시 만들어주세요.", retryable: true });
        const data = storyResponseSchema.safeParse(await response.json());
        if (!data.success || JSON.stringify(data.data.story.selection) !== JSON.stringify(snapshot)) throw new ClientFailure({ code: "INVALID_RESPONSE", message: "선택한 조건의 동화를 받지 못했어요. 다시 만들어주세요.", retryable: true });
        return data.data.story;
      });
      if (!current(id)) return;
      setStory(result); setStoryStatus("success");
    } catch (error) {
      if (!current(id)) return;
      setStoryError(clientError(error)); setStoryStatus("error");
    } finally { finish(id); }
  }
  async function play(id: number, url: string, restart = false) {
    const audio = player.current;
    if (!audio || !current(id) || mediaUrl.current !== url) return;
    if (restart) audio.currentTime = 0;
    setPlaybackNote("");
    try { await audio.play(); }
    catch (error) {
      if (!current(id) || mediaUrl.current !== url) return;
      setPlaybackNote(hasErrorName(error, "NotAllowedError")
        ? "음성이 준비됐어요. 재생 버튼을 눌러주세요"
        : "음성은 준비됐지만 재생하지 못했어요. 플레이어에서 다시 재생해주세요.");
    }
  }
  async function prepareSpeech() {
    if (locked.current || !story || mediaUrl.current) return;
    const { id, controller } = beginRequest();
    setSpeechStatus("loading"); setSpeechError(null);
    try {
      const blob = await withDeadline(controller.signal, TIMEOUTS.speechClient, async (signal) => {
        const translation = speechLanguage === "ko" ? story.translation : undefined;
        const body = translation ? { text: narrationText(translation), language: "ko" } : { text: story.narrationText, language: story.selection.language };
        const response = await postJson("/api/speech", body, signal);
        const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        if (contentType !== "audio/mpeg" && contentType !== "audio/wav") throw new ClientFailure({ code: "INVALID_AUDIO_RESPONSE", message: "올바른 음성을 받지 못했어요. 음성을 다시 준비해주세요.", retryable: true });
        const value = await response.blob();
        if (!value.size) throw new ClientFailure({ code: "INVALID_AUDIO_RESPONSE", message: "음성이 비어 있어요. 음성을 다시 준비해주세요.", retryable: true });
        return value;
      });
      if (!current(id)) return;
      const url = URL.createObjectURL(blob);
      mediaUrl.current = url;
      setAudioUrl(url); setSpeechStatus("ready");
      if (player.current) { player.current.src = url; player.current.load(); }
      // Playback policy is a separate state; it never causes another TTS request.
      void play(id, url);
    } catch (error) {
      if (!current(id)) return;
      setSpeechError(clientError(error)); setSpeechStatus("error");
    } finally { finish(id); }
  }
  function readDuration() {
    const value = player.current?.duration;
    if (mediaUrl.current && value !== undefined && Number.isFinite(value) && value > 0) setDuration(value);
  }
  function playbackEvent(isPlaying: boolean) {
    if (!mediaUrl.current) return;
    setPlaying(isPlaying);
    if (isPlaying) setPlaybackNote("");
  }
  function playbackError() {
    if (mediaUrl.current) { setPlaying(false); setPlaybackNote("이 브라우저에서 음성을 재생하지 못했어요. 플레이어에서 다시 시도해주세요."); }
  }
  function replay() { if (mediaUrl.current) void play(version.current, mediaUrl.current, true); }
  return {
    selection, story, storyStatus, speechStatus, storyError, speechError,
    audioUrl, duration, playing, playbackNote, audioRef, speechLanguage,
    busy: storyStatus === "loading" || speechStatus === "loading",
    updateSelection, reset, clearResults, generate, prepareSpeech, replay, chooseSpeechLanguage,
    readDuration, playbackEvent, playbackError,
  };
}
