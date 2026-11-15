import { Card, PageHeader } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { NewCompanyForm } from "./form";

export const metadata = { title: "Nova empresa" };

export default async function NewCompanyPage() {
  await requirePageRole("operator");
  return (
    <>
      <PageHeader title="Adicionar empresa" description="Cadastro manual. A pontuação é calculada na próxima análise (ou clique em “Reanalisar”)." />
      <Card><NewCompanyForm /></Card>
    </>
  );
}
