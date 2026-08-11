"use client";

import { useState } from "react";
import { createSession, patchParticipant, patchSession } from "@/lib/db";
import { SUBJECTS } from "@/lib/seed-data";
import {
  designReviewComplete,
  PHASE_LABEL,
  PHASES,
  phaseToStage,
  type Participant,
  type Phase,
  type SessionDoc,
  type Subject,
} from "@/lib/types";
import { useSession } from "@/lib/useSession";
import { Badge, Button, Card, Field, Notice, SectionTitle } from "./ui";

export function AdminDashboard() {
  const { sessionId, session, participants, loading, error } = useSession();
  const [showSeed, setShowSeed] = useState(false);

  if (loading) return <Wrap>불러오는 중…</Wrap>;
  if (error)
    return (
      <Wrap>
        <Notice tone="danger">{error}</Notice>
      </Wrap>
    );

  if (!sessionId || !session || showSeed) {
    return (
      <Wrap>
        <SeedPanel
          hasExisting={Boolean(sessionId)}
          onDone={() => setShowSeed(false)}
          onCancel={sessionId ? () => setShowSeed(false) : undefined}
        />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <SessionBar
        sessionId={sessionId}
        session={session}
        participants={participants}
        onNewSession={() => setShowSeed(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {participants.map((p) => (
          <ParticipantCard
            key={p.id}
            sessionId={sessionId}
            p={p}
            isPresenter={session.presenterId === p.id}
          />
        ))}
      </div>

      {session.phase === "wrapup" ? (
        <Card>
          <SectionTitle hint="마무리 낭독용">
            내 수업에 가져갈 것 하나
          </SectionTitle>
          <ul className="space-y-3">
            {participants.map((p) => (
              <li key={p.id} className="rounded-lg border border-line bg-surface-2 p-4">
                <div className="mb-1 text-sm text-muted">
                  {p.name} · {p.subject}
                </div>
                <div className="text-lg">{p.takeaway || "—"}</div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-6">
      <h1 className="text-xl font-bold">강사 대시보드</h1>
      {children}
    </main>
  );
}

/* ---------------- 세션 생성 ---------------- */

function SeedPanel({
  hasExisting,
  onDone,
  onCancel,
}: {
  hasExisting: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [people, setPeople] = useState<{ name: string; subject: Subject }[]>([
    { name: "", subject: "물리" },
    { name: "", subject: "물리" },
    { name: "", subject: "화학" },
    { name: "", subject: "화학" },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card>
      <SectionTitle hint="수강생 4명의 이름과 과목을 입력하면 새 세션이 열립니다.">
        세션 시작
      </SectionTitle>
      <div className="space-y-3">
        {people.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <Field label={`참가자 ${i + 1} 이름`}>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => {
                    const next = [...people];
                    next[i] = { ...next[i], name: e.target.value };
                    setPeople(next);
                  }}
                />
              </Field>
            </div>
            <div className="w-32">
              <Field label="과목">
                <select
                  value={p.subject}
                  onChange={(e) => {
                    const next = [...people];
                    next[i] = { ...next[i], subject: e.target.value as Subject };
                    setPeople(next);
                  }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        ))}
        {err ? <Notice tone="danger">{err}</Notice> : null}
        <div className="flex gap-3">
          <Button
            disabled={busy || people.some((p) => !p.name.trim())}
            onClick={async () => {
              // 진행 중 세션을 갈아엎는 실수를 막는다.
              if (
                hasExisting &&
                !window.confirm(
                  "진행 중인 세션이 있습니다. 새 세션을 만들면 수강생 4명이 모두 이름 선택 화면으로 돌아갑니다. 계속할까요?"
                )
              ) {
                return;
              }
              setBusy(true);
              setErr(null);
              try {
                await createSession(people);
                onDone();
              } catch (e) {
                setErr(
                  `세션 생성 실패: ${e instanceof Error ? e.message : String(e)}`
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "만드는 중…" : "새 세션 만들기"}
          </Button>
          {onCancel ? (
            <Button tone="ghost" onClick={onCancel}>
              취소
            </Button>
          ) : null}
        </div>
        <Notice tone="warn">
          새 세션을 만들면 수강생 화면이 모두 이름 선택으로 초기화됩니다.
        </Notice>
      </div>
    </Card>
  );
}

/* ---------------- 전체 제어 ---------------- */

function SessionBar({
  sessionId,
  session,
  participants,
  onNewSession,
}: {
  sessionId: string;
  session: SessionDoc;
  participants: Participant[];
  onNewSession: () => void;
}) {
  const [slidesText, setSlidesText] = useState((session.slides ?? []).join("\n"));
  const [showSlides, setShowSlides] = useState(false);
  const slideCount = session.slides?.length ?? 0;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">단계 전환</span>
          {PHASES.map((p) => (
            <Button
              key={p}
              tone={session.phase === p ? "ok" : "ghost"}
              onClick={() => patchSession(sessionId, { phase: p as Phase })}
            >
              {phaseToStage(p)}. {PHASE_LABEL[p]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">발표자</span>
          <select
            className="max-w-56"
            value={session.presenterId ?? ""}
            onChange={(e) =>
              patchSession(sessionId, { presenterId: e.target.value || null })
            }
          >
            <option value="">— 지정 안 함 —</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.subject})
              </option>
            ))}
          </select>

          <span className="ml-4 text-sm text-muted">슬라이드</span>
          <Button
            tone="ghost"
            disabled={slideCount === 0 || session.currentSlide <= 0}
            onClick={() =>
              patchSession(sessionId, {
                currentSlide: Math.max(0, session.currentSlide - 1),
              })
            }
          >
            ‹ 이전
          </Button>
          <span className="tabular-nums text-sm">
            {slideCount === 0 ? "없음" : `${session.currentSlide + 1} / ${slideCount}`}
          </span>
          <Button
            tone="ghost"
            disabled={slideCount === 0 || session.currentSlide >= slideCount - 1}
            onClick={() =>
              patchSession(sessionId, {
                currentSlide: Math.min(slideCount - 1, session.currentSlide + 1),
              })
            }
          >
            다음 ›
          </Button>
          <Button tone="ghost" onClick={() => setShowSlides((v) => !v)}>
            {showSlides ? "닫기" : "슬라이드 설정"}
          </Button>
        </div>

        {showSlides ? (
          <div className="space-y-2">
            <Field label="슬라이드 이미지 URL (한 줄에 하나)">
              <textarea
                className="min-h-32"
                value={slidesText}
                onChange={(e) => setSlidesText(e.target.value)}
              />
            </Field>
            <Button
              onClick={() =>
                patchSession(sessionId, {
                  slides: slidesText
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  currentSlide: 0,
                })
              }
            >
              슬라이드 저장
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm text-muted">
          <span>
            세션 ID <code className="text-foreground">{sessionId}</code> · 수강생은
            이 사이트 루트 주소로 접속
          </span>
          <Button tone="ghost" onClick={onNewSession}>
            새 세션 만들기
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- 참가자 카드 ---------------- */

function ParticipantCard({
  sessionId,
  p,
  isPresenter,
}: {
  sessionId: string;
  p: Participant;
  isPresenter: boolean;
}) {
  const [comment, setComment] = useState(p.instructorComment);
  const ready = designReviewComplete(p);

  return (
    <Card className={isPresenter ? "border-ok" : ""}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">{p.name}</span>
        <Badge tone="accent">{p.subject}</Badge>
        <Badge>{p.stage}단계</Badge>
        {p.gateApproved ? <Badge tone="ok">승인됨</Badge> : <Badge tone="warn">🔒 미승인</Badge>}
        {isPresenter ? <Badge tone="ok">발표 중</Badge> : null}
      </div>

      <ul className="mb-3 space-y-1 text-sm">
        <li>
          <span className="text-muted">AI 설계 검토</span>{" "}
          {p.aiReviewDesign ? "✅" : "—"}
        </li>
        <li>
          <span className="text-muted">자기 검토</span>{" "}
          {p.selfReviewDesign
            ? `✅ (${p.selfReviewDesign.changedField})`
            : "—"}
        </li>
        <li>
          <span className="text-muted">동료 검토</span>{" "}
          {p.peerReviewDesign ? `✅ ${p.peerReviewDesign.fromName}` : "—"}
        </li>
        <li>
          <span className="text-muted">캔바 링크</span>{" "}
          {p.canvaLink ? (
            <a
              className="text-accent underline"
              href={p.canvaLink}
              target="_blank"
              rel="noreferrer"
            >
              열기 ↗
            </a>
          ) : (
            "—"
          )}
        </li>
        <li>
          <span className="text-muted">AI 산출물 검토</span>{" "}
          {p.aiReviewOutput ? "✅" : "—"}
        </li>
      </ul>

      {p.aiReviewDesign ? (
        <details className="mb-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer text-muted">AI 설계 검토 내용</summary>
          <p className="mt-2 whitespace-pre-wrap">{p.aiReviewDesign.text}</p>
        </details>
      ) : null}

      {p.peerQuestions?.length ? (
        <details className="mb-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer text-muted">
            검토관 질문 {p.peerQuestions.length}개
          </summary>
          <ul className="mt-2 space-y-1">
            {p.peerQuestions.map((q, i) => (
              <li key={i}>
                <b>[{q.role}]</b> {q.fromName}: {q.question}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          tone={p.gateApproved ? "ghost" : "ok"}
          disabled={!p.gateApproved && !ready}
          title={
            !ready && !p.gateApproved
              ? "AI·자기·동료 검토가 모두 끝나야 승인할 수 있습니다."
              : undefined
          }
          onClick={() =>
            patchParticipant(sessionId, p.id, { gateApproved: !p.gateApproved })
          }
        >
          {p.gateApproved ? "승인 취소" : "게이트 승인"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Field label="강사 코멘트">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
        </div>
        <Button
          onClick={() =>
            patchParticipant(sessionId, p.id, { instructorComment: comment.trim() })
          }
        >
          저장
        </Button>
      </div>
    </Card>
  );
}
