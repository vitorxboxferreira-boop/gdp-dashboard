export const metadata = { title: "Política de privacidade" };

// Modelo de política de privacidade (LGPD — Lei 13.709/2018).
// Os campos entre colchetes DEVEM ser preenchidos e o texto revisado por assessoria jurídica antes da publicação.
const CONTROLLER = process.env.NEXT_PUBLIC_COMPANY_NAME || "[NOME DA AGÊNCIA]";
const CONTROLLER_ID = process.env.NEXT_PUBLIC_COMPANY_DOCUMENT || "[CNPJ]";
const DPO_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "[E-MAIL DO ENCARREGADO]";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Política de privacidade</h1>
      <p className="mt-2 text-muted">Última atualização: 15/11/2026 · Versão modelo — revisar com assessoria jurídica.</p>

      <h2 className="mt-8 text-base font-semibold">1. Controlador</h2>
      <p className="mt-2">{CONTROLLER}, {CONTROLLER_ID}. Encarregado (DPO): {DPO_EMAIL}.</p>

      <h2 className="mt-6 text-base font-semibold">2. Dados tratados</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Dados públicos de estabelecimentos comerciais obtidos pela Google Places API: nome, categoria, endereço, telefone comercial, site informado, avaliações agregadas.</li>
        <li>Registros de autorização de contato: telefone, origem, data e evidência da autorização.</li>
        <li>Mensagens trocadas pelo WhatsApp Business Platform, somente quando o contato inicia a conversa ou autoriza o recebimento.</li>
        <li>Dados de agendamento de reuniões e propostas comerciais.</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold">3. Finalidades e bases legais</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Identificação de empresas que possam se interessar pelos nossos serviços — legítimo interesse (art. 7º, IX), limitado a dados comerciais públicos.</li>
        <li>Envio de mensagens comerciais pelo WhatsApp — exclusivamente com autorização prévia do titular (art. 7º, I) e conforme as políticas do WhatsApp Business.</li>
        <li>Atendimento, negociação e execução de contrato — procedimentos preliminares e execução de contrato (art. 7º, V).</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold">4. Atendimento automatizado</h2>
      <p className="mt-2">
        Parte do atendimento pode ser feita por um assistente virtual baseado em inteligência artificial, que se identifica como tal quando questionado.
        Você pode solicitar atendimento humano a qualquer momento. Nenhuma contratação, pagamento ou compromisso definitivo é confirmado sem aprovação humana.
      </p>

      <h2 className="mt-6 text-base font-semibold">5. Descadastro</h2>
      <p className="mt-2">
        Para não receber mais mensagens, responda “PARAR” ou “SAIR”, ou escreva para {DPO_EMAIL}. O bloqueio é imediato e o número
        passa a integrar nossa lista de não contato.
      </p>

      <h2 className="mt-6 text-base font-semibold">6. Compartilhamento (operadores)</h2>
      <p className="mt-2">
        Supabase (banco de dados e autenticação), Vercel (hospedagem), Google (Places API), Meta (WhatsApp Business Platform) e Anthropic (modelo de IA),
        cada um sob seus próprios termos e apenas na medida necessária para a prestação do serviço. Não vendemos dados pessoais.
      </p>

      <h2 className="mt-6 text-base font-semibold">7. Retenção</h2>
      <p className="mt-2">
        Mensagens são mantidas pelo prazo configurado pelo administrador (padrão: 365 dias). Conteúdo obtido do Google Places de empresas
        sem relacionamento comercial é removido após o prazo configurado (padrão: 30 dias), mantendo apenas o identificador do local.
        Registros de bloqueio são mantidos enquanto necessários para garantir o não contato.
      </p>

      <h2 className="mt-6 text-base font-semibold">8. Direitos do titular</h2>
      <p className="mt-2">
        Confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação do consentimento
        (art. 18). Solicitações: {DPO_EMAIL}.
      </p>

      <h2 className="mt-6 text-base font-semibold">9. Segurança</h2>
      <p className="mt-2">
        Acesso restrito por autenticação e papéis, políticas de segurança em nível de linha no banco, credenciais mantidas apenas no servidor,
        registro de auditoria de alterações e validação de assinatura de webhooks.
      </p>
    </main>
  );
}
