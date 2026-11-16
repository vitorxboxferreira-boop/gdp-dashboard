"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/actions/types";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className = "",
  submitLabel,
  pendingLabel = "Processando…",
  variant = "primary",
}: {
  action: Action;
  children?: ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} />
        {state && (
          <p role="status" className={`whitespace-pre-wrap break-all text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function SubmitButton({ label, pendingLabel, variant = "primary" }: { label: string; pendingLabel: string; variant?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  const cls = {
    primary: "bg-accent text-accent-fg hover:opacity-90",
    secondary: "border border-line bg-surface hover:bg-surface-2",
    danger: "bg-danger text-white hover:opacity-90",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 ${cls}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
