import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold">Agency AI SDR</h1>
        <p className="mb-5 mt-1 text-sm text-muted">Acesso restrito à equipe. Contas são criadas pelo administrador.</p>
        <LoginForm next={next ?? "/"} />
        <p className="mt-5 text-xs text-muted">
          <Link href="/privacidade" className="underline">Política de privacidade</Link>
        </p>
      </div>
    </main>
  );
}
