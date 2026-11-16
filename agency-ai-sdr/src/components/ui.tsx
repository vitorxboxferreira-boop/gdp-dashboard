import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "ok" | "warn" }) {
  const toneCls = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

type Tone = "neutral" | "ok" | "warn" | "danger" | "info";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function Notice({ children, tone = "info", title }: { children: ReactNode; tone?: Tone; title?: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${TONES[tone]}`}>
      {title && <div className="mb-0.5 font-semibold">{title}</div>}
      <div className="text-fg/90">{children}</div>
    </div>
  );
}

export function PhaseNotice({ phase, what }: { phase: number; what: string }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-2 py-6 text-sm">
        <Badge tone="info">Fase {phase}</Badge>
        <p className="max-w-2xl text-muted">{what}</p>
        <p className="max-w-2xl text-muted">
          A estrutura de dados (tabelas, índices, RLS e idempotência) já existe. A funcionalidade será
          implementada, testada e validada nessa fase — nada aqui é simulado.
        </p>
      </div>
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <th className={`border-b border-line px-3 py-2 text-xs font-medium text-muted ${className}`}>{children}</th>
);
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`border-b border-line px-3 py-2.5 align-top ${className}`}>{children}</td>
);

export function ButtonLink({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const cls =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : "border border-line bg-surface hover:bg-surface-2";
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${cls}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
