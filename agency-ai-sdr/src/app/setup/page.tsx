import { isSupabaseConfigured } from "@/lib/public-env";

export const metadata = { title: "Configuração inicial" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-sm">
      <h1 className="text-xl font-semibold">Configuração inicial</h1>
      {isSupabaseConfigured ? (
        <p className="mt-3 text-ok">Supabase configurado. <a className="underline" href="/login">Ir para o login</a>.</p>
      ) : (
        <>
          <p className="mt-3 text-muted">
            O painel precisa de um projeto Supabase. Nenhuma funcionalidade é simulada sem ele.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Crie um projeto Supabase (separado para desenvolvimento e produção).</li>
            <li>Aplique as migrations: <code>supabase link</code> e <code>supabase db push</code>.</li>
            <li>
              Copie <code>.env.example</code> para <code>.env.local</code> e preencha{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> e{" "}
              <code>SUPABASE_SECRET_KEY</code>.
            </li>
            <li>Crie o primeiro usuário em Authentication → Users e promova-o com <code>select public.grant_role(&apos;email&apos;, &apos;admin&apos;);</code></li>
            <li>Reinicie o servidor.</li>
          </ol>
          <p className="mt-4 text-muted">Detalhes no README.md.</p>
        </>
      )}
    </main>
  );
}
