import type { Selection } from "../lib/story-options";
import { narrationText } from "../lib/story-text";

// Fixtures are imported only by tests, never by the application.
export const selection: Selection = { world: "dinosaur", characterIds: ["stegosaurus", "mosasaurus"], theme: "friendship", targetSeconds: 120, language: "ko" };
export const content = {
  title: "물가의 작은 약속",
  paragraphs: [
    "스테고사우루스 스테고는 물가에서 모사사우루스 모사를 만났어요.",
    "스테고가 잎사귀를 모으자 모사는 물길을 따라 잎사귀를 살며시 밀어주었어요.",
    "두 친구는 함께 만든 작은 잎사귀 길을 보며 편안하게 쉬었어요.",
  ],
};
export const vehicleSelection: Selection = { world: "vehicle", characterIds: ["bus", "excavator"], theme: "kindness", targetSeconds: 60, language: "ko" };
export const vehicleContent = {
  title: "마을의 작은 쉼터",
  paragraphs: [
    '버스 부비는 굴착기 굴리에게 말했어요. "친구들과 쉴 곳을 함께 만들어 볼까?"',
    '굴리가 고개를 끄덕였어요. "좋아! 내가 바닥을 고르게 만들게." 부비는 천천히 움직이며 친구들에게 길을 안내했어요.',
    '두 친구는 일을 마치고 나란히 쉬었어요. "함께하니 참 좋다!" 부비가 웃으며 말했어요.',
  ],
};
export const englishSelection: Selection = { world: "dinosaur", characterIds: ["stegosaurus", "mosasaurus"], theme: "friendship", targetSeconds: 60, language: "en" };
export const englishContent = {
  title: "The Little Leaf Path",
  paragraphs: [
    "Stegosaurus Stego walked to the shore. Mosasaurus Mosa swam up to say hi.",
    '"I want to make a leaf path," said Stego. "I can help!" said Mosa.',
    "Stego picked up leaves. Mosa pushed them along the water. They smiled at their path and rested together.",
  ],
};
export const englishTranslation = {
  title: "작은 잎사귀 길",
  paragraphs: [
    "스테고사우루스 스테고가 물가로 걸어갔어요. 모사사우루스 모사가 헤엄쳐 와서 인사했어요.",
    '"잎사귀 길을 만들고 싶어." 스테고가 말했어요. "내가 도와줄게!" 모사가 말했어요.',
    "스테고는 잎사귀를 주웠어요. 모사는 물 위로 잎사귀를 밀었어요. 둘은 길을 보며 웃고 함께 쉬었어요.",
  ],
};
export const englishModelContent = { ...englishContent, koreanTitle: englishTranslation.title, koreanParagraphs: englishTranslation.paragraphs };
export function storyFixture(chosen: Selection = selection) {
  const generated = chosen.language === "en" ? englishContent : chosen.world === "vehicle" ? vehicleContent : content;
  const translation = chosen.language === "en" ? { translation: englishTranslation } : {};
  return { requestId: "test-request", story: { id: "11111111-1111-4111-8111-111111111111", ...generated, ...translation, narrationText: narrationText(generated), selection: chosen } };
}
export function modelFixture(value: unknown = content) {
  return { object: "response", id: "resp_test", status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(value), annotations: [] }] }] };
}
