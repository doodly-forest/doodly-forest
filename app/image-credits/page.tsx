import type { Metadata } from "next";
import Link from "next/link";
import { CharacterArtwork } from "@/src/components/character-artwork";
import { characters } from "@/src/lib/story-options";
import { characterImages } from "@/src/lib/character-images";

export const metadata: Metadata = { title: "그림 출처 | 오늘의 작은 동화" };

export default function ImageCreditsPage() {
  return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
    <Link href="/" className="credits-link">← 동화 만들기로</Link>
    <h1 className="mt-4 text-3xl font-bold">그림 출처·이용 조건</h1>
    <p className="helper mt-4">공룡·바다 친구는 Wikimedia Commons의 공개 복원도예요. 복원도는 화석과 연구를 바탕으로 추정한 모습이며, 색과 세부 모습은 그림마다 다를 수 있어요. 그림 속 크기는 서로 비교할 수 있는 비율이 아니에요.</p>
    <p className="helper mt-2">자동차는 이 프로젝트에서 직접 만든 일러스트예요. 차량마다 특징을 알아보기 쉽게 단순하게 그렸어요.</p>
    <p className="helper mt-2">외부에서 가져온 복원도를 다시 사용할 때는 아래 원본과 이용 조건을 확인해 주세요. CC BY-SA 그림의 수정본을 배포할 때는 해당 라이선스의 동일조건변경허락 규정을 따라야 해요.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character, index) => {
        const artwork = characterImages[character.id];
        return <article key={character.id} id={character.id} className="min-w-0 rounded-2xl border border-[#d6ddd2] bg-white p-4 [overflow-wrap:anywhere]">
          <CharacterArtwork characterId={character.id} name={character.name} eager={index < 3} />
          <h2 className="mt-4 font-bold">{character.name}</h2>
          <p className="helper mt-2">{artwork.title.replace(/^File:/, "")}</p>
          <dl className="helper mt-3 space-y-2">
            <div><dt className="font-semibold">작가</dt><dd>{artwork.author}</dd></div>
            {artwork.kind === "commons" && <>
              <div><dt className="font-semibold">이용 조건</dt><dd><a className="underline" href={artwork.licenseUrl || artwork.source} target="_blank" rel="noopener noreferrer">{artwork.license}</a></dd></div>
              <div><dt className="font-semibold">원본 출처</dt><dd><a className="underline" href={artwork.source} target="_blank" rel="noopener noreferrer">Wikimedia Commons 원본 파일</a></dd></div>
              {artwork.credit && <div><dt className="font-semibold">원본 크레딧</dt><dd>{artwork.credit}</dd></div>}
            </>}
            <div><dt className="font-semibold">사용본</dt><dd>{artwork.changes}</dd></div>
            {artwork.kind === "commons" && <div><dt className="font-semibold">확인일</dt><dd>{artwork.retrievedAt}</dd></div>}
          </dl>
        </article>;
      })}
    </div>
  </main>;
}
