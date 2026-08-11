"use client";

import { PHASES, PHASE_LABEL, type Phase } from "@/lib/types";

/**
 * 단계 표시기. pricing-tab 패턴을 그대로 쓴다 — 지금 보고 있는 단계는 primary 표면(검정),
 * 지나온 단계는 흰 알약, 아직인 단계는 surface-soft.
 *
 * 지나온 단계는 눌러서 다시 볼 수 있다. 아직 강사가 열지 않은 단계는 누를 수 없다.
 */
export function Stepper({
  classPhase,
  viewPhase,
  gateApproved,
  onSelect,
}: {
  /** 강사가 지금 열어 둔 단계 — 여기까지만 되돌아갈 수 있다 */
  classPhase: Phase;
  /** 수강생이 지금 보고 있는 단계 */
  viewPhase: Phase;
  gateApproved: boolean;
  onSelect: (p: Phase) => void;
}) {
  const classIndex = PHASES.indexOf(classPhase);
  const viewIndex = PHASES.indexOf(viewPhase);

  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="진행 단계">
      {PHASES.map((p, i) => {
        const viewing = i === viewIndex;
        const reachable = i <= classIndex;
        const done = i < classIndex;
        // 제작 단계는 강사 승인 게이트로 잠긴다
        const locked = p === "build" && !gateApproved;

        return (
          <li key={p}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(p)}
              aria-current={viewing ? "step" : undefined}
              title={reachable ? `${PHASE_LABEL[p]} 단계 보기` : "아직 열리지 않은 단계입니다"}
              className={`t-caption inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 transition ${
                viewing
                  ? "border-transparent bg-primary text-on-primary"
                  : done
                    ? "border-hairline bg-canvas text-ink hover:border-ink"
                    : "border-transparent bg-surface-soft text-ink opacity-45"
              }`}
            >
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="normal-case tracking-normal">{PHASE_LABEL[p]}</span>
              {locked ? <span aria-label="강사 승인 필요">🔒</span> : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
