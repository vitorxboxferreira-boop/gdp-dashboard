"use client";

import { useActionState, useRef } from "react";
import { simulateAgent, type SimulationResult } from "@/actions/ai";
import { SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui";

export function AgentSimulator() {
  const [state, action] = useActionState<SimulationResult | null, FormData>(simulateAgent, null);
  const formRef = useRef<HTMLFormElement>(null);
  const history = state?.history ?? [];

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex max-h-96 flex-col gap-2 overflow-y-auto" aria-label="Conversa simulada">
        {history.length === 0 && <li className="text-sm text-muted">Escreva como se fosse um cliente. Nada é enviado pelo WhatsApp; o custo da IA é registrado.</li>}
        {history.map((t, i) => (
          <li key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${t.role === "user" ? "self-start bg-surface-2" : "self-end bg-info-bg"}`}>
            {t.content}
          </li>
        ))}
      </ol>
      {state?.intent && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge>intenção: {state.intent}</Badge>
          <Badge>etapa: {state.nextStage}</Badge>
          {state.handoff && <Badge tone="warn">passaria para humano</Badge>}
          {state.violations?.map((v) => <Badge key={v} tone="danger">{v}</Badge>)}
          {state.costUsd != null && <span className="text-muted">custo estimado US$ {state.costUsd.toFixed(4)}</span>}
        </div>
      )}
      {state?.blockedReply && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">Texto bloqueado: {state.blockedReply}</p>}
      <form ref={formRef} action={action} className="flex flex-col gap-2" onSubmit={() => setTimeout(() => formRef.current?.reset(), 0)}>
        <textarea name="message" rows={2} maxLength={2000} placeholder="Ex.: Oi, vi vocês no Google. Quanto custa um site?" aria-label="Mensagem do cliente" />
        <div className="flex flex-wrap items-center gap-2">
          <select name="role" defaultValue="sdr" className="w-auto" aria-label="Papel">
            <option value="sdr">Agente SDR</option>
            <option value="closer">Agente Closer</option>
          </select>
          <SubmitButton label="Enviar (simulação)" pendingLabel="Pensando…" />
          <button name="reset" value="1" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2">Reiniciar</button>
          {state && !state.ok && <span className="text-sm text-danger">{state.message}</span>}
        </div>
      </form>
    </div>
  );
}
