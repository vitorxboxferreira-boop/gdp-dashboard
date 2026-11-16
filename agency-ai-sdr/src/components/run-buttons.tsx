"use client";

import { runAnalysisNow, runManualSearch } from "@/actions/automation";
import { ActionForm } from "./action-form";

export function RunSearchButton() {
  return <ActionForm action={runManualSearch} submitLabel="Pesquisar empresas agora" pendingLabel="Pesquisando e analisando…" />;
}

export function RunAnalysisButton() {
  return <ActionForm action={runAnalysisNow} submitLabel="Reanalisar pontuações" pendingLabel="Analisando…" variant="secondary" />;
}
