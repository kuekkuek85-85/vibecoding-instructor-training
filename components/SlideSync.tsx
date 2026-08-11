"use client";

import type { SessionDoc } from "@/lib/types";

export function SlideSync({ session }: { session: SessionDoc }) {
  const slides = session.slides ?? [];
  if (slides.length === 0) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-hairline p-10 text-center">
        <p className="t-body-sm opacity-50">
          강사 화면을 봐 주세요. 슬라이드는 화면 공유로 진행합니다.
        </p>
      </div>
    );
  }
  const idx = Math.min(Math.max(session.currentSlide ?? 0, 0), slides.length - 1);
  return (
    <figure className="space-y-3">
      {/* 외부 이미지 URL이라 next/image 최적화 대신 순수 img 사용 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slides[idx]}
        alt={`슬라이드 ${idx + 1}`}
        className="w-full rounded-md border border-hairline object-contain"
      />
      <figcaption className="t-caption text-center opacity-50">
        {String(idx + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
      </figcaption>
    </figure>
  );
}
