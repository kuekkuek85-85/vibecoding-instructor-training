"use client";

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

type ButtonTone = "primary" | "ghost" | "ok" | "warn";

const TONE: Record<ButtonTone, string> = {
  primary: "bg-accent-strong text-white hover:brightness-110",
  ghost: "bg-surface-2 text-foreground border border-line hover:brightness-125",
  ok: "bg-ok text-[#08221b] font-bold hover:brightness-110",
  warn: "bg-warn text-[#2b1d00] font-bold hover:brightness-110",
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
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${TONE[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "accent" | "danger";
}) {
  const map = {
    muted: "bg-surface-2 text-muted border-line",
    ok: "bg-ok/15 text-ok border-ok/40",
    warn: "bg-warn/15 text-warn border-warn/40",
    accent: "bg-accent/15 text-accent border-accent/40",
    danger: "bg-danger/15 text-danger border-danger/40",
  } as const;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

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
      <span
        className={`mb-1 block text-sm font-medium ${
          highlight ? "text-warn" : "text-muted"
        }`}
      >
        {label}
        {highlight ? " ★ 직접 작성" : ""}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Notice({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "warn" | "danger" | "ok";
}) {
  const map = {
    muted: "border-line bg-surface-2 text-muted",
    warn: "border-warn/40 bg-warn/10 text-warn",
    danger: "border-danger/40 bg-danger/10 text-danger",
    ok: "border-ok/40 bg-ok/10 text-ok",
  } as const;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${map[tone]}`}>{children}</div>
  );
}
