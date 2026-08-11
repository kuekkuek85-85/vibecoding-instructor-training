"use client";

import { PHASES, PHASE_LABEL, type Phase } from "@/lib/types";

/**
 * 단계 표시기. pricing-tab 패턴을 그대로 쓴다 — 현재 단계는 primary 표면(검정),
 * 지나온 단계는 흰 알약, 아직인 단계는 surface-soft.
 */
export function Stepper({
  phase,
  gateApproved,
}: {
  phase: Phase;
  gateApproved: boolean;
}) {
  const current = PHASES.indexOf(phase);

  return (
    <ol
      className="flex flex-wrap items-center gap-1.5"
      aria-label="진행 단계"
    >
      {PHASES.map((p, i) => {
        const done = i < current;
        const active = i === current;
        // 제작 단계는 강사 승인 게이트로 잠긴다
        const locked = p === "build" && !gateApproved;
        return (
          <li key={p}>
            <span
              aria-current={active ? "step" : undefined}
              className={`t-caption inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 ${
                active
                  ? "border-transparent bg-primary text-on-primary"
                  : done
                    ? "border-hairline bg-canvas text-ink"
                    : "border-transparent bg-surface-soft text-ink opacity-45"
              }`}
            >
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="normal-case tracking-normal">{PHASE_LABEL[p]}</span>
              {locked ? <span aria-label="강사 승인 필요">🔒</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
