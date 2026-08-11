"use client";

import type { ReactNode } from "react";

/* =========================================================================
   Card — elevation 1: 흰 캔버스 + 1px hairline. 그림자를 쓰지 않는다.
   ========================================================================= */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-hairline bg-canvas p-6 ${className}`}
    >
      {children}
    </section>
  );
}

/* =========================================================================
   Eyebrow — figmaMono 대문자 분류 라벨. 본문에는 절대 쓰지 않는다.
   ========================================================================= */

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`t-caption opacity-60 ${className}`}>{children}</p>;
}

export function SectionTitle({
  children,
  hint,
  eyebrow,
}: {
  children: ReactNode;
  hint?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
      <h2 className="t-headline">{children}</h2>
      {hint ? <p className="t-body-sm mt-2 max-w-2xl opacity-70">{hint}</p> : null}
    </div>
  );
}

/* =========================================================================
   Color block — 이 시스템의 시그니처 표면.
   전체 콘텐츠 너비 · rounded lg · 내부 패딩 48px. 그림자 금지.
   768px 아래에서는 모서리를 없애고 뷰포트까지 흘려 포스터처럼 보이게 한다.
   ========================================================================= */

export type BlockTone =
  | "lime"
  | "lilac"
  | "cream"
  | "mint"
  | "pink"
  | "coral"
  | "navy";

const BLOCK_BG: Record<BlockTone, string> = {
  lime: "bg-lime",
  lilac: "bg-lilac",
  cream: "bg-cream",
  mint: "bg-mint",
  pink: "bg-pink",
  coral: "bg-coral",
  navy: "bg-navy text-inverse-ink on-inverse",
};

export function ColorBlock({
  tone,
  children,
  className = "",
}: {
  tone: BlockTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`on-block -mx-6 px-6 py-10 sm:mx-0 sm:rounded-lg sm:px-12 sm:py-12 ${BLOCK_BG[tone]} ${className}`}
    >
      {children}
    </section>
  );
}

/* =========================================================================
   Buttons — 알약이 유일한 버튼 모양. 아이콘 버튼만 원형.
   selected = primary surface (pricing-tab 패턴).
   ========================================================================= */

type ButtonTone = "primary" | "secondary" | "ghost" | "ok" | "promo";

const TONE: Record<ButtonTone, string> = {
  primary: "bg-primary text-on-primary hover:opacity-85",
  ok: "bg-primary text-on-primary hover:opacity-85",
  secondary: "bg-canvas text-ink border border-hairline hover:border-ink",
  ghost: "bg-canvas text-ink border border-hairline hover:border-ink",
  // 주의: 흰 글씨 대비가 3.34:1 이라 본문 크기에서는 WCAG AA 에 못 미친다.
  // 디자인 문서대로 페이지당 한 번, 큰 글씨 프로모션 CTA 에만 쓸 것. 현재 미사용.
  promo: "bg-magenta text-on-primary hover:opacity-90",
};

export function Button({
  children,
  onClick,
  disabled,
  tone = "primary",
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`t-body-sm inline-flex min-h-11 items-center justify-center rounded-pill px-5 py-2.5 font-medium transition ${TONE[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/* =========================================================================
   Badge — 상태 칩. figmaMono 캡션 + 팔레트 내 색만 사용.
   ========================================================================= */

const BADGE: Record<string, string> = {
  muted: "bg-surface-soft text-ink border-hairline",
  ok: "bg-primary text-on-primary border-transparent",
  warn: "bg-cream text-ink border-transparent",
  accent: "bg-lilac text-ink border-transparent",
  danger: "bg-coral text-ink border-transparent",
};

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "accent" | "danger";
}) {
  return (
    <span
      className={`t-caption inline-flex items-center rounded-pill border px-3 py-1 ${BADGE[tone]}`}
    >
      {children}
    </span>
  );
}

/* =========================================================================
   Field — 라벨은 mono 캡션, 힌트는 body-sm.
   ========================================================================= */

export function Field({
  label,
  hint,
  highlight,
  children,
}: {
  label: string;
  hint?: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="t-caption mb-2 flex items-center gap-2">
        {label}
        {highlight ? (
          <span className="rounded-pill bg-primary px-2 py-0.5 text-on-primary">
            직접 작성
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="t-body-sm mt-1.5 block opacity-60">{hint}</span> : null}
    </label>
  );
}

/* =========================================================================
   Notice — 색상 블록 어휘를 작은 패널로 재사용.
   ========================================================================= */

const NOTICE: Record<string, string> = {
  muted: "bg-surface-soft",
  warn: "bg-cream",
  danger: "bg-coral",
  ok: "bg-mint",
};

export function Notice({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "warn" | "danger" | "ok";
}) {
  return (
    <div className={`t-body-sm rounded-md px-5 py-4 ${NOTICE[tone]}`}>{children}</div>
  );
}
