import type { Metadata } from "next";
import { StoryReader } from "@/src/components/story-reader";

export const metadata: Metadata = { title: "동화 읽기 | 오늘의 작은 동화" };

export default function StoryPage() {
  return <StoryReader />;
}
