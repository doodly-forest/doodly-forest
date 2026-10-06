import type { ReactNode } from "react";

export function StoryShell({ children, reading = false }: { children: ReactNode; reading?: boolean }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-9">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-[#5b7358]">{reading ? "오늘의 작은 동화" : "함께 읽는 작은 시간"}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{reading ? "동화 읽기" : "오늘의 작은 동화"}</h1>
        <p className="mt-4 leading-7 text-[#59685b]">{reading ? "이야기를 먼저 읽어보고, 따뜻한 목소리로 들어보세요." : "좋아하는 친구를 고르고, 짧은 이야기를 만들어보세요."}</p>
        <ol aria-label="동화 만들기 순서" className="mt-5 flex gap-5 text-sm text-[#59685b]">
          <li aria-current={!reading ? "step" : undefined} className={!reading ? "font-bold text-[#365e45]" : ""}>1. 친구와 이야기 고르기</li>
          <li aria-current={reading ? "step" : undefined} className={reading ? "font-bold text-[#365e45]" : ""}>2. 읽고 듣기</li>
        </ol>
      </header>
      {children}
      <footer className="helper mt-7 space-y-2 px-1">
        <p>AI가 만든 이야기와 목소리예요. 보호자가 내용을 먼저 확인해주세요.</p>
        <p>선택과 결과는 새로고침하면 초기화됩니다.</p>
      </footer>
    </main>
  );
}
