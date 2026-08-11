"use client";

import { useEffect, useRef, useState } from "react";
import { QUOTES } from "@/lib/quotes";

const INTERVAL_MS = 9000;

/**
 * 대기 화면에서 과학자 문장을 천천히 넘긴다.
 *
 * 강의 시작 전 몇 분간 켜져 있는 화면이라, 눈에 띄되 소란스럽지 않아야 한다.
 * 그래서 페이드만 쓰고 슬라이드·회전은 넣지 않았다.
 */
export function QuoteRoll() {
  // 매번 같은 순서로 시작하면 지루하므로 시작 지점만 무작위로 잡는다.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const tick = setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % QUOTES.length);
        return;
      }
      // 먼저 흐려지고, 글자가 바뀐 뒤 다시 나타난다.
      setVisible(false);
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 450);
      timers.current.push(t);
    }, INTERVAL_MS);

    return () => {
      clearInterval(tick);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const q = QUOTES[index];

  return (
    <figure
      className="rounded-lg border border-hairline px-8 py-12 sm:px-12 sm:py-16"
      aria-label="과학자의 말"
    >
      <div
        className={`transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <blockquote className="t-subhead max-w-3xl">{q.text}</blockquote>
        <figcaption className="mt-8">
          <span className="t-card-title block">{q.author}</span>
          <span className="t-caption mt-2 block opacity-50">
            {q.role} · {q.source}
          </span>
        </figcaption>
      </div>

      {/* 몇 번째 문장인지만 알려 주는 최소 표시 */}
      <div className="mt-10 flex items-center gap-1.5" aria-hidden>
        {QUOTES.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-pill transition-all duration-500 ${
              i === index ? "w-6 bg-ink" : "w-1.5 bg-ink/15"
            }`}
          />
        ))}
      </div>
    </figure>
  );
}
