"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AiReviewPanel } from "@/components/AiReviewPanel";
import { CopyButton, DesignDocForm, DesignDocView } from "@/components/DesignDocForm";
import { QuoteRoll } from "@/components/QuoteRoll";
import { Stepper } from "@/components/Stepper";
import {
  Badge,
  Button,
  Card,
  ColorBlock,
  Eyebrow,
  Field,
  Notice,
  SectionTitle,
} from "@/components/ui";
import { buildCanvaPrompt } from "@/lib/canva-prompt";
import { addPeerQuestion, patchParticipant } from "@/lib/db";
import {
  designDocReady,
  findPartner,
  nameWithSubject,
  PHASE_LABEL,
  PHASE_TONE,
  phaseToStage,
  reviewerRoleFor,
  subjectLabel,
  type DesignDoc,
  type Participant,
  type Phase,
} from "@/lib/types";
import { useMyParticipantId, useSession } from "@/lib/useSession";
import {
  WRAPUP_INTENT,
  WRAPUP_NOTES,
  WRAPUP_NOTES_HEADER,
} from "@/lib/wrapup-notes";

/** 팀에 이미 들어간 사람이 곧장 가는 곳 */
const CANVA_AI_URL = "https://www.canva.com/ai";

/**
 * 강사의 Canva Pro 팀 초대 링크. 이 링크로 들어가면 팀 참여 화면이 먼저 뜨고,
 * 참여하면 강사 계정을 함께 쓸 수 있다.
 * 초대 토큰은 저장소에 남기지 않도록 환경변수로만 받는다.
 * (배포된 페이지의 JS 에는 어차피 들어가므로, 행사 후 초대 링크는 재발급할 것)
 */
const CANVA_INVITE_URL = process.env.NEXT_PUBLIC_CANVA_INVITE_URL || "";

/** 초대 링크가 설정돼 있으면 그쪽으로, 없으면 캔바 AI 로 바로 보낸다 */
const CANVA_URL = CANVA_INVITE_URL || CANVA_AI_URL;

/** 각 단계 색상 블록에 실릴 헤드라인과 리드 문장 */
const PHASE_INTRO: Record<Phase, { title: string; lead: string }> = {
  waiting: {
    title: "잠시 기다려 주세요",
    lead: "강사가 시작하면 이 화면이 자동으로 넘어갑니다.",
  },
  design: {
    title: "연구설계서를 작성합니다",
    lead: "여섯 칸은 예시로 채워져 있습니다. 직접 쓰실 칸은 검증 기준 하나입니다.",
  },
  design_review: {
    title: "네 번의 검토를 거칩니다",
    lead: "AI → 자기 → 동료 → 강사. 네 검토를 모두 지나야 제작 단계가 열립니다.",
  },
  build: {
    title: "설계서를 화면으로 만듭니다",
    lead: "설계서가 그대로 프롬프트가 됩니다. 복사해서 캔바 코드에 붙여넣으세요.",
  },
  output_review: {
    title: "결과를 가설과 대조합니다",
    lead: "만든 화면이 무엇을 보여 줬는지 적고, 가설·문헌과 맞는지 확인합니다.",
  },
  present: {
    title: "발표하고 질문합니다",
    lead: "발표자의 설계서를 함께 보며 변인·검증·한계 세 관점에서 질문합니다.",
  },
  wrapup: {
    title: "오늘을 정리합니다",
    lead: "오늘 흐름을 되짚고, 연수 후기를 남겨 주세요.",
  },
};

export default function StudentPage() {
  const { sessionId, session, participants, loading, error } = useSession();
  const { myId, setMyId, ready } = useMyParticipantId(sessionId);

  const me = useMemo(
    () => participants.find((p) => p.id === myId) ?? null,
    [participants, myId]
  );

  const phase = session?.phase ?? "waiting";

  // 내 stage 를 현재 phase 에 맞춰 기록 (강사 대시보드 표시용)
  useEffect(() => {
    if (!sessionId || !me || !session) return;
    const stage = phaseToStage(session.phase);
    if (me.stage !== stage) {
      patchParticipant(sessionId, me.id, { stage }).catch(() => {});
    }
  }, [sessionId, me, session]);

  // 순서 중요: 에러와 "세션 없음"은 ready(=sessionId 존재) 가드보다 먼저 걸러야 한다.
  if (error) {
    return (
      <Shell>
        <Notice tone="danger">{error}</Notice>
      </Shell>
    );
  }
  if (loading) {
    return <Shell>{null}</Shell>;
  }
  if (!sessionId || !session) {
    return (
      <Shell>
        <ColorBlock tone="cream">
          <Eyebrow className="mb-4">Waiting</Eyebrow>
          <h2 className="t-display-lg max-w-xl">아직 세션이 열리지 않았습니다</h2>
          <p className="t-body-lg mt-5 max-w-lg">
            강사가 세션을 시작하면 이 화면이 자동으로 바뀝니다.
          </p>
        </ColorBlock>
      </Shell>
    );
  }
  if (!ready) {
    return <Shell>{null}</Shell>;
  }

  if (!me) {
    return (
      <Shell>
        <div className="py-4">
          <Eyebrow className="mb-4">Select your name</Eyebrow>
          <h2 className="t-display-lg max-w-2xl">이름을 선택하세요</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => setMyId(p.id)}
              className="group rounded-lg border border-hairline bg-canvas p-8 text-left transition hover:border-ink"
            >
              <div className="t-card-title">{p.name}</div>
              {subjectLabel(p.subject) ? (
                <div className="t-caption mt-2 opacity-60">
                  {subjectLabel(p.subject)}
                </div>
              ) : null}
            </button>
          ))}
        </div>
        {participants.length === 0 ? (
          <Notice tone="warn">참가자가 아직 등록되지 않았습니다.</Notice>
        ) : null}
      </Shell>
    );
  }

  const partner = findPartner(me, participants);
  const intro = PHASE_INTRO[phase];

  return (
    <Shell
      header={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="t-card-title">{me.name}</span>
            {me.subject !== "미정" ? (
              <Badge tone="accent">{me.subject}</Badge>
            ) : null}
            {me.gateApproved ? <Badge tone="ok">설계 승인</Badge> : null}
          </div>
          <button
            className="t-caption rounded-pill border border-hairline px-3 py-1.5 transition hover:border-ink"
            onClick={() => setMyId(null)}
          >
            이름 바꾸기
          </button>
        </div>
      }
    >
      <Stepper phase={phase} gateApproved={me.gateApproved} />

      {/* 단계마다 색상 블록 하나 — 이 시스템의 섹션 브레이크 */}
      <ColorBlock tone={PHASE_TONE[phase]}>
        <Eyebrow className="mb-4 opacity-100">
          Stage {String(phaseToStage(phase)).padStart(2, "0")} / 07 —{" "}
          {PHASE_LABEL[phase]}
        </Eyebrow>
        <h2 className="t-display-lg max-w-2xl">{intro.title}</h2>
        <p className="t-body-lg mt-5 max-w-xl">{intro.lead}</p>
      </ColorBlock>

      {phase === "waiting" ? <QuoteRoll /> : null}

      {phase === "design" ? (
        <Card>
          <SectionTitle
            eyebrow="Design doc"
            hint="소재를 하나 고른 뒤, 검증 기준 칸을 직접 채워 주세요."
          >
            연구설계서
          </SectionTitle>
          <DesignDocForm sessionId={sessionId} me={me} />
        </Card>
      ) : null}

      {phase === "design_review" ? (
        <DesignReviewStage sessionId={sessionId} me={me} partner={partner} />
      ) : null}

      {phase === "build" ? <BuildStage sessionId={sessionId} me={me} /> : null}

      {phase === "output_review" ? (
        <OutputReviewStage sessionId={sessionId} me={me} />
      ) : null}

      {phase === "present" ? (
        <PresentStage
          sessionId={sessionId}
          me={me}
          participants={participants}
          presenterId={session.presenterId}
        />
      ) : null}

      {phase === "wrapup" ? <WrapupStage sessionId={sessionId} me={me} /> : null}
    </Shell>
  );
}

function Shell({
  children,
  header,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="t-headline">영재원 과학교사 바이브코딩 연수</h1>
        <p className="t-caption hidden opacity-50 sm:block">
          설계 · 제작 · 검토 · 발표
        </p>
      </div>
      {header}
      {children}
    </main>
  );
}

/* ---------------- 3단계: 설계 검토 ---------------- */

function DesignReviewStage({
  sessionId,
  me,
  partner,
}: {
  sessionId: string;
  me: Participant;
  partner: Participant | null;
}) {
  const [changedField, setChangedField] = useState<keyof DesignDoc | "">(
    (me.selfReviewDesign?.changedField as keyof DesignDoc) ?? ""
  );
  const [note, setNote] = useState(me.selfReviewDesign?.note ?? "");
  const [peerComment, setPeerComment] = useState("");
  const [savedSelf, setSavedSelf] = useState(false);
  const [dirty, setDirty] = useState(false);

  const alreadyCommented = partner?.peerReviewDesign?.fromId === me.id;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Review 01 — AI"
          hint="잘된 점 1개와 보완점 2개를 받습니다."
        >
          AI 검토
        </SectionTitle>
        <AiReviewPanel
          sessionId={sessionId}
          participantId={me.id}
          kind="design"
          designDoc={me.designDoc}
          review={me.aiReviewDesign}
          disabled={dirty || !designDocReady(me.designDoc)}
          disabledReason={
            dirty
              ? "설계서를 저장하는 중입니다. 입력칸 밖을 한 번 클릭해 주세요."
              : !designDocReady(me.designDoc)
                ? "설계서의 빈 칸을 먼저 채워 주세요. 특히 검증 기준 칸이 비어 있으면 의미 있는 검토를 받을 수 없습니다."
                : undefined
          }
        />
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Review 02 — Self"
          hint="AI 지적을 반영해 최소 한 칸을 고치고, 무엇을 왜 고쳤는지 적으세요."
        >
          자기 검토
        </SectionTitle>
        <div className="space-y-5">
          <DesignDocForm
            sessionId={sessionId}
            me={me}
            onFieldChange={(f) => setChangedField(f)}
            onDirtyChange={setDirty}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="고친 칸">
              <select
                value={changedField}
                onChange={(e) => setChangedField(e.target.value as keyof DesignDoc)}
              >
                <option value="">— 선택 —</option>
                {(
                  [
                    ["question", "탐구질문"],
                    ["hypothesis", "가설"],
                    ["independentVar", "조작변인"],
                    ["dependentVar", "종속변인"],
                    ["controlledVars", "통제변인"],
                    ["verification", "검증 기준"],
                    ["limitations", "한계"],
                    ["concept", "설명하려는 개념"],
                    ["accuracyBasis", "정확성 근거"],
                  ] as [keyof DesignDoc, string][]
                ).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="왜 고쳤나요?">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <Button
            disabled={!changedField || !note.trim()}
            tone={savedSelf ? "ok" : "primary"}
            onClick={async () => {
              await patchParticipant(sessionId, me.id, {
                selfReviewDesign: { changedField, note: note.trim() },
              });
              setSavedSelf(true);
              setTimeout(() => setSavedSelf(false), 1800);
            }}
          >
            {savedSelf ? "저장됨 ✓" : "자기 검토 저장"}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Review 03 — Peer"
          hint={
            partner
              ? `${partner.name} 선생님의 설계서에 코멘트 1개를 남겨 주세요.`
              : "짝을 찾을 수 없습니다."
          }
        >
          동료 검토
        </SectionTitle>
        {partner ? (
          <div className="space-y-5">
            <div className="rounded-md bg-surface-soft p-5">
              <div className="t-caption mb-3 opacity-60">
                {nameWithSubject(partner.name, partner.subject)}
              </div>
              <DesignDocView doc={partner.designDoc} />
            </div>
            {alreadyCommented ? (
              <Notice tone="ok">
                코멘트를 남겼습니다: “{partner.peerReviewDesign?.comment}”
              </Notice>
            ) : (
              <>
                <Field label="코멘트 1개" hint="변인·검증 기준 중 하나를 짚어 주세요.">
                  <textarea
                    value={peerComment}
                    onChange={(e) => setPeerComment(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={!peerComment.trim()}
                  onClick={async () => {
                    await patchParticipant(sessionId, partner.id, {
                      peerReviewDesign: {
                        fromId: me.id,
                        fromName: me.name,
                        comment: peerComment.trim(),
                      },
                    });
                    setPeerComment("");
                  }}
                >
                  코멘트 남기기
                </Button>
              </>
            )}
          </div>
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Review 04 — Instructor"
          hint="세 검토가 끝나면 강사가 승인합니다."
        >
          받은 코멘트 · 강사 승인
        </SectionTitle>
        {me.peerReviewDesign ? (
          <Notice tone="muted">
            <b>{me.peerReviewDesign.fromName}</b> — {me.peerReviewDesign.comment}
          </Notice>
        ) : (
          <p className="t-body-sm opacity-60">아직 동료 코멘트가 없습니다.</p>
        )}
        <div className="mt-5">
          {me.gateApproved ? (
            <Notice tone="ok">강사 승인 완료 — 제작 단계로 넘어갈 수 있습니다.</Notice>
          ) : (
            <Notice tone="warn">
              🔒 강사 승인 대기 중입니다. 승인 전에는 제작 단계가 열리지 않습니다.
            </Notice>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- 4단계: 제작 ---------------- */

function BuildStage({ sessionId, me }: { sessionId: string; me: Participant }) {
  const [link, setLink] = useState(me.canvaLink);
  const [saved, setSaved] = useState(false);

  // 설계서에서 즉석 생성한 기본 프롬프트. 손본 적이 없으면 이걸 그대로 쓴다.
  const generated = buildCanvaPrompt(me.designDoc, me.subject);
  const [prompt, setPrompt] = useState(me.canvaPrompt || generated);
  const [promptSaved, setPromptSaved] = useState(true);
  /** 저장 대기 중인 편집이 있으면 원격 스냅샷으로 덮지 않는다 */
  const promptDirty = useRef(false);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (promptDirty.current) return;
    setPrompt(me.canvaPrompt || generated);
  }, [me.canvaPrompt, generated, promptSaved]);

  useEffect(() => {
    return () => {
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
  }, []);

  function savePrompt(text: string) {
    if (promptTimer.current) clearTimeout(promptTimer.current);
    patchParticipant(sessionId, me.id, { canvaPrompt: text })
      .then(() => {
        promptDirty.current = false;
        setPromptSaved(true);
      })
      .catch(() => setPromptSaved(false));
  }

  function editPrompt(text: string) {
    setPrompt(text);
    promptDirty.current = true;
    setPromptSaved(false);
    if (promptTimer.current) clearTimeout(promptTimer.current);
    promptTimer.current = setTimeout(() => savePrompt(text), 700);
  }

  // 설계서를 고친 뒤에도 예전 프롬프트가 남아 있으면 알려 준다.
  const outOfDate = Boolean(me.canvaPrompt) && me.canvaPrompt !== generated;

  if (!me.gateApproved) {
    return (
      <Card>
        <SectionTitle eyebrow="Gate locked">제작 단계가 잠겨 있습니다</SectionTitle>
        <Notice tone="warn">
          🔒 아직 강사 승인을 받지 않았습니다. 설계 검토를 마치고 강사에게 승인을 요청해
          주세요.
        </Notice>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Prompt"
          hint="설계서를 그대로 조립한 프롬프트입니다. 복사해서 캔바 코드에 붙여넣으세요."
        >
          캔바 코드 프롬프트
        </SectionTitle>
        {/* 자동 생성이 출발점일 뿐이라, 붙여넣기 전에 직접 손볼 수 있어야 한다.
            globals.css 의 textarea{min-height} 가 레이어 밖이라 Tailwind 의 min-h-* 를
            이긴다. 그래서 높이는 rows 로 정하고, 내용이 늘면 같이 늘어나게 한다. */}
        <textarea
          className="t-body-sm mb-3 font-mono"
          rows={Math.min(30, Math.max(14, prompt.split("\n").length + 1))}
          value={prompt}
          onChange={(e) => editPrompt(e.target.value)}
          onBlur={() => {
            if (promptDirty.current) savePrompt(prompt);
          }}
          spellCheck={false}
        />
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className={`t-caption ${promptSaved ? "opacity-45" : "opacity-100"}`}>
            {promptSaved ? "저장됨" : "저장 중…"}
          </span>
          <button
            type="button"
            onClick={() => {
              setPrompt(generated);
              promptDirty.current = false;
              savePrompt(generated);
            }}
            className="t-caption rounded-pill border border-hairline px-3 py-1.5 transition hover:border-ink"
          >
            설계서 기준으로 다시 생성
          </button>
          {outOfDate ? (
            <span className="t-caption opacity-60">
              설계서가 바뀌었습니다 — 필요하면 다시 생성하세요
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={prompt} label="프롬프트 복사" />
          <a
            href={CANVA_URL}
            target="_blank"
            rel="noreferrer"
            className="t-body-sm inline-flex min-h-11 items-center rounded-pill border border-hairline px-5 py-2.5 font-medium transition hover:border-ink"
          >
            캔바 코드 열기 ↗
          </a>
          {/* 초대 링크로 들어가면 팀 참여 화면이 먼저 뜬다. 이미 참여한 뒤에는 이쪽. */}
          {CANVA_INVITE_URL ? (
            <a
              href={CANVA_AI_URL}
              target="_blank"
              rel="noreferrer"
              className="t-caption underline underline-offset-4 opacity-60 hover:opacity-100"
            >
              이미 참여했다면 여기로
            </a>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Submit" hint="만든 화면의 공유 링크를 붙여넣으세요.">
          결과물 링크 제출
        </SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="캔바 링크">
              <input
                type="url"
                placeholder="https://…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </Field>
          </div>
          <Button
            tone={saved ? "ok" : "primary"}
            disabled={!link.trim()}
            onClick={async () => {
              await patchParticipant(sessionId, me.id, { canvaLink: link.trim() });
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            }}
          >
            {saved ? "제출됨 ✓" : "제출"}
          </Button>
        </div>
        {me.canvaLink ? (
          <p className="t-body-sm mt-4">
            <span className="opacity-60">제출된 링크 — </span>
            <a
              className="underline underline-offset-4"
              href={me.canvaLink}
              target="_blank"
              rel="noreferrer"
            >
              {me.canvaLink}
            </a>
          </p>
        ) : null}
      </Card>
    </div>
  );
}

/* ---------------- 5단계: 산출물 검토 ---------------- */

function OutputReviewStage({
  sessionId,
  me,
}: {
  sessionId: string;
  me: Participant;
}) {
  const [summary, setSummary] = useState(me.outputSummary);
  const [savedSummary, setSavedSummary] = useState(false);
  const [limitation, setLimitation] = useState(
    me.selfReviewOutput?.limitationAdded ?? ""
  );
  const [savedLimit, setSavedLimit] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Result"
          hint="슬라이더를 움직였을 때 그래프가 어떻게 변했는지 2~3문장으로 적으세요."
        >
          시뮬레이션 결과 요약
        </SectionTitle>
        <div className="space-y-4">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="예) 길이를 0.1 m에서 2 m까지 늘렸더니 주기가 0.6초에서 2.8초까지 늘었고, 증가 폭은 점점 완만해졌습니다."
          />
          <Button
            tone={savedSummary ? "ok" : "primary"}
            disabled={!summary.trim()}
            onClick={async () => {
              await patchParticipant(sessionId, me.id, {
                outputSummary: summary.trim(),
              });
              setSavedSummary(true);
              setTimeout(() => setSavedSummary(false), 1800);
            }}
          >
            {savedSummary ? "저장됨 ✓" : "요약 저장"}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="AI review" hint="결과 vs 가설·문헌 대조">
          AI 산출물 검토
        </SectionTitle>
        <AiReviewPanel
          sessionId={sessionId}
          participantId={me.id}
          kind="output"
          designDoc={me.designDoc}
          outputSummary={me.outputSummary}
          review={me.aiReviewOutput}
          disabled={!me.outputSummary.trim() || !designDocReady(me.designDoc)}
          disabledReason={
            !designDocReady(me.designDoc)
              ? "설계서가 비어 있습니다. 2단계로 돌아가 먼저 채워 주세요."
              : "결과 요약을 먼저 저장해 주세요."
          }
        />
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Self review"
          hint="AI가 짚어 준 것 중 하나를 골라 한 줄로 추가하세요."
        >
          한계 1줄 추가
        </SectionTitle>
        <div className="space-y-4">
          <textarea
            value={limitation}
            onChange={(e) => setLimitation(e.target.value)}
            placeholder="예) 공기저항을 무시했기 때문에 실제 진자보다 주기가 짧게 나옵니다."
          />
          <Button
            tone={savedLimit ? "ok" : "primary"}
            disabled={!limitation.trim()}
            onClick={async () => {
              const merged = [me.designDoc.limitations, limitation.trim()]
                .filter(Boolean)
                .join(" / ");
              await patchParticipant(sessionId, me.id, {
                selfReviewOutput: { limitationAdded: limitation.trim() },
                "designDoc.limitations": merged,
              });
              setSavedLimit(true);
              setTimeout(() => setSavedLimit(false), 1800);
            }}
          >
            {savedLimit ? "추가됨 ✓" : "한계에 추가"}
          </Button>
          <p className="t-body-sm opacity-60">
            현재 한계: {me.designDoc.limitations || "—"}
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- 6단계: 발표 ---------------- */

function PresentStage({
  sessionId,
  me,
  participants,
  presenterId,
}: {
  sessionId: string;
  me: Participant;
  participants: Participant[];
  presenterId: string | null;
}) {
  const [question, setQuestion] = useState("");
  const presenter = participants.find((p) => p.id === presenterId) ?? null;
  const role = presenterId ? reviewerRoleFor(me.id, presenterId, participants) : null;
  const isPresenter = presenterId === me.id;
  const alreadyAsked = Boolean(
    presenter?.peerQuestions?.some((q) => q.fromId === me.id)
  );

  if (!presenter) {
    return (
      <Card>
        <SectionTitle eyebrow="Presentation">발표자를 기다리는 중</SectionTitle>
        <Notice tone="warn">강사가 발표자를 지정하면 화면이 바뀝니다.</Notice>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Eyebrow>Presenter</Eyebrow>
          <h2 className="t-card-title">
            {nameWithSubject(presenter.name, presenter.subject)}
          </h2>
          {isPresenter ? <Badge tone="ok">발표 중</Badge> : null}
          {role ? <Badge tone="warn">{role} 검토관</Badge> : null}
        </div>
        {presenter.canvaLink ? (
          <a
            className="t-body-sm underline underline-offset-4"
            href={presenter.canvaLink}
            target="_blank"
            rel="noreferrer"
          >
            {presenter.canvaLink} ↗
          </a>
        ) : (
          <p className="t-body-sm opacity-60">제출된 링크가 없습니다.</p>
        )}
        <div className="mt-5 rounded-md bg-surface-soft p-5">
          <DesignDocView doc={presenter.designDoc} />
        </div>
      </Card>

      {!isPresenter && role ? (
        <Card>
          <SectionTitle
            eyebrow={`Reviewer — ${role}`}
            hint={`「${role}」 관점에서 질문 1개를 남겨 주세요.`}
          >
            검토관 질문
          </SectionTitle>
          {alreadyAsked ? (
            <Notice tone="ok">질문을 남겼습니다.</Notice>
          ) : (
            <div className="space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button
                disabled={!question.trim()}
                onClick={async () => {
                  await addPeerQuestion(sessionId, presenter.id, {
                    fromId: me.id,
                    fromName: me.name,
                    role,
                    question: question.trim(),
                  });
                  setQuestion("");
                }}
              >
                질문 남기기
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      <Card>
        <SectionTitle eyebrow="Questions">지금까지의 질문</SectionTitle>
        {presenter.peerQuestions?.length ? (
          <ul className="space-y-3">
            {presenter.peerQuestions.map((q, i) => (
              <li key={i} className="rounded-md bg-surface-soft p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="warn">{q.role}</Badge>
                  <span className="t-caption opacity-60">{q.fromName}</span>
                </div>
                <p className="t-body-sm">{q.question}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body-sm opacity-60">아직 질문이 없습니다.</p>
        )}
        {presenter.instructorComment ? (
          <div className="mt-5">
            <Notice tone="ok">
              <b>강사 코멘트</b> — {presenter.instructorComment}
            </Notice>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/* ---------------- 7단계: 정리 ---------------- */

function WrapupStage({ sessionId, me }: { sessionId: string; me: Participant }) {
  const [takeaway, setTakeaway] = useState(me.takeaway);
  const [saved, setSaved] = useState(false);

  const flow = [
    "설계서 7칸 중 검증 기준을 직접 썼습니다.",
    "AI → 자기 → 동료 → 강사, 네 번의 검토를 거쳐 설계를 다듬었습니다.",
    "설계서를 그대로 프롬프트로 바꿔 화면을 만들었습니다.",
    "결과를 가설·문헌과 대조하고 한계를 한 줄 더 붙였습니다.",
    "발표에서 변인·검증·한계 세 관점의 질문을 주고받았습니다.",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle eyebrow="Recap">오늘의 흐름</SectionTitle>
        <ol className="divide-y divide-hairline-soft">
          {flow.map((line, i) => (
            <li key={i} className="flex gap-4 py-3">
              <span className="t-caption pt-1 opacity-40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="t-body-sm">{line}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* 강사가 전하는 의도와 방향성 — 문구는 lib/wrapup-notes.ts 에서 고친다 */}
      <Card>
        <SectionTitle eyebrow={WRAPUP_INTENT.eyebrow}>
          {WRAPUP_INTENT.title}
        </SectionTitle>
        <div className="space-y-4">
          {WRAPUP_INTENT.paragraphs.map((text, i) => (
            <p key={i} className="t-body max-w-3xl">
              {text}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle
          eyebrow={WRAPUP_NOTES_HEADER.eyebrow}
          hint={WRAPUP_NOTES_HEADER.hint}
        >
          {WRAPUP_NOTES_HEADER.title}
        </SectionTitle>
        <ol className="divide-y divide-hairline-soft">
          {WRAPUP_NOTES.map((c, i) => (
            <li key={i} className="flex gap-4 py-4">
              <span className="t-caption pt-1 opacity-40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="t-card-title">{c.title}</p>
                <p className="t-body-sm mt-1.5 opacity-75">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Feedback"
          hint="좋았던 점, 아쉬웠던 점, 학교에서 해 보고 싶은 것 — 무엇이든 좋습니다."
        >
          오늘 연수 후기
        </SectionTitle>
        <div className="space-y-4">
          <textarea
            className="min-h-32"
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
            placeholder="예) 검증 기준 칸만 학생이 직접 쓰게 하는 방식이 인상적이었습니다. 다만 제작 시간이 조금 부족했습니다."
          />
          <Button
            tone={saved ? "ok" : "primary"}
            disabled={!takeaway.trim()}
            onClick={async () => {
              await patchParticipant(sessionId, me.id, { takeaway: takeaway.trim() });
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            }}
          >
            {saved ? "저장됨 ✓" : "저장"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
