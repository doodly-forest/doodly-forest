"use client";

import Image from "next/image";
import { useState } from "react";
import { dinosaurImages } from "@/src/lib/dinosaur-images";

export function CharacterArtwork({ characterId, name, eager = false }: { characterId: string; name: string; eager?: boolean }) {
  const artwork = dinosaurImages[characterId];
  const [failed, setFailed] = useState(false);

  return <span className="character-artwork">
    {artwork && !failed ? <Image src={artwork.src} alt={`${name} 복원도`}
      width={artwork.width} height={artwork.height} loading={eager ? "eager" : "lazy"} unoptimized
      onError={() => setFailed(true)} />
      : <span className="helper p-3 text-center">그림을 불러오지 못했어요</span>}
  </span>;
}
