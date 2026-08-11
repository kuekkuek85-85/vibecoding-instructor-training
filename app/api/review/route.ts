import { NextResponse } from "next/server";
import type { DesignDoc } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const TIMEOUT_MS = 12_000;

type Kind = "design" | "output";

function docBlock(d: DesignDoc): string {
  const rows: [string, string][] =
    d.usage === "explanation"
      ? [
          ["용도", "설명용 (개념을 설명하는 화면)"],
          ["설명하려는 개념", d.concept],
          ["탐구질문", d.question],
          ["예상 패턴", d.hypothesis],
          ["조작변인(슬라이더)", d.independentVar],
          ["종속변인(그래프 y축)", d.dependentVar],
          ["통제변인(화면 고정값)", d.controlledVars],
          ["과학적 정확성 근거", d.accuracyBasis],
        ]
      : [
          ["용도", "검증용 (가설을 확인하는 화면)"],
          ["탐구질문", d.question],
          ["가설", d.hypothesis],
          ["조작변인(슬라이더)", d.independentVar],
          ["종속변인(그래프 y축)", d.dependentVar],
          ["통제변인(화면 고정값)", d.controlledVars],
          ["검증 기준", d.verification],
          ["한계", d.limitations],
        ];
  return rows.map(([k, v]) => `- ${k}: ${v || "(비어 있음)"}`).join("\n");
}

function buildPrompt(kind: Kind, doc: DesignDoc, outputSummary: string): string {
  const header =
    "너는 중학 과학 탐구 지도교사다. 답변은 존댓말로 하고, 코드나 프로그래밍 이야기는 절대 하지 마라. " +
    "각 항목은 정해진 문장 수를 지키고, 불릿 기호 대신 아래 형식 그대로 써라.";

  if (kind === "design") {
    if (doc.usage === "explanation") {
      return [
        header,
        "",
        "아래 연구설계서는 '설명용' 화면입니다. 다음을 검토하세요.",
        "(a) 설명하려는 개념이 하나로 좁혀져 있는지",
        "(b) 제시한 과학적 정확성 근거가 교과서·문헌으로 확인 가능한지",
        "(c) 조작변인·종속변인·통제변인이 그 개념을 드러내기에 알맞은지",
        "",
        "[연구설계서]",
        docBlock(doc),
        "",
        "출력 형식:",
        "잘된 점: (1문장)",
        "보완점 1: (1문장)",
        "보완점 2: (1문장)",
      ].join("\n");
    }
    return [
      header,
      "",
      "아래 연구설계서를 검토하세요.",
      "(a) 조작변인·종속변인·통제변인이 논리적으로 맞물리는지",
      "(b) 검증 기준이 실측이나 문헌 대조로 실제 확인 가능한지",
      "(c) 탐구질문과 시뮬레이션 화면 구상이 일치하는지",
      "",
      "[연구설계서]",
      docBlock(doc),
      "",
      "출력 형식:",
      "잘된 점: (1문장)",
      "보완점 1: (1문장)",
      "보완점 2: (1문장)",
    ].join("\n");
  }

  if (doc.usage === "explanation") {
    return [
      header,
      "",
      "아래 '설명용' 연구설계서와, 수강생이 보고한 시뮬레이션 결과 요약을 대조하세요.",
      "(a) 화면이 보여 준 내용이 개념을 과학적으로 정확하게 설명하는지",
      "(b) 교과서·문헌으로 정확성을 확인할 방법 1개",
      "(c) 한계에 추가할 요인 1개",
      "",
      "[연구설계서]",
      docBlock(doc),
      "",
      "[시뮬레이션 결과 요약]",
      outputSummary || "(수강생이 아직 요약을 적지 않았습니다)",
      "",
      "출력 형식:",
      "정확성 확인: (1~2문장)",
      "대조 방법 제안: (1~2문장)",
      "추가할 한계: (1~2문장)",
    ].join("\n");
  }

  return [
    header,
    "",
    "아래 연구설계서의 가설과, 수강생이 보고한 시뮬레이션 결과 요약을 대조하세요.",
    "(a) 결과가 가설 및 과학 원리와 부합하는지",
    "(b) 문헌값이나 실측과 대조할 방법 1개",
    "(c) 한계에 추가할 요인 1개",
    "",
    "[연구설계서]",
    docBlock(doc),
    "",
    "[시뮬레이션 결과 요약]",
    outputSummary || "(수강생이 아직 요약을 적지 않았습니다)",
    "",
    "출력 형식:",
    "가설 대조: (1~2문장)",
    "대조 방법 제안: (1~2문장)",
    "추가할 한계: (1~2문장)",
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다. 강사 검토로 대체해 주세요." },
      { status: 503 }
    );
  }

  let body: { kind?: Kind; designDoc?: DesignDoc; outputSummary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const kind = body.kind;
  const doc = body.designDoc;
  if ((kind !== "design" && kind !== "output") || !doc || typeof doc !== "object") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const prompt = buildPrompt(kind, doc, body.outputSummary ?? "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[api/review] Gemini error", res.status, detail.slice(0, 500));
      return NextResponse.json(
        { error: `AI 검토 서버 오류 (${res.status}). 다시 시도하거나 강사 검토로 대체해 주세요.` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[api/review] failed", err);
    return NextResponse.json(
      {
        error: aborted
          ? "AI 검토가 12초 안에 응답하지 않았습니다. 다시 시도하거나 강사 검토로 대체해 주세요."
          : "AI 검토 호출에 실패했습니다. 다시 시도하거나 강사 검토로 대체해 주세요.",
      },
      { status: 504 }
    );
  } finally {
    clearTimeout(timer);
  }
}
