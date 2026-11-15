import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { EmergencyStop } from "@/components/emergency";
import { Sidebar } from "@/components/sidebar";
import { Badge } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { environmentWarnings, serverEnv } from "@/lib/env";
import { fmtDateTime, ROLE_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("agent_settings")
    .select("automation_paused, paused_reason, paused_at, autopilot_enabled")
    .eq("id", 1)
    .maybeSingle();
  const warnings = environmentWarnings();
  const envTone = serverEnv.appEnv === "production" ? "danger" : serverEnv.appEnv === "staging" ? "warn" : "info";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar userLabel={`${profile.full_name ?? profile.email} · ${ROLE_LABELS[profile.role]}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={envTone}>Ambiente: {serverEnv.appEnv}</Badge>
            {settings?.automation_paused ? (
              <Badge tone="danger">Automações pausadas</Badge>
            ) : settings?.autopilot_enabled ? (
              <Badge tone="ok">Piloto automático ligado</Badge>
            ) : (
              <Badge>Piloto automático desligado</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasRole(profile, "operator") && !settings?.automation_paused && <EmergencyStop />}
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2" aria-label="Sair">
                <LogOut size={15} aria-hidden /> <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </header>
        {settings?.automation_paused && (
          <div className="border-b border-line bg-danger-bg px-4 py-2 text-sm text-danger sm:px-6">
            Automações interrompidas em {fmtDateTime(settings.paused_at)} — {settings.paused_reason}. Retome em Configurações (administrador).
          </div>
        )}
        {warnings.map((w) => (
          <div key={w} className="border-b border-line bg-warn-bg px-4 py-2 text-sm text-warn sm:px-6">{w}</div>
        ))}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
