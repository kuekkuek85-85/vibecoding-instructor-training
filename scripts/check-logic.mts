import {
  designReviewComplete,
  findPartner,
  reviewerRoleFor,
  phaseToStage,
  PHASES,
  type Participant,
} from "../lib/types.ts";

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

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILED`);
process.exitCode = fails === 0 ? 0 : 1;
