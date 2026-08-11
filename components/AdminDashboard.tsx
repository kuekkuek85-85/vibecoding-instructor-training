"use client";

import { useState } from "react";
import { ParticipantModal, type ModalSection } from "./ParticipantModal";
import { createSession, patchParticipant, patchSession } from "@/lib/db";
import { defaultNames, SUBJECT_OPTIONS } from "@/lib/seed-data";
import {
  designReviewComplete,
  nameWithSubject,
  PHASE_LABEL,
  PHASES,
  phaseToStage,
  type Participant,
  type Phase,
  type SessionDoc,
  type Subject,
} from "@/lib/types";
import { useSession } from "@/lib/useSession";
import { Badge, Button, Card, ColorBlock, Eyebrow, Field, Notice, SectionTitle } from "./ui";

export function AdminDashboard() {
  const { sessionId, session, participants, loading, error } = useSession();
  const [showSeed, setShowSeed] = useState(false);
  /** 팝업으로 열어 둔 참가자와 위치 */
  const [open, setOpen] = useState<{ id: string; section: ModalSection } | null>(null);

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
            onOpen={(section) => setOpen({ id: p.id, section })}
          />
        ))}
      </div>

      {session.phase === "wrapup" ? (
        <ColorBlock tone="lime">
          <Eyebrow className="mb-4 opacity-100">Takeaways</Eyebrow>
          <h2 className="t-display-lg mb-8">내 수업에 가져갈 것 하나</h2>
          <ul className="divide-y divide-black/10">
            {participants.map((p) => (
              <li key={p.id} className="py-5">
                <div className="t-caption mb-2 opacity-60">
                  {nameWithSubject(p.name, p.subject)}
                </div>
                <p className="t-subhead">{p.takeaway || "—"}</p>
              </li>
            ))}
          </ul>
        </ColorBlock>
      ) : null}

      {open ? (
        (() => {
          const target = participants.find((x) => x.id === open.id);
          if (!target) return null;
          return (
            <ParticipantModal
              key={`${open.id}-${open.section}`}
              p={target}
              section={open.section}
              onClose={() => setOpen(null)}
            />
          );
        })()
      ) : null}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-8">
      <div className="border-b border-hairline pb-5">
        <p className="t-caption mb-2 opacity-50">Instructor</p>
        <h1 className="t-display-lg">강사 대시보드</h1>
      </div>
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
  // 과목은 임의로 넣지 않고 "미정"에서 시작한다 — 강사가 알면 바꾸면 된다.
  const [people, setPeople] = useState<{ name: string; subject: Subject }[]>(() =>
    defaultNames().map((name) => ({ name, subject: "미정" as Subject }))
  );
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
                  {SUBJECT_OPTIONS.map((s) => (
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
          <span className="t-caption w-full opacity-50">Phase</span>
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
          <span className="t-caption opacity-50">Presenter</span>
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
                {nameWithSubject(p.name, p.subject)}
              </option>
            ))}
          </select>

          <span className="t-caption ml-4 opacity-50">Slides</span>
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
          <span className="t-caption tabular-nums">
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <span className="t-caption opacity-50">
            Session {sessionId} · 수강생은 이 사이트 루트 주소로 접속
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
  onOpen,
}: {
  sessionId: string;
  p: Participant;
  isPresenter: boolean;
  onOpen: (section: ModalSection) => void;
}) {
  const [comment, setComment] = useState(p.instructorComment);
  const ready = designReviewComplete(p);

  return (
    <Card className={isPresenter ? "border-ink" : ""}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="t-card-title">{p.name}</span>
        {p.subject !== "미정" ? <Badge tone="accent">{p.subject}</Badge> : null}
        <Badge>{String(p.stage).padStart(2, "0")} 단계</Badge>
        {p.gateApproved ? <Badge tone="ok">승인됨</Badge> : <Badge tone="warn">🔒 미승인</Badge>}
        {isPresenter ? <Badge tone="ok">발표 중</Badge> : null}
        <button
          onClick={() => onOpen("design")}
          className="t-caption ml-auto rounded-pill border border-hairline px-3 py-1.5 transition hover:border-ink"
        >
          전체 보기
        </button>
      </div>

      <ul className="mb-5 divide-y divide-hairline-soft">
        {(
          [
            ["design", "연구설계서", Boolean(p.designDoc?.question)],
            ["aiDesign", "AI 설계 검토", Boolean(p.aiReviewDesign)],
            ["self", "자기 검토", Boolean(p.selfReviewDesign)],
            ["peer", "동료 검토", Boolean(p.peerReviewDesign)],
            ["output", "산출물 링크", Boolean(p.canvaLink)],
            ["aiOutput", "AI 산출물 검토", Boolean(p.aiReviewOutput)],
            ["questions", "검토관 질문", Boolean(p.peerQuestions?.length)],
            ["takeaway", "가져갈 것 하나", Boolean(p.takeaway)],
          ] as [ModalSection, string, boolean][]
        ).map(([key, label, done]) => (
          <li key={key}>
            {/* 어느 줄이든 눌러 그 단계의 작성물을 팝업으로 본다 */}
            <button
              onClick={() => onOpen(key)}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition hover:opacity-60"
            >
              <span className="t-caption opacity-60">{label}</span>
              <span className="t-caption flex items-center gap-2">
                {done ? "작성됨" : "—"}
                <span aria-hidden className="opacity-40">
                  ↗
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {/* 강사 연수라 진행 속도를 강사가 직접 조절한다 — 검토 완료 여부와 무관하게 승인 가능 */}
        <Button
          tone={p.gateApproved ? "ghost" : "primary"}
          onClick={() =>
            patchParticipant(sessionId, p.id, { gateApproved: !p.gateApproved })
          }
        >
          {p.gateApproved ? "승인 취소" : "게이트 승인"}
        </Button>
        {!p.gateApproved && !ready ? (
          <span className="t-caption self-center opacity-40">검토 3종 미완료</span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
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
