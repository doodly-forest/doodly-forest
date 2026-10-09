"use client";

import Image from "next/image";
import { useState } from "react";
import { characterImages } from "@/src/lib/character-images";

export function CharacterArtwork({ characterId, name, eager = false }: { characterId: string; name: string; eager?: boolean }) {
  const artwork = characterImages[characterId];
  const [failed, setFailed] = useState(false);

  return <span className="character-artwork">
    {artwork && !failed ? <Image src={artwork.src} alt={`${name} ${artwork.kind === "original" ? "일러스트" : "복원도"}`}
      width={artwork.width} height={artwork.height} loading={eager ? "eager" : "lazy"} unoptimized
      onError={() => setFailed(true)} />
      : <span className="helper p-3 text-center">그림을 불러오지 못했어요</span>}
  </span>;
}
