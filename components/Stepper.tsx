"use client";

import { PHASES, PHASE_LABEL, type Phase } from "@/lib/types";

export function Stepper({
  phase,
  gateApproved,
}: {
  phase: Phase;
  gateApproved: boolean;
}) {
  const current = PHASES.indexOf(phase);

  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="진행 단계">
      {PHASES.map((p, i) => {
        const done = i < current;
        const active = i === current;
        // 제작(build) 단계는 강사 승인 게이트로 잠긴다
        const locked = p === "build" && !gateApproved;
        return (
          <li key={p} className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-accent bg-accent/15 font-bold text-accent"
                  : done
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : "border-line bg-surface-2 text-muted"
              }`}
            >
              <span className="tabular-nums">{i + 1}</span>
              <span>{PHASE_LABEL[p]}</span>
              {locked ? <span aria-label="강사 승인 필요">🔒</span> : null}
            </span>
            {i < PHASES.length - 1 ? (
              <span aria-hidden className="text-muted">
                ›
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
