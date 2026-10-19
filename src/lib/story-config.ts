export const STORY_LIMITS = { title: 60, minParagraphs: 3, maxParagraphs: 8, narration: 1800, requestBytes: 16 * 1024 } as const;
// 분량은 초기 가설이며 실제 낭독 시간은 오디오 메타데이터로 확인한다.
export const LENGTH_TARGETS = {
  60: { characters: [250, 400], paragraphs: [3, 5] },
  120: { characters: [500, 750], paragraphs: [5, 7] },
} as const;
// 영어는 글자 수 대신 단어 수로 잡는다. 120초 상한도 낭독문 1800자 안에 들어온다.
export const ENGLISH_LENGTH_TARGETS = {
  60: { words: [90, 140], paragraphs: [3, 5] },
  120: { words: [180, 260], paragraphs: [5, 7] },
} as const;
export const TIMEOUTS = {
  text: 60_000, moderation: 15_000, speech: 90_000,
  storyServer: 90_000, speechServer: 120_000,
  storyClient: 105_000, speechClient: 135_000,
} as const;
export const PROMPT_VERSION = "2026-10-16.v6";
