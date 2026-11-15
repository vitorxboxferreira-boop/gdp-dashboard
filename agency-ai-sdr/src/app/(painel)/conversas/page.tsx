import { PageHeader, PhaseNotice } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";

export const metadata = { title: "Conversas" };

export default async function ConversationsPage() {
  await requirePageRole("viewer");
  return (
    <>
      <PageHeader title="Conversas" description="Histórico e visualização em tempo real das conversas do WhatsApp, com opção de assumir manualmente e pausar o agente." />
      <PhaseNotice phase={2} what="Integração com a WhatsApp Business Platform (Cloud API oficial): webhook com validação de assinatura, recebimento idempotente de mensagens, histórico, tempo real e atendimento humano." />
    </>
  );
}
