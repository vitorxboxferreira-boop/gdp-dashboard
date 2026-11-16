import { importCompanies } from "@/actions/companies";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Notice, PageHeader } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";

export const metadata = { title: "Importar empresas" };
export const maxDuration = 60;

const EXAMPLE = `nome;categoria;telefone;endereco;site;fonte
Barbearia Exemplo;Barbearia;(55) 99999-0000;Rua Exemplo, 100 - Centro;;https://link-da-fonte
Padaria Modelo;Padaria;(55) 3242-0000;Av. Modelo, 200;instagram.com/padariamodelo;https://link-da-fonte`;

export default async function ImportCompaniesPage() {
  await requirePageRole("operator");
  return (
    <>
      <PageHeader title="Importar lista de empresas" description="Cole uma lista pesquisada por você (ou preparada com ajuda do Claude). As empresas entram como cadastro manual e já são pontuadas." />
      <div className="mb-4">
        <Notice tone="warn" title="Antes de importar">
          Use apenas dados públicos de empresas, com a fonte indicada. Importar um telefone não autoriza contato pelo WhatsApp:
          a empresa fica como “não contatável” até existir autorização registrada ou até ela mesma chamar no WhatsApp.
        </Notice>
      </div>
      <Card>
        <ActionForm action={importCompanies} submitLabel="Importar" pendingLabel="Importando e pontuando…">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cidade padrão"><input name="city" defaultValue="Sant'Ana do Livramento" /></Field>
            <Field label="UF padrão"><input name="state" defaultValue="RS" maxLength={2} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Lista (primeira linha = cabeçalho; separador ; , ou tabulação)" hint="Colunas aceitas: nome (obrigatória), categoria, telefone, endereco, cidade, uf, site, fonte, observacoes. Até 300 empresas por vez.">
              <textarea name="list" rows={14} required className="font-mono text-xs" placeholder={EXAMPLE} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
