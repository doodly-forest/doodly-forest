import type { Selection } from "../lib/story-options";
import { narrationText } from "../lib/story-text";

// Fixtures are imported only by tests, never by the application.
export const selection: Selection = { world: "dinosaur", characterIds: ["stegosaurus", "mosasaurus"], theme: "friendship", targetSeconds: 120 };
export const content = {
  title: "물가의 작은 약속",
  paragraphs: [
    "스테고사우루스 스테고는 물가에서 모사사우루스 모사를 만났어요.",
    "스테고가 잎사귀를 모으자 모사는 물길을 따라 잎사귀를 살며시 밀어주었어요.",
    "두 친구는 함께 만든 작은 잎사귀 길을 보며 편안하게 쉬었어요.",
  ],
};
export function storyFixture(chosen: Selection = selection) {
  return { requestId: "test-request", story: { id: "11111111-1111-4111-8111-111111111111", ...content, narrationText: narrationText(content), selection: chosen } };
}
export function modelFixture(value: unknown = content) {
  return { object: "response", id: "resp_test", status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(value), annotations: [] }] }] };
}
