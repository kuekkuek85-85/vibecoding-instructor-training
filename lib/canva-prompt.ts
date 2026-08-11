import type { DesignDoc, Subject } from "./types";

/**
 * 설계서를 캔바 코드용 프롬프트로 조립한다.
 *
 * 구조는 프롬프트 작성의 일반적인 뼈대를 따른다.
 *   ① 내가 누구인지 · 어디에 쓸 것인지(사용자와 맥락)
 *   ② 만들 것의 조건(설계서 그대로)
 *   ③ 무엇이 되면 성공인지(성공 조건)
 *   ④ 하지 말 것
 *
 * 제약(④)을 일부러 맨 끝에 둔다. 앞에 두면 조건 목록에 묻혀서,
 * "기능 하나만" 이라는 이 수업의 핵심 제약이 지켜지지 않는다.
 */
export function buildCanvaPrompt(d: DesignDoc, subject?: Subject): string {
  const lines: string[] = [];

  // ① 사용자와 맥락
  lines.push("나는 중학교 과학영재원에서 산출물 연구를 하는 학생이야.");
  lines.push("오늘 만드는 화면은 수업과 발표회에서 내 탐구를 보여 주는 데 쓸 거야.");
  const field = subject && subject !== "미정" ? `분야는 ${subject}이고` : "";
  const topic = d.topicTitle.trim() ? `주제는 "${d.topicTitle.trim()}"야.` : "";
  if (field && topic) lines.push(`${field}, ${topic}`);
  else if (field) lines.push(`${field}.`);
  else if (topic) lines.push(topic);
  lines.push("");

  // ② 만들 것의 조건
  lines.push("아래 조건에 딱 맞는 과학 시뮬레이션 위젯 하나를 만들어 줘.");
  if (d.usage === "explanation") {
    lines.push(`- 목적: ${d.concept || d.question} 개념을 설명하는 화면`);
  } else {
    lines.push(`- 목적: ${d.question}에 답하는 화면`);
  }
  lines.push(`- 슬라이더: ${d.independentVar} 1개만`);
  lines.push(`- 그래프: x축=${d.independentVar}, y축=${d.dependentVar}`);
  lines.push(`- 화면에 고정값으로 명시: ${d.controlledVars}`);
  lines.push(`- 예상 패턴: ${d.hypothesis}`);

  // 수강생이 유일하게 직접 쓰는 칸이므로 반드시 프롬프트에 실어 보낸다
  if (d.usage === "explanation") {
    if (d.accuracyBasis.trim()) {
      lines.push(`- 과학적 정확성 근거: ${d.accuracyBasis}`);
    }
  } else if (d.verification.trim()) {
    lines.push(`- 화면에서 확인할 수 있어야 하는 것: ${d.verification}`);
  }
  lines.push("");

  // ③ 성공 조건
  lines.push(
    "성공 조건: 슬라이더를 움직였을 때 그래프가 예상 패턴대로 변하고, 위에 적은 값들을 화면에서 눈으로 읽을 수 있으면 성공이야."
  );
  lines.push("");

  // ④ 하지 말 것 — 맨 끝에 둔다
  lines.push(
    "기능은 위 1개만 만들어 줘. 로그인·저장·장식 애니메이션은 넣지 마. 한국어 UI로 만들어 줘."
  );

  return lines.join("\n");
}
