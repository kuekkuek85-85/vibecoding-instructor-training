import type { DesignDoc } from "./types";

/** 설계서를 캔바 코드용 프롬프트로 조립한다. */
export function buildCanvaPrompt(d: DesignDoc): string {
  if (d.usage === "explanation") {
    return [
      "다음 과학 시뮬레이션 위젯을 만들어줘.",
      `- 목적: ${d.concept || d.question} 개념을 설명하는 화면`,
      `- 슬라이더: ${d.independentVar} 1개만`,
      `- 그래프: x축=${d.independentVar}, y축=${d.dependentVar}`,
      `- 화면에 고정값으로 명시: ${d.controlledVars}`,
      `- 예상 패턴: ${d.hypothesis}`,
      `- 과학적 정확성 근거: ${d.accuracyBasis}`,
      "- 기능은 위 1개만. 로그인/저장/장식 애니메이션 금지. 한국어 UI.",
    ].join("\n");
  }

  return [
    "다음 과학 시뮬레이션 위젯을 만들어줘.",
    `- 목적: ${d.question}에 답하는 화면`,
    `- 슬라이더: ${d.independentVar} 1개만`,
    `- 그래프: x축=${d.independentVar}, y축=${d.dependentVar}`,
    `- 화면에 고정값으로 명시: ${d.controlledVars}`,
    `- 예상 패턴: ${d.hypothesis}`,
    "- 기능은 위 1개만. 로그인/저장/장식 애니메이션 금지. 한국어 UI.",
  ].join("\n");
}
