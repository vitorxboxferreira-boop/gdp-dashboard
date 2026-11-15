import { PageHeader, PhaseNotice } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";

export const metadata = { title: "Reuniões" };

export default async function MeetingsPage() {
  await requirePageRole("viewer");
  return (
    <>
      <PageHeader title="Reuniões" description="Agenda com dias, horários, duração, intervalos e limite de reuniões." />
      <PhaseNotice phase={4} what="Módulo de agenda: disponibilidade configurável, sugestão de horários pelo agente e confirmação somente após verificação de disponibilidade (o banco já impede reuniões confirmadas sobrepostas)." />
    </>
  );
}
