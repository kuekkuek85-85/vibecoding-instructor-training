/** 강사의 담당 과목. 모르면 "미정" — 화면 표시용 라벨일 뿐 기능에는 관여하지 않는다. */
export type Subject = "미정" | "물리" | "화학" | "생명" | "지구";

/** "미정"은 이름 옆에 굳이 보여 주지 않는다. */
export function subjectLabel(s: Subject): string {
  return s === "미정" ? "" : s;
}

/** "이름 (과목)" 형태 — 과목이 미정이면 이름만 */
export function nameWithSubject(name: string, s: Subject): string {
  return s === "미정" ? name : `${name} (${s})`;
}

export type Usage = "verification" | "explanation";

export type Phase =
  | "waiting"
  | "design"
  | "design_review"
  | "build"
  | "output_review"
  | "present"
  | "wrapup";

export const PHASES: Phase[] = [
  "waiting",
  "design",
  "design_review",
  "build",
  "output_review",
  "present",
  "wrapup",
];

/**
 * 단계마다 색상 블록 하나를 배정한다.
 * 수강생 화면은 한 번에 한 단계만 보여 주므로 "한 뷰포트에 색상 블록 하나"
 * 규칙이 자연스럽게 지켜지고, 단계 전환이 곧 색이 바뀌는 섹션 브레이크가 된다.
 */
export const PHASE_TONE: Record<
  Phase,
  "lime" | "lilac" | "cream" | "mint" | "pink" | "coral" | "navy"
> = {
  waiting: "cream",
  design: "lime",
  design_review: "lilac",
  build: "mint",
  output_review: "coral",
  present: "navy",
  wrapup: "pink",
};

export const PHASE_LABEL: Record<Phase, string> = {
  waiting: "대기",
  design: "설계",
  design_review: "설계 검토",
  build: "제작",
  output_review: "산출물 검토",
  present: "발표",
  wrapup: "정리",
};

/** 단계 번호(1~7)는 PHASES 배열 순서 + 1 */
export function phaseToStage(phase: Phase): number {
  const i = PHASES.indexOf(phase);
  return i < 0 ? 1 : i + 1;
}

export interface DesignDoc {
  usage: Usage;
  /** 소재 제목 — 예시를 고르면 예시 제목이, 직접 쓰면 본인이 적은 제목이 들어간다 */
  topicTitle: string;
  /** 탐구질문 → 화면이 답할 질문 */
  question: string;
  /** 가설 → 예상 그래프 패턴 */
  hypothesis: string;
  /** 조작변인 → 슬라이더 */
  independentVar: string;
  /** 종속변인 → 그래프 y축 */
  dependentVar: string;
  /** 통제변인 → 화면 고정값 */
  controlledVars: string;
  /** 검증 기준 → 실측/문헌 대조 (수강생 직접 작성) */
  verification: string;
  /** 한계 → 무시한 요인 */
  limitations: string;
  /** usage=explanation 전용 */
  concept: string;
  /** usage=explanation 전용 */
  accuracyBasis: string;
}

export const EMPTY_DESIGN_DOC: DesignDoc = {
  usage: "verification",
  topicTitle: "",
  question: "",
  hypothesis: "",
  independentVar: "",
  dependentVar: "",
  controlledVars: "",
  verification: "",
  limitations: "",
  concept: "",
  accuracyBasis: "",
};

export interface AiReview {
  text: string;
  createdAt: number;
}

export interface SelfReviewDesign {
  changedField: string;
  note: string;
}

export interface PeerReviewDesign {
  fromId: string;
  fromName: string;
  comment: string;
}

export type ReviewerRole = "변인" | "검증" | "한계";

export interface PeerQuestion {
  fromId: string;
  fromName: string;
  role: ReviewerRole;
  question: string;
}

export interface Participant {
  id: string;
  name: string;
  subject: Subject;
  order: number;
  stage: number;
  gateApproved: boolean;
  seedId: string | null;
  designDoc: DesignDoc;
  aiReviewDesign: AiReview | null;
  selfReviewDesign: SelfReviewDesign | null;
  peerReviewDesign: PeerReviewDesign | null;
  canvaLink: string;
  outputSummary: string;
  aiReviewOutput: AiReview | null;
  selfReviewOutput: { limitationAdded: string } | null;
  peerQuestions: PeerQuestion[];
  instructorComment: string;
  takeaway: string;
}

export interface SessionDoc {
  currentSlide: number;
  phase: Phase;
  presenterId: string | null;
  slides: string[];
  createdAt: number;
}

/**
 * AI 검토를 요청할 만큼 설계서가 채워졌는지.
 * 빈 설계서로 검토를 부르면 "가설이 비어 있지만…" 하면서 쓸모없는 피드백이 돌아온다.
 */
export function designDocReady(d: DesignDoc): boolean {
  const common = [d.question, d.independentVar, d.dependentVar, d.controlledVars];
  const extra =
    d.usage === "explanation" ? [d.concept] : [d.hypothesis, d.verification];
  return [...common, ...extra].every((v) => v.trim().length > 0);
}

/** 설계 검토 3종(AI·자기·동료)이 모두 끝났는지 — 게이트 승인 버튼 활성화 조건 */
export function designReviewComplete(p: Participant): boolean {
  return Boolean(
    p.aiReviewDesign?.text &&
      p.selfReviewDesign?.changedField &&
      p.peerReviewDesign?.comment
  );
}

/** 4명을 2명씩 짝지음: order 0↔1, 2↔3 */
export function findPartner(
  me: Participant,
  all: Participant[]
): Participant | null {
  const sorted = [...all].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((p) => p.id === me.id);
  if (i < 0) return null;
  const partnerIndex = i % 2 === 0 ? i + 1 : i - 1;
  return sorted[partnerIndex] ?? null;
}

/** 발표자 기준으로 나머지 참가자에게 검토관 역할을 순서대로 배정 */
export function reviewerRoleFor(
  viewerId: string,
  presenterId: string,
  all: Participant[]
): ReviewerRole | null {
  if (viewerId === presenterId) return null;
  const roles: ReviewerRole[] = ["변인", "검증", "한계"];
  const others = [...all]
    .sort((a, b) => a.order - b.order)
    .filter((p) => p.id !== presenterId);
  const i = others.findIndex((p) => p.id === viewerId);
  if (i < 0) return null;
  return roles[i % roles.length];
}
