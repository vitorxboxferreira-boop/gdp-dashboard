import { signOut } from "@/actions/auth";

export const metadata = { title: "Sem acesso" };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 text-sm">
        <h1 className="text-lg font-semibold">Acesso pendente</h1>
        <p className="mt-2 text-muted">
          Sua conta foi autenticada, mas ainda não recebeu um papel (leitura, operador ou administrador).
          Peça ao administrador para liberar seu acesso.
        </p>
        <form action={signOut} className="mt-4">
          <button className="rounded-lg border border-line px-3 py-2 hover:bg-surface-2">Sair</button>
        </form>
      </div>
    </main>
  );
}
