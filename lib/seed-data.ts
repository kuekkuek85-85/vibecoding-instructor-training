import type { DesignDoc, Subject } from "./types";

export interface DesignSeed {
  id: string;
  subject: Subject;
  title: string;
  doc: DesignDoc;
}

/**
 * 설계서 예시 풀. 7칸 중 verification(검증 기준)만 빈 값 — 수강생이 직접 작성한다.
 * 물리 3 · 화학 3 + 생명/지구 백업 2.
 */
export const DESIGN_SEEDS: DesignSeed[] = [
  {
    id: "phy-pendulum",
    subject: "물리",
    title: "진자 길이 – 주기",
    doc: {
      usage: "verification",
      question: "진자의 길이가 길어지면 주기는 어떻게 변할까?",
      hypothesis: "길이가 길어질수록 주기가 길어지되, 제곱근에 비례해 완만하게 증가한다.",
      independentVar: "진자의 길이 (0.1 m ~ 2.0 m)",
      dependentVar: "1회 왕복에 걸리는 시간(주기, 초)",
      controlledVars: "추의 질량 100 g, 진폭 10°, 중력가속도 9.8 m/s², 공기저항 없음",
      verification: "",
      limitations: "공기저항과 실의 질량을 무시했고, 진폭이 큰 경우의 오차를 반영하지 않았다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "phy-incline",
    subject: "물리",
    title: "경사면 각도 – 가속도",
    doc: {
      usage: "verification",
      question: "경사면의 각도가 커지면 물체의 가속도는 어떻게 변할까?",
      hypothesis: "각도가 커질수록 가속도가 커지며, sin 값에 비례해 증가한다.",
      independentVar: "경사면의 각도 (0° ~ 60°)",
      dependentVar: "물체의 가속도 (m/s²)",
      controlledVars: "물체 질량 1 kg, 마찰계수 0, 경사면 길이 2 m, 중력가속도 9.8 m/s²",
      verification: "",
      limitations: "마찰과 공기저항을 무시했고, 물체를 점으로 가정해 회전을 고려하지 않았다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "phy-spring",
    subject: "물리",
    title: "용수철 상수 – 진동수",
    doc: {
      usage: "verification",
      question: "용수철이 뻣뻣할수록 진동은 얼마나 빨라질까?",
      hypothesis: "용수철 상수가 클수록 진동수가 커지며, 제곱근에 비례해 증가한다.",
      independentVar: "용수철 상수 (5 N/m ~ 100 N/m)",
      dependentVar: "진동수 (Hz)",
      controlledVars: "추의 질량 200 g, 초기 늘어난 길이 5 cm, 마찰·공기저항 없음",
      verification: "",
      limitations: "용수철 자체의 질량과 감쇠(에너지 손실)를 무시했다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "chm-dissolve",
    subject: "화학",
    title: "온도 – 용해 속도",
    doc: {
      usage: "verification",
      question: "물의 온도가 높아지면 설탕이 녹는 속도는 얼마나 빨라질까?",
      hypothesis: "온도가 높을수록 용해 속도가 빨라지며, 완전히 녹는 시간이 급격히 짧아진다.",
      independentVar: "물의 온도 (10 ℃ ~ 80 ℃)",
      dependentVar: "설탕이 완전히 녹는 데 걸리는 시간 (초)",
      controlledVars: "설탕 5 g(각설탕 형태), 물 100 mL, 젓지 않음, 대기압 1 atm",
      verification: "",
      limitations: "입자 크기가 균일하다고 가정했고, 물의 증발과 대류를 무시했다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "chm-conc",
    subject: "화학",
    title: "농도 – 반응 속도",
    doc: {
      usage: "verification",
      question: "묽은 염산의 농도가 진해지면 반응은 얼마나 빨라질까?",
      hypothesis: "농도가 높을수록 단위 시간당 기체 발생량이 많아져 반응 속도가 비례해 커진다.",
      independentVar: "염산의 농도 (0.1 M ~ 2.0 M)",
      dependentVar: "1분간 발생한 기체의 부피 (mL)",
      controlledVars: "마그네슘 리본 0.1 g, 온도 25 ℃, 용액 부피 50 mL, 젓는 속도 일정",
      verification: "",
      limitations: "반응 중 농도가 줄어드는 효과와 온도 상승을 무시했다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "chm-catalyst",
    subject: "화학",
    title: "촉매 유무 – 분해 속도",
    doc: {
      usage: "verification",
      question: "촉매를 넣으면 과산화수소의 분해는 얼마나 빨라질까?",
      hypothesis: "촉매의 양이 늘수록 분해 속도가 빨라지지만, 일정 수준 이상에서는 더 빨라지지 않는다.",
      independentVar: "촉매(이산화망가니즈)의 양 (0 g ~ 1.0 g)",
      dependentVar: "1분간 발생한 산소의 부피 (mL)",
      controlledVars: "과산화수소 3 % 용액 50 mL, 온도 25 ℃, 용기 모양 동일",
      verification: "",
      limitations: "촉매 표면적 차이와 반응열에 의한 온도 상승을 무시했다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "bio-population",
    subject: "생명",
    title: "먹이량 – 개체 수 (개체군 성장)",
    doc: {
      usage: "verification",
      question: "먹이의 양이 늘어나면 개체군은 어디까지 늘어날까?",
      hypothesis: "먹이가 많을수록 최대 개체 수가 커지지만, 결국 S자 곡선을 그리며 일정 값에 수렴한다.",
      independentVar: "하루에 공급되는 먹이의 양 (10 g ~ 200 g)",
      dependentVar: "30일 후 개체 수 (마리)",
      controlledVars: "초기 개체 수 10마리, 서식 공간 1 m², 온도 25 ℃, 포식자 없음",
      verification: "",
      limitations: "질병·이주·유전적 차이를 무시했고, 먹이의 질은 동일하다고 가정했다.",
      concept: "",
      accuracyBasis: "",
    },
  },
  {
    id: "ear-insulation",
    subject: "지구",
    title: "단열재 두께 – 내부 기온 변화",
    doc: {
      usage: "verification",
      question: "단열재를 두껍게 하면 내부 온도는 얼마나 천천히 떨어질까?",
      hypothesis: "단열재가 두꺼울수록 온도 하강이 느려지며, 일정 두께를 넘으면 개선 폭이 작아진다.",
      independentVar: "단열재의 두께 (0 cm ~ 20 cm)",
      dependentVar: "1시간 뒤 내부 온도 (℃)",
      controlledVars: "외부 온도 0 ℃, 초기 내부 온도 25 ℃, 상자 부피 1 m³, 단열재 종류 동일",
      verification: "",
      limitations: "틈새로 빠져나가는 공기와 복사에 의한 열 손실을 무시했다.",
      concept: "",
      accuracyBasis: "",
    },
  },
];

/** 예시 풀에 없는 소재를 직접 쓰겠다는 표시. seedId 에 이 값이 들어간다. */
export const CUSTOM_ID = "custom";

export function findSeed(id: string | null): DesignSeed | undefined {
  if (!id) return undefined;
  return DESIGN_SEEDS.find((s) => s.id === id);
}

/** 세션 생성 화면의 과목 드롭다운. 담당 과목을 모르면 "미정"으로 두면 된다. */
export const SUBJECT_OPTIONS: Subject[] = ["미정", "물리", "화학", "생명", "지구"];

/**
 * 세션 생성 화면에 미리 채울 이름.
 * 실명이 저장소에 남지 않도록 환경변수(NEXT_PUBLIC_DEFAULT_NAMES)로만 받는다.
 * 값이 없으면 빈 칸으로 두고 강사가 직접 입력한다.
 */
export function defaultNames(): string[] {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_NAMES ?? "";
  const names = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from({ length: 4 }, (_, i) => names[i] ?? "");
}
