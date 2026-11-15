"use client";

import { useActionState, useState } from "react";
import { OctagonX } from "lucide-react";
import { pauseAutomation } from "@/actions/automation";
import { SubmitButton } from "./action-form";

export function EmergencyStop() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(pauseAutomation, null);
  if (state?.ok) return <span className="text-sm text-ok">{state.message}</span>;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        <OctagonX size={16} aria-hidden /> Parada de emergência
      </button>
      {open && (
        <form action={action} className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-line bg-surface p-4 shadow-lg">
          <p className="mb-2 text-sm">Interrompe todas as automações e cancela tarefas pendentes. Só um administrador pode retomar.</p>
          <label className="mb-3 flex flex-col gap-1">
            <span>Motivo (opcional)</span>
            <input name="reason" maxLength={300} />
          </label>
          <SubmitButton label="Confirmar parada" pendingLabel="Parando…" variant="danger" />
          {state && !state.ok && <p className="mt-2 text-sm text-danger">{state.message}</p>}
        </form>
      )}
    </div>
  );
}
