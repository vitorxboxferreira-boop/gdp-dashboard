import { PageHeader, PhaseNotice } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";

export const metadata = { title: "Vendas" };

export default async function SalesPage() {
  await requirePageRole("viewer");
  return (
    <>
      <PageHeader title="Vendas" description="Oportunidades com intenção de compra aguardando aprovação humana." />
      <PhaseNotice phase={4} what="Fluxo de aprovação de vendas: o agente registra a oportunidade e somente um administrador aprova; pagamento só é marcado como confirmado com validação humana (garantido por restrições no banco)." />
    </>
  );
}
