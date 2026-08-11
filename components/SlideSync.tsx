"use client";

import type { SessionDoc } from "@/lib/types";

export function SlideSync({ session }: { session: SessionDoc }) {
  const slides = session.slides ?? [];
  if (slides.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 p-8 text-center text-muted">
        강사 화면을 봐 주세요. (슬라이드는 화면 공유로 진행합니다)
      </div>
    );
  }
  const idx = Math.min(Math.max(session.currentSlide ?? 0, 0), slides.length - 1);
  return (
    <figure className="space-y-2">
      {/* 외부 이미지 URL이라 next/image 최적화 대신 순수 img 사용 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slides[idx]}
        alt={`슬라이드 ${idx + 1}`}
        className="w-full rounded-xl border border-line bg-black object-contain"
      />
      <figcaption className="text-center text-sm text-muted">
        {idx + 1} / {slides.length}
      </figcaption>
    </figure>
  );
}
