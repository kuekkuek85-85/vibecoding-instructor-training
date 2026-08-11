"use client";

import { useEffect, useRef, useState } from "react";
import { DesignDocView } from "./DesignDocForm";
import { Badge, Eyebrow } from "./ui";
import { nameWithSubject, type Participant } from "@/lib/types";

/** 팝업 안에서 바로 가고 싶은 위치 */
export type ModalSection =
  | "design"
  | "aiDesign"
  | "self"
  | "peer"
  | "output"
  | "aiOutput"
  | "questions"
  | "takeaway";

const SECTION_LABEL: Record<ModalSection, string> = {
  design: "연구설계서",
  aiDesign: "AI 설계 검토",
  self: "자기 검토",
  peer: "동료 검토",
  output: "산출물",
  aiOutput: "AI 산출물 검토",
  questions: "검토관 질문",
  takeaway: "가져갈 것 하나",
};

function Block({
  id,
  title,
  filled,
  active,
  children,
}: {
  id: ModalSection;
  title: string;
  filled: boolean;
  active: ModalSection | "all";
  children: React.ReactNode;
}) {
  if (active !== "all" && active !== id) return null;
  return (
    <section className="border-t border-hairline pt-6">
      <div className="mb-3 flex items-center gap-3">
        <Eyebrow>{title}</Eyebrow>
        {!filled ? <span className="t-caption opacity-40">미작성</span> : null}
      </div>
      {filled ? children : <p className="t-body-sm opacity-40">—</p>}
    </section>
  );
}

export function ParticipantModal({
  p,
  section,
  onClose,
}: {
  p: Participant;
  section: ModalSection;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // onClose 는 부모에서 매 렌더 새로 만들어지므로 ref 에 담아 둔다.
  // 이걸 의존성에 넣으면 effect 가 매 렌더 재실행되면서, 두 번째 실행이
  // 이미 "hidden" 이 된 값을 prev 로 잡아 닫은 뒤에도 스크롤이 잠긴 채 남는다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    // 팝업이 떠 있는 동안 뒤 화면이 스크롤되지 않게 한다
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  /** 스크롤로 위치를 맞추는 대신 한 번에 한 단계만 보여 준다.
   *  클릭한 단계가 곧바로 화면에 오고, 위 칩으로 옮겨 다닌다. */
  const [active, setActive] = useState<ModalSection | "all">(section);

  // 다른 줄을 눌러 다시 열면 부모가 key 를 바꿔 이 컴포넌트를 새로 마운트한다.
  // 그래서 여기서 section 을 다시 동기화할 필요가 없다.

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name} 산출물`}
        className="w-full max-w-3xl rounded-lg bg-canvas p-6 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow className="mb-2">Submission</Eyebrow>
            <h2 className="t-display-lg">{p.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.subject !== "미정" ? <Badge tone="accent">{p.subject}</Badge> : null}
              <Badge>{String(p.stage).padStart(2, "0")} 단계</Badge>
              {p.gateApproved ? (
                <Badge tone="ok">승인됨</Badge>
              ) : (
                <Badge tone="warn">미승인</Badge>
              )}
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="t-caption rounded-pill border border-hairline px-4 py-2 transition hover:border-ink"
          >
            닫기 (Esc)
          </button>
        </div>

        {/* 단계 탭 */}
        <nav className="mb-6 flex flex-wrap gap-1.5">
          {([...(Object.keys(SECTION_LABEL) as ModalSection[]), "all"] as const).map(
            (k) => (
              <button
                key={k}
                onClick={() => setActive(k)}
                className={`t-caption rounded-pill border px-3 py-1.5 transition ${
                  k === active
                    ? "border-transparent bg-primary text-on-primary"
                    : "border-hairline hover:border-ink"
                }`}
              >
                {k === "all" ? "전체" : SECTION_LABEL[k]}
              </button>
            )
          )}
        </nav>

        <div className="space-y-6">
          <Block id="design" active={active} title="연구설계서" filled={Boolean(p.designDoc?.question)}>
            <DesignDocView doc={p.designDoc} />
          </Block>

          <Block id="aiDesign" active={active} title="AI 설계 검토" filled={Boolean(p.aiReviewDesign?.text)}>
            <p className="t-body-sm whitespace-pre-wrap rounded-md border-l-2 border-ink bg-surface-soft p-5">
              {p.aiReviewDesign?.text}
            </p>
          </Block>

          <Block id="self" active={active} title="자기 검토" filled={Boolean(p.selfReviewDesign?.note)}>
            <p className="t-body-sm">
              <span className="opacity-50">고친 칸 — </span>
              {p.selfReviewDesign?.changedField}
            </p>
            <p className="t-body-sm mt-2">{p.selfReviewDesign?.note}</p>
          </Block>

          <Block id="peer" active={active} title="동료 검토" filled={Boolean(p.peerReviewDesign?.comment)}>
            <p className="t-body-sm">
              <span className="opacity-50">{p.peerReviewDesign?.fromName} — </span>
              {p.peerReviewDesign?.comment}
            </p>
          </Block>

          <Block
            id="output"
            active={active}
            title="산출물"
            filled={Boolean(p.canvaLink || p.outputSummary)}
          >
            {p.canvaLink ? (
              <a
                className="t-body-sm block underline underline-offset-4"
                href={p.canvaLink}
                target="_blank"
                rel="noreferrer"
              >
                {p.canvaLink} ↗
              </a>
            ) : null}
            {p.outputSummary ? (
              <p className="t-body-sm mt-3 whitespace-pre-wrap">{p.outputSummary}</p>
            ) : null}
          </Block>

          <Block
            id="aiOutput"
            active={active}
            title="AI 산출물 검토"
            filled={Boolean(p.aiReviewOutput?.text)}
          >
            <p className="t-body-sm whitespace-pre-wrap rounded-md border-l-2 border-ink bg-surface-soft p-5">
              {p.aiReviewOutput?.text}
            </p>
            {p.selfReviewOutput?.limitationAdded ? (
              <p className="t-body-sm mt-3">
                <span className="opacity-50">추가한 한계 — </span>
                {p.selfReviewOutput.limitationAdded}
              </p>
            ) : null}
          </Block>

          <Block
            id="questions"
            active={active}
            title="검토관 질문"
            filled={Boolean(p.peerQuestions?.length)}
          >
            <ul className="space-y-3">
              {p.peerQuestions?.map((q, i) => (
                <li key={i} className="rounded-md bg-surface-soft p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge tone="warn">{q.role}</Badge>
                    <span className="t-caption opacity-50">{q.fromName}</span>
                  </div>
                  <p className="t-body-sm">{q.question}</p>
                </li>
              ))}
            </ul>
            {p.instructorComment ? (
              <p className="t-body-sm mt-4">
                <span className="opacity-50">강사 코멘트 — </span>
                {p.instructorComment}
              </p>
            ) : null}
          </Block>

          <Block id="takeaway" active={active} title="가져갈 것 하나" filled={Boolean(p.takeaway)}>
            <p className="t-subhead">{p.takeaway}</p>
          </Block>
        </div>

        <p className="t-caption mt-8 opacity-40">
          {nameWithSubject(p.name, p.subject)} · 실시간으로 갱신됩니다
        </p>
      </div>
    </div>
  );
}
