"use client";

import { useState } from "react";
import { patchParticipant } from "@/lib/db";
import type { AiReview, DesignDoc } from "@/lib/types";
import { Button, Notice } from "./ui";

export function AiReviewPanel({
  sessionId,
  participantId,
  kind,
  designDoc,
  outputSummary,
  review,
  disabled,
  disabledReason,
}: {
  sessionId: string;
  participantId: string;
  kind: "design" | "output";
  designDoc: DesignDoc;
  outputSummary?: string;
  review: AiReview | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, designDoc, outputSummary }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setError(data.error ?? "AI 검토에 실패했습니다.");
        return;
      }
      const field = kind === "design" ? "aiReviewDesign" : "aiReviewOutput";
      await patchParticipant(sessionId, participantId, {
        [field]: { text: data.text, createdAt: Date.now() } satisfies AiReview,
      });
    } catch {
      setError("네트워크 오류로 AI 검토를 받지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={loading || disabled}>
          {loading ? "검토 중…" : review ? "다시 검토받기" : "AI 검토 받기"}
        </Button>
        {disabled && disabledReason ? (
          <span className="t-body-sm max-w-md opacity-60">{disabledReason}</span>
        ) : null}
        {review ? (
          <span className="t-caption opacity-50">
            {new Date(review.createdAt).toLocaleTimeString("ko-KR")} 검토 완료
          </span>
        ) : null}
      </div>

      {error ? (
        <Notice tone="danger">
          {error}
          <div className="mt-2">
            <Button tone="ghost" onClick={run} disabled={loading}>
              다시 시도
            </Button>
          </div>
          <p className="mt-2 text-xs">
            계속 실패하면 <b>강사 검토로 대체</b>합니다. 손을 들어 강사를 불러 주세요.
          </p>
        </Notice>
      ) : null}

      {review ? (
        // AI 검토는 이 화면에서 가장 오래 읽히는 글이다. 색을 더하지 않고
        // surface-soft + 왼쪽 규칙선으로 인용문처럼 구분한다.
        <div className="t-body whitespace-pre-wrap rounded-md border-l-2 border-ink bg-surface-soft p-6">
          {review.text}
        </div>
      ) : (
        <p className="t-body-sm opacity-50">아직 AI 검토를 받지 않았습니다.</p>
      )}
    </div>
  );
}
