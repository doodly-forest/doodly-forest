import type { Metadata } from "next";
import { CharacterSelection } from "@/src/components/character-selection";

export const metadata: Metadata = { title: "친구 고르기 | 오늘의 작은 동화" };

export default function CharactersPage() {
  return <CharacterSelection />;
}
