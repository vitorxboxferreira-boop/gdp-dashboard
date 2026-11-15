"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendHumanMessage } from "@/actions/conversations";
import { SubmitButton } from "@/components/action-form";

export function Composer({ conversationId, disabledReason }: { conversationId: string; disabledReason: string | null }) {
  const [state, action] = useActionState(sendHumanMessage, null);
  // Chave de idempotência por mensagem: um duplo clique não envia duas vezes.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setKey(crypto.randomUUID());
    }
  }, [state]);

  if (disabledReason) {
    return <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Envio indisponível: {disabledReason}</p>;
  }
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input type="hidden" name="idempotency_key" value={key} />
      <textarea name="body" rows={3} maxLength={4096} required placeholder="Escreva como atendente humano…" aria-label="Mensagem" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SubmitButton label="Enviar pelo WhatsApp" pendingLabel="Enviando…" />
        {state && <p role="status" className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
