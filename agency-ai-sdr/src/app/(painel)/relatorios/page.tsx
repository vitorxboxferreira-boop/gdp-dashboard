import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(30);
  return (
    <>
      <PageHeader title="Relatórios diários" description="Preparados às 11:45 e disponibilizados às 12:00 pela campanha automática (metas operacionais)." />
      {!data?.length ? (
        <EmptyState title="Nenhum relatório ainda">Os relatórios são gerados pela campanha automática (Fase 5: ativação das rotinas).</EmptyState>
      ) : (
        <div className="space-y-4">
          {data.map((r) => (
            <Card key={r.id} title={`Relatório de ${fmtDate(r.report_date)}`} actions={<Badge tone={r.status === "disponivel" ? "ok" : "info"}>{r.status}</Badge>}>
              <pre className="whitespace-pre-wrap font-sans text-sm">{r.summary ?? "—"}</pre>
              <p className="mt-2 text-xs text-muted">Gerado {fmtDateTime(r.generated_at)} · publicado {fmtDateTime(r.published_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
