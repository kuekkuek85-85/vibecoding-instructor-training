"use client";

import { useEffect, useRef, useState } from "react";
import { patchParticipant } from "@/lib/db";
import { DESIGN_SEEDS } from "@/lib/seed-data";
import type { DesignDoc, Participant, Usage } from "@/lib/types";
import { Button, Field, Notice } from "./ui";

const SAVE_DELAY = 500;

export function DesignDocForm({
  sessionId,
  me,
  readOnly = false,
  onFieldChange,
  onDirtyChange,
}: {
  sessionId: string;
  me: Participant;
  readOnly?: boolean;
  /** 자기 검토 단계에서 "어느 칸을 고쳤는지" 추적하는 콜백 */
  onFieldChange?: (field: keyof DesignDoc) => void;
  /** 저장 대기 중인 편집이 있는지 알린다 (AI 검토 버튼 잠금용) */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [doc, setDoc] = useState<DesignDoc>(me.designDoc);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 아직 서버에 반영되지 않은 편집이 있으면 true — 원격 스냅샷 덮어쓰기를 막는다 */
  const dirty = useRef(false);
  /** 편집한 필드만 골라 저장하기 위한 목록 (다른 탭의 다른 필드 수정을 지우지 않음) */
  const pending = useRef(new Set<keyof DesignDoc>());

  function setDirty(v: boolean) {
    dirty.current = v;
    setSaved(!v);
    onDirtyChange?.(v);
  }

  // 다른 기기/강사가 바꾼 값은 내가 편집 중이 아닐 때만 반영한다.
  // saved 를 의존성에 넣어, 저장이 끝나 깨끗해진 직후에도 한 번 동기화되게 한다.
  useEffect(() => {
    if (dirty.current) return;
    setDoc(me.designDoc);
  }, [me.designDoc, saved]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function flush(next: DesignDoc) {
    const fields = [...pending.current];
    pending.current.clear();
    if (fields.length === 0) return;
    // 필드 단위 업데이트: 같은 참가자를 두 탭에서 열어도 서로 다른 칸은 살아남는다.
    const patch: Record<string, string> = {};
    for (const f of fields) patch[`designDoc.${f}`] = next[f];
    patchParticipant(sessionId, me.id, patch)
      .then(() => {
        // 저장하는 사이에 또 입력했다면 아직 dirty 로 남겨 둔다.
        if (pending.current.size === 0) setDirty(false);
      })
      .catch(() => setDirty(true));
  }

  function update(field: keyof DesignDoc, value: string) {
    if (readOnly) return;
    const next = { ...doc, [field]: value } as DesignDoc;
    setDoc(next);
    pending.current.add(field);
    setDirty(true);
    onFieldChange?.(field);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(next), SAVE_DELAY);
  }

  function applySeed(seedId: string) {
    const seed = DESIGN_SEEDS.find((s) => s.id === seedId);
    if (!seed || readOnly) return;
    // 예시를 통째로 덮어쓰므로 대기 중인 낱개 편집 저장은 취소한다.
    if (timer.current) clearTimeout(timer.current);
    pending.current.clear();
    const next = { ...seed.doc };
    setDoc(next);
    setDirty(true);
    patchParticipant(sessionId, me.id, { designDoc: next, seedId: seed.id })
      .then(() => setDirty(false))
      .catch(() => setDirty(true));
  }

  /** 포커스를 잃으면 디바운스를 기다리지 않고 즉시 저장한다. */
  function flushNow() {
    if (timer.current) clearTimeout(timer.current);
    flush(doc);
  }

  const isExplanation = doc.usage === "explanation";

  return (
    // onBlur 는 버블링되므로 어느 칸이든 포커스를 잃으면 바로 저장된다.
    <div className="space-y-4" onBlur={readOnly ? undefined : flushNow}>
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">소재 예시 불러오기</span>
          <select
            className="max-w-xs"
            value={me.seedId ?? ""}
            onChange={(e) => applySeed(e.target.value)}
          >
            <option value="">— 선택 —</option>
            {DESIGN_SEEDS.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.subject}] {s.title}
              </option>
            ))}
          </select>
          <span className={`text-xs ${saved ? "text-ok" : "text-warn"}`}>
            {saved ? "저장됨" : "저장 중…"}
          </span>
        </div>
      ) : null}

      <Field label="용도">
        <select
          value={doc.usage}
          disabled={readOnly}
          onChange={(e) => update("usage", e.target.value as Usage)}
        >
          <option value="verification">검증용 — 가설이 맞는지 확인하는 화면</option>
          <option value="explanation">설명용 — 개념 하나를 설명하는 화면</option>
        </select>
      </Field>

      <Field label="탐구질문" hint="화면이 답할 질문">
        <textarea
          value={doc.question}
          readOnly={readOnly}
          onChange={(e) => update("question", e.target.value)}
        />
      </Field>

      {isExplanation ? (
        <Field label="설명하려는 개념" hint="딱 1개">
          <textarea
            value={doc.concept}
            readOnly={readOnly}
            onChange={(e) => update("concept", e.target.value)}
          />
        </Field>
      ) : null}

      <Field label="가설" hint="예상 그래프 패턴">
        <textarea
          value={doc.hypothesis}
          readOnly={readOnly}
          onChange={(e) => update("hypothesis", e.target.value)}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="조작변인" hint="슬라이더가 될 값">
          <textarea
            value={doc.independentVar}
            readOnly={readOnly}
            onChange={(e) => update("independentVar", e.target.value)}
          />
        </Field>
        <Field label="종속변인" hint="그래프 y축">
          <textarea
            value={doc.dependentVar}
            readOnly={readOnly}
            onChange={(e) => update("dependentVar", e.target.value)}
          />
        </Field>
      </div>

      <Field label="통제변인" hint="화면에 고정값으로 명시할 것">
        <textarea
          value={doc.controlledVars}
          readOnly={readOnly}
          onChange={(e) => update("controlledVars", e.target.value)}
        />
      </Field>

      {isExplanation ? (
        <Field
          label="과학적 정확성 근거"
          hint="교과서·문헌 등 근거"
          highlight={!readOnly}
        >
          <textarea
            value={doc.accuracyBasis}
            readOnly={readOnly}
            onChange={(e) => update("accuracyBasis", e.target.value)}
          />
        </Field>
      ) : (
        <Field
          label="검증 기준"
          hint="실측값이나 문헌값과 어떻게 대조할 것인지 구체적으로"
          highlight={!readOnly}
        >
          <textarea
            className="border-warn/60"
            value={doc.verification}
            readOnly={readOnly}
            onChange={(e) => update("verification", e.target.value)}
          />
        </Field>
      )}

      <Field label="한계" hint="이 화면이 무시한 요인">
        <textarea
          value={doc.limitations}
          readOnly={readOnly}
          onChange={(e) => update("limitations", e.target.value)}
        />
      </Field>

      {!readOnly && !isExplanation && !doc.verification.trim() ? (
        <Notice tone="warn">
          ★ <b>검증 기준</b> 칸은 직접 작성하는 칸입니다. 이 칸이 비어 있으면 AI 검토가
          의미 있는 피드백을 주기 어렵습니다.
        </Notice>
      ) : null}
    </div>
  );
}

export function DesignDocView({ doc }: { doc: DesignDoc }) {
  const rows: [string, string][] =
    doc.usage === "explanation"
      ? [
          ["설명하려는 개념", doc.concept],
          ["탐구질문", doc.question],
          ["예상 패턴", doc.hypothesis],
          ["조작변인", doc.independentVar],
          ["종속변인", doc.dependentVar],
          ["통제변인", doc.controlledVars],
          ["정확성 근거", doc.accuracyBasis],
          ["한계", doc.limitations],
        ]
      : [
          ["탐구질문", doc.question],
          ["가설", doc.hypothesis],
          ["조작변인", doc.independentVar],
          ["종속변인", doc.dependentVar],
          ["통제변인", doc.controlledVars],
          ["검증 기준", doc.verification],
          ["한계", doc.limitations],
        ];

  return (
    <dl className="divide-y divide-line/60 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
          <dt className="text-muted">{k}</dt>
          <dd className="whitespace-pre-wrap">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      tone={copied ? "ok" : "primary"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // clipboard API 차단 시 fallback
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "복사됨 ✓" : label}
    </Button>
  );
}
