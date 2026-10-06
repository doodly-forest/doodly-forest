import type { Metadata } from "next";
import { StorySessionProvider } from "@/src/components/story-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "오늘의 작은 동화",
  description: "좋아하는 친구를 고르고, 짧은 한국어 동화를 만들어 들어보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body><StorySessionProvider>{children}</StorySessionProvider></body>
    </html>
  );
}
