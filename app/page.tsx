"use client";

import { useEffect, useMemo, useState } from "react";
import { AiReviewPanel } from "@/components/AiReviewPanel";
import { CopyButton, DesignDocForm, DesignDocView } from "@/components/DesignDocForm";
import { SlideSync } from "@/components/SlideSync";
import { Stepper } from "@/components/Stepper";
import { Badge, Button, Card, Field, Notice, SectionTitle } from "@/components/ui";
import { buildCanvaPrompt } from "@/lib/canva-prompt";
import { patchParticipant } from "@/lib/db";
import {
  findPartner,
  PHASE_LABEL,
  phaseToStage,
  reviewerRoleFor,
  type DesignDoc,
  type Participant,
  type PeerQuestion,
} from "@/lib/types";
import { useMyParticipantId, useSession } from "@/lib/useSession";

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

  if (loading || !ready) {
    return <Shell>불러오는 중…</Shell>;
  }
  if (error) {
    return (
      <Shell>
        <Notice tone="danger">{error}</Notice>
      </Shell>
    );
  }
  if (!sessionId || !session) {
    return (
      <Shell>
        <Notice tone="warn">
          아직 연수 세션이 열리지 않았습니다. 강사가 세션을 시작하면 자동으로 화면이
          바뀝니다.
        </Notice>
      </Shell>
    );
  }

  if (!me) {
    return (
      <Shell>
        <SectionTitle hint="자기 이름 카드를 눌러 주세요.">
          이름을 선택하세요
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => setMyId(p.id)}
              className="rounded-xl border border-line bg-surface p-6 text-left transition hover:border-accent hover:bg-surface-2"
            >
              <div className="text-2xl font-bold">{p.name}</div>
              <div className="mt-1 text-sm text-muted">{p.subject}</div>
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

  return (
    <Shell
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">{me.name}</span>
            <Badge tone="accent">{me.subject}</Badge>
            {me.gateApproved ? <Badge tone="ok">설계 승인 완료</Badge> : null}
          </div>
          <button
            className="text-xs text-muted underline"
            onClick={() => setMyId(null)}
          >
            이름 바꾸기
          </button>
        </div>
      }
    >
      <Stepper phase={phase} gateApproved={me.gateApproved} />

      {phase === "waiting" ? (
        <Card>
          <SectionTitle hint={`현재 단계: ${PHASE_LABEL[phase]}`}>
            잠시 기다려 주세요
          </SectionTitle>
          <SlideSync session={session} />
        </Card>
      ) : null}

      {phase === "design" ? (
        <Card>
          <SectionTitle hint="6칸은 예시로 채워져 있습니다. ★ 표시된 칸을 직접 작성하세요.">
            2단계 · 연구설계서 작성
          </SectionTitle>
          <DesignDocForm sessionId={sessionId} me={me} />
        </Card>
      ) : null}

      {phase === "design_review" ? (
        <DesignReviewStage
          sessionId={sessionId}
          me={me}
          partner={partner}
        />
      ) : null}

      {phase === "build" ? (
        <BuildStage sessionId={sessionId} me={me} />
      ) : null}

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

      {phase === "wrapup" ? (
        <WrapupStage sessionId={sessionId} me={me} />
      ) : null}
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
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold">영재원 과학교사 바이브코딩 연수</h1>
        <p className="text-sm text-muted">설계 → 제작 → 검토 → 발표</p>
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

  const alreadyCommented = partner?.peerReviewDesign?.fromId === me.id;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle hint="① AI 검토 — 잘된 점 1개 + 보완점 2개">
          3단계 · AI 검토
        </SectionTitle>
        <AiReviewPanel
          sessionId={sessionId}
          participantId={me.id}
          kind="design"
          designDoc={me.designDoc}
          review={me.aiReviewDesign}
        />
      </Card>

      <Card>
        <SectionTitle hint="② 자기 검토 — AI 지적을 반영해 최소 1칸을 고치고, 무엇을 왜 고쳤는지 적으세요.">
          자기 검토
        </SectionTitle>
        <div className="space-y-4">
          <DesignDocForm
            sessionId={sessionId}
            me={me}
            onFieldChange={(f) => setChangedField(f)}
          />
          <div className="grid gap-4 md:grid-cols-2">
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
          hint={
            partner
              ? `③ 동료 검토 — ${partner.name} 선생님의 설계서에 코멘트 1개를 남겨 주세요.`
              : "짝을 찾을 수 없습니다."
          }
        >
          동료 검토
        </SectionTitle>
        {partner ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-surface-2 p-4">
              <div className="mb-2 font-medium">
                {partner.name} ({partner.subject})
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
        <SectionTitle hint="④ 강사 승인 — 세 가지 검토가 끝나면 강사가 승인합니다.">
          내가 받은 동료 코멘트 · 강사 승인
        </SectionTitle>
        {me.peerReviewDesign ? (
          <Notice tone="muted">
            <b>{me.peerReviewDesign.fromName}</b>: {me.peerReviewDesign.comment}
          </Notice>
        ) : (
          <p className="text-sm text-muted">아직 동료 코멘트가 없습니다.</p>
        )}
        <div className="mt-4">
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
  const prompt = buildCanvaPrompt(me.designDoc);

  if (!me.gateApproved) {
    return (
      <Card>
        <SectionTitle>4단계 · 제작</SectionTitle>
        <Notice tone="warn">
          🔒 아직 강사 승인을 받지 않았습니다. 설계 검토를 마치고 강사에게 승인을 요청해
          주세요.
        </Notice>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle hint="설계서를 그대로 조립한 프롬프트입니다. 복사해서 캔바 코드에 붙여넣으세요.">
          4단계 · 캔바 코드 프롬프트
        </SectionTitle>
        <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-4 text-sm">
          {prompt}
        </pre>
        <div className="flex flex-wrap gap-3">
          <CopyButton text={prompt} label="프롬프트 복사" />
          <a
            href="https://www.canva.com/code/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm hover:brightness-125"
          >
            캔바 코드 열기 ↗
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="만든 화면의 공유 링크를 붙여넣으세요.">
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
          <p className="mt-3 text-sm text-muted">
            제출된 링크:{" "}
            <a
              className="text-accent underline"
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
    <div className="space-y-5">
      <Card>
        <SectionTitle hint="슬라이더를 움직였을 때 그래프가 어떻게 변했는지 2~3문장으로 적으세요.">
          5단계 · 시뮬레이션 결과 요약
        </SectionTitle>
        <div className="space-y-3">
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
        <SectionTitle hint="결과 vs 가설·문헌 대조">AI 산출물 검토</SectionTitle>
        <AiReviewPanel
          sessionId={sessionId}
          participantId={me.id}
          kind="output"
          designDoc={me.designDoc}
          outputSummary={me.outputSummary}
          review={me.aiReviewOutput}
          disabled={!me.outputSummary.trim()}
          disabledReason="결과 요약을 먼저 저장해 주세요."
        />
      </Card>

      <Card>
        <SectionTitle hint="AI가 짚어 준 것 중 하나를 골라 한 줄로 추가하세요.">
          자기 검토 · 한계 1줄 추가
        </SectionTitle>
        <div className="space-y-3">
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
          <p className="text-sm text-muted">
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
        <SectionTitle>6단계 · 발표회</SectionTitle>
        <Notice tone="warn">강사가 발표자를 지정하면 화면이 바뀝니다.</Notice>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">
            발표자 · {presenter.name} ({presenter.subject})
          </h2>
          {isPresenter ? <Badge tone="ok">발표 중</Badge> : null}
          {role ? <Badge tone="warn">내 역할: {role} 검토관</Badge> : null}
        </div>
        {presenter.canvaLink ? (
          <a
            className="text-accent underline"
            href={presenter.canvaLink}
            target="_blank"
            rel="noreferrer"
          >
            {presenter.canvaLink} ↗
          </a>
        ) : (
          <p className="text-sm text-muted">제출된 링크가 없습니다.</p>
        )}
        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
          <DesignDocView doc={presenter.designDoc} />
        </div>
      </Card>

      {!isPresenter && role ? (
        <Card>
          <SectionTitle hint={`「${role}」 관점에서 질문 1개를 남겨 주세요.`}>
            검토관 질문
          </SectionTitle>
          {alreadyAsked ? (
            <Notice tone="ok">질문을 남겼습니다.</Notice>
          ) : (
            <div className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button
                disabled={!question.trim()}
                onClick={async () => {
                  const next: PeerQuestion[] = [
                    ...(presenter.peerQuestions ?? []),
                    {
                      fromId: me.id,
                      fromName: me.name,
                      role,
                      question: question.trim(),
                    },
                  ];
                  await patchParticipant(sessionId, presenter.id, {
                    peerQuestions: next,
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
        <SectionTitle>지금까지의 질문</SectionTitle>
        {presenter.peerQuestions?.length ? (
          <ul className="space-y-2 text-sm">
            {presenter.peerQuestions.map((q, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface-2 p-3">
                <Badge tone="warn">{q.role}</Badge>{" "}
                <span className="text-muted">{q.fromName}</span>
                <div className="mt-1">{q.question}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">아직 질문이 없습니다.</p>
        )}
        {presenter.instructorComment ? (
          <div className="mt-4">
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

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>오늘의 흐름</SectionTitle>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>설계서 7칸 중 <b>검증 기준</b>을 직접 썼습니다.</li>
          <li>AI → 자기 → 동료 → 강사, 네 번의 검토를 거쳐 설계를 다듬었습니다.</li>
          <li>설계서를 그대로 프롬프트로 바꿔 화면을 만들었습니다.</li>
          <li>결과를 가설·문헌과 대조하고 한계를 한 줄 더 붙였습니다.</li>
          <li>발표에서 변인·검증·한계 세 관점의 질문을 주고받았습니다.</li>
        </ol>
      </Card>

      <Card>
        <SectionTitle hint="딱 한 가지만 적어 주세요.">
          내 수업에 가져갈 것 하나
        </SectionTitle>
        <div className="space-y-3">
          <textarea value={takeaway} onChange={(e) => setTakeaway(e.target.value)} />
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
