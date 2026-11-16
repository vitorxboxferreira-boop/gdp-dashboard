"use client";

import { useActionState } from "react";
import { signIn } from "@/actions/auth";
import { SubmitButton } from "@/components/action-form";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1">
        <span>E-mail</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="flex flex-col gap-1">
        <span>Senha</span>
        <input name="password" type="password" autoComplete="current-password" required minLength={8} />
      </label>
      <SubmitButton label="Entrar" pendingLabel="Entrando…" />
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
    </form>
  );
}
