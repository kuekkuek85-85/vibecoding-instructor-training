"use client";

import { useEffect, useRef, useState } from "react";
import { patchParticipant } from "@/lib/db";
import { CUSTOM_ID, DESIGN_SEEDS } from "@/lib/seed-data";
import { EMPTY_DESIGN_DOC, type DesignDoc, type Participant, type Usage } from "@/lib/types";
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

  /**
   * 저장은 한 번에 하나씩만 보낸다. 요청이 겹쳐 역순으로 끝나면 옛 값이
   * 최신 입력을 덮어쓸 수 있기 때문이다. 저장 중에 들어온 편집은 pending 에
   * 쌓였다가 다음 flush 에서 함께 나간다.
   */
  const inFlight = useRef(false);
  /** 예시 적용처럼 문서를 통째로 바꾸는 동작이 일어난 횟수 — 오래된 응답을 무시하는 데 쓴다 */
  const revision = useRef(0);
  const latest = useRef(doc);
  latest.current = doc;

  function flush() {
    if (readOnly || inFlight.current) return;
    const fields = [...pending.current];
    if (fields.length === 0) return;

    const rev = revision.current;
    const snapshot = latest.current;
    const patch: Record<string, string> = {};
    // 필드 단위 업데이트: 같은 참가자를 두 탭에서 열어도 서로 다른 칸은 살아남는다.
    for (const f of fields) patch[`designDoc.${f}`] = snapshot[f];

    inFlight.current = true;
    patchParticipant(sessionId, me.id, patch)
      .then(() => {
        // 그 사이 예시를 적용해 문서가 통째로 바뀌었다면 이 저장 결과는 버린다.
        if (rev !== revision.current) return;
        // 성공한 필드만 제거한다. 저장 도중 다시 입력한 필드는 남아 다음에 나간다.
        for (const f of fields) {
          if (snapshot[f] === latest.current[f]) pending.current.delete(f);
        }
        if (pending.current.size === 0) setDirty(false);
      })
      .catch(() => {
        // 실패한 필드는 pending 에 그대로 남겨 두어 다음 입력·blur 때 다시 시도한다.
        setDirty(true);
      })
      .finally(() => {
        inFlight.current = false;
        // 저장 중에 쌓인 편집이 있으면 이어서 내보낸다.
        if (pending.current.size > 0) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, SAVE_DELAY);
        }
      });
  }

  function update(field: keyof DesignDoc, value: string) {
    if (readOnly) return;
    const next = { ...doc, [field]: value } as DesignDoc;
    setDoc(next);
    latest.current = next;
    pending.current.add(field);
    setDirty(true);
    onFieldChange?.(field);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }

  /** 문서 전체를 한 번에 덮어쓴다. 대기 중인 낱개 저장은 취소하고 revision 을 올려
   *  이미 날아간 요청의 응답도 무시한다. */
  function replaceDoc(next: DesignDoc, seedId: string | null) {
    if (readOnly) return;
    if (timer.current) clearTimeout(timer.current);
    pending.current.clear();
    revision.current += 1;
    const rev = revision.current;
    setDoc(next);
    latest.current = next;
    setDirty(true);
    patchParticipant(sessionId, me.id, { designDoc: next, seedId })
      .then(() => {
        if (rev === revision.current && pending.current.size === 0) setDirty(false);
      })
      .catch(() => setDirty(true));
  }

  function onPickSource(value: string) {
    if (readOnly) return;
    if (value === CUSTOM_ID) {
      // 직접 작성으로 바꾸는 것만으로 쓰던 내용을 지우지 않는다.
      // 백지에서 시작하려면 옆의 "칸 비우기"를 누르면 된다.
      replaceDoc(doc, CUSTOM_ID);
      return;
    }
    const seed = DESIGN_SEEDS.find((s) => s.id === value);
    if (!seed) return;
    replaceDoc({ ...seed.doc }, seed.id);
  }

  function clearAll() {
    // 용도만 남기고 일곱 칸을 비운다.
    replaceDoc({ ...EMPTY_DESIGN_DOC, usage: doc.usage }, CUSTOM_ID);
  }

  /** 포커스를 잃으면 디바운스를 기다리지 않고 즉시 저장한다. */
  function flushNow() {
    if (timer.current) clearTimeout(timer.current);
    flush();
  }

  const isExplanation = doc.usage === "explanation";

  return (
    // onBlur 는 버블링되므로 어느 칸이든 포커스를 잃으면 바로 저장된다.
    <div className="space-y-4" onBlur={readOnly ? undefined : flushNow}>
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="t-caption opacity-60">소재</span>
          <select
            className="max-w-xs"
            value={me.seedId ?? ""}
            onChange={(e) => onPickSource(e.target.value)}
          >
            <option value="">— 선택 —</option>
            {DESIGN_SEEDS.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.subject}] {s.title}
              </option>
            ))}
            <option value={CUSTOM_ID}>기타 — 직접 작성</option>
          </select>
          {me.seedId === CUSTOM_ID ? (
            <button
              type="button"
              onClick={clearAll}
              className="t-caption rounded-pill border border-hairline px-3 py-1.5 transition hover:border-ink"
            >
              칸 비우기
            </button>
          ) : null}
          <span className={`t-caption ${saved ? "opacity-45" : "opacity-100"}`}>
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
          placeholder="예) 물의 온도가 높아지면 설탕이 녹는 속도는 얼마나 빨라질까?"
          onChange={(e) => update("question", e.target.value)}
        />
      </Field>

      {isExplanation ? (
        <Field label="설명하려는 개념" hint="딱 1개">
          <textarea
            value={doc.concept}
            readOnly={readOnly}
            placeholder="예) 용해 속도는 온도에 따라 달라진다"
            onChange={(e) => update("concept", e.target.value)}
          />
        </Field>
      ) : null}

      <Field label="가설" hint="예상 그래프 패턴">
        <textarea
          value={doc.hypothesis}
          readOnly={readOnly}
          placeholder="예) 온도가 높을수록 녹는 시간이 짧아지고, 그 폭은 점점 완만해진다"
          onChange={(e) => update("hypothesis", e.target.value)}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="조작변인" hint="슬라이더가 될 값">
          <textarea
            value={doc.independentVar}
            readOnly={readOnly}
            placeholder="예) 물의 온도 (10 ℃ ~ 80 ℃)"
            onChange={(e) => update("independentVar", e.target.value)}
          />
        </Field>
        <Field label="종속변인" hint="그래프 y축">
          <textarea
            value={doc.dependentVar}
            readOnly={readOnly}
            placeholder="예) 완전히 녹는 데 걸리는 시간 (초)"
            onChange={(e) => update("dependentVar", e.target.value)}
          />
        </Field>
      </div>

      <Field label="통제변인" hint="화면에 고정값으로 명시할 것">
        <textarea
          value={doc.controlledVars}
          readOnly={readOnly}
          placeholder="예) 설탕 5 g, 물 100 mL, 젓지 않음, 대기압 1 atm"
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
            placeholder="예) 중학교 과학 교과서의 용해 단원 설명과 대조한다"
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
            value={doc.verification}
            readOnly={readOnly}
            placeholder="예) 20 ℃와 60 ℃에서 실제로 녹는 시간을 재어, 화면이 보여 준 값과 10 % 이내로 맞는지 확인한다"
            onChange={(e) => update("verification", e.target.value)}
          />
        </Field>
      )}

      <Field label="한계" hint="이 화면이 무시한 요인">
        <textarea
          value={doc.limitations}
          readOnly={readOnly}
          placeholder="예) 설탕 입자 크기가 같다고 가정했고, 물의 증발과 대류를 무시했다"
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
    <dl className="divide-y divide-hairline-soft">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
          <dt className="t-caption pt-1 opacity-50">{k}</dt>
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
