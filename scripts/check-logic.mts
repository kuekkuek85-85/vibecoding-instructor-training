import {
  designReviewComplete,
  findPartner,
  reviewerRoleFor,
  phaseToStage,
  PHASES,
  type Participant,
} from "../lib/types.ts";
import { buildCanvaPrompt } from "../lib/canva-prompt.ts";
import { DESIGN_SEEDS } from "../lib/seed-data.ts";

function mk(id: string, order: number, extra: Partial<Participant> = {}): Participant {
  return {
    id,
    name: id,
    subject: "물리",
    order,
    stage: 1,
    gateApproved: false,
    seedId: null,
    designDoc: {} as Participant["designDoc"],
    aiReviewDesign: null,
    selfReviewDesign: null,
    peerReviewDesign: null,
    canvaLink: "",
    outputSummary: "",
    aiReviewOutput: null,
    selfReviewOutput: null,
    peerQuestions: [],
    instructorComment: "",
    takeaway: "",
    ...extra,
  };
}

let fails = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    fails++;
    console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

const four = [mk("p1", 0), mk("p2", 1), mk("p3", 2), mk("p4", 3)];

// 1. 짝 배정: 상호적이어야 하고 자기 자신이면 안 된다
for (const p of four) {
  const partner = findPartner(p, four);
  const back = partner ? findPartner(partner, four) : null;
  eq(back?.id, p.id, `짝이 상호적 (${p.id} ↔ ${partner?.id})`);
  eq(partner?.id === p.id, false, `${p.id} 의 짝은 자기 자신이 아님`);
}

// 2. 참가자가 3명(홀수)일 때 마지막 사람은 짝이 없다 — 크래시하지 않아야 한다
const three = [mk("a", 0), mk("b", 1), mk("c", 2)];
eq(findPartner(three[2], three), null, "홀수 인원의 마지막 사람은 짝 없음(null)");

// 3. 검토관 역할: 발표자는 null, 나머지 3명은 서로 다른 역할
for (const presenter of four) {
  const roles = four
    .filter((p) => p.id !== presenter.id)
    .map((p) => reviewerRoleFor(p.id, presenter.id, four));
  eq(reviewerRoleFor(presenter.id, presenter.id, four), null, `${presenter.id} 발표 중 본인 역할 없음`);
  eq(new Set(roles).size, 3, `${presenter.id} 발표 시 검토관 3명 역할이 모두 다름`);
  eq([...roles].sort(), ["검증", "변인", "한계"], `${presenter.id} 발표 시 역할 구성`);
}

// 4. 게이트 조건: 3종이 모두 있어야 true
eq(designReviewComplete(mk("x", 0)), false, "검토 0종 → 승인 불가");
eq(
  designReviewComplete(
    mk("x", 0, {
      aiReviewDesign: { text: "t", createdAt: 1 },
      selfReviewDesign: { changedField: "hypothesis", note: "n" },
    })
  ),
  false,
  "동료 검토 빠짐 → 승인 불가"
);
eq(
  designReviewComplete(
    mk("x", 0, {
      aiReviewDesign: { text: "t", createdAt: 1 },
      selfReviewDesign: { changedField: "hypothesis", note: "n" },
      peerReviewDesign: { fromId: "y", fromName: "Y", comment: "c" },
    })
  ),
  true,
  "3종 완료 → 승인 가능"
);
// 빈 문자열은 완료로 치면 안 된다
eq(
  designReviewComplete(
    mk("x", 0, {
      aiReviewDesign: { text: "", createdAt: 1 },
      selfReviewDesign: { changedField: "hypothesis", note: "n" },
      peerReviewDesign: { fromId: "y", fromName: "Y", comment: "c" },
    })
  ),
  false,
  "AI 검토 텍스트가 비면 승인 불가"
);

// 5. 단계 번호는 1~7
eq(PHASES.map(phaseToStage), [1, 2, 3, 4, 5, 6, 7], "phase → 단계 번호 1~7");

// 6. 캔바 프롬프트: 사용자·맥락 → 조건 → 성공 조건 → 제약 순서가 모두 들어가야 한다
const seed = DESIGN_SEEDS.find((s) => s.id === "phy-pendulum")!;
const withVerification = { ...seed.doc, verification: "길이 1 m에서 주기 2초인지 확인" };
const prompt = buildCanvaPrompt(withVerification, "물리");
for (const needle of [
  "중학교 과학영재원",          // ① 사용자
  "수업과 발표회",              // ① 맥락
  "분야는 물리이고",            // ① 과목이 들어감
  "진자 길이 – 주기",           // ① 주제 제목
  "아래 조건에 딱 맞는",
  "- 목적:",
  "- 슬라이더:",
  "- 그래프: x축=",
  "- 화면에 고정값으로 명시:",
  "- 예상 패턴:",
  "- 화면에서 확인할 수 있어야 하는 것:", // ② 검증 기준이 실린다
  "성공 조건:",                 // ③
  "기능은 위 1개만",            // ④
  "로그인·저장·장식 애니메이션은 넣지 마",
]) {
  eq(prompt.includes(needle), true, `캔바 프롬프트에 "${needle}" 포함`);
}
eq(prompt.includes(seed.doc.independentVar), true, "조작변인이 프롬프트에 들어감");
eq(prompt.includes(seed.doc.dependentVar), true, "종속변인이 프롬프트에 들어감");
// 제약은 반드시 맨 끝 — 앞에 두면 조건 목록에 묻힌다
eq(prompt.trimEnd().endsWith("한국어 UI로 만들어 줘."), true, "제약 문장이 맨 마지막");
// 검증 기준이 비어 있으면 그 줄은 아예 넣지 않는다
eq(
  buildCanvaPrompt(seed.doc, "물리").includes("화면에서 확인할 수 있어야 하는 것"),
  false,
  "검증 기준이 비면 해당 줄 없음"
);
// 과목 미정이면 분야 문구를 넣지 않는다
eq(buildCanvaPrompt(withVerification, "미정").includes("분야는"), false, "과목 미정이면 분야 문구 없음");

// 설명용은 정확성 근거 줄이 들어간다
const expl = buildCanvaPrompt(
  { ...seed.doc, usage: "explanation", concept: "진자 운동", accuracyBasis: "교과서 대조" },
  "물리"
);
eq(expl.includes("과학적 정확성 근거"), true, "설명용 프롬프트에 정확성 근거 포함");
eq(expl.includes("진자 운동"), true, "설명용 프롬프트가 concept 을 목적으로 씀");

// 7. seed 데이터: verification 만 비어 있어야 한다
for (const s of DESIGN_SEEDS) {
  eq(s.doc.verification, "", `${s.id}: 검증 기준은 빈 값`);
  const filled = [
    s.doc.question,
    s.doc.hypothesis,
    s.doc.independentVar,
    s.doc.dependentVar,
    s.doc.controlledVars,
    s.doc.limitations,
  ].every((v) => v.trim().length > 0);
  eq(filled, true, `${s.id}: 나머지 6칸은 채워져 있음`);
}
eq(DESIGN_SEEDS.length, 8, "예시 풀 8개 (물리3·화학3·생명1·지구1)");

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILED`);
process.exitCode = fails === 0 ? 0 : 1;
