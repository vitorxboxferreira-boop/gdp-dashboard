"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Assina mudanças (Supabase Realtime, respeitando RLS) e re-renderiza a página no servidor.
 * filter: ex. "conversation_id=eq.<uuid>"
 */
export function RealtimeRefresh({ table, filter, channel }: { table: "messages" | "conversations"; filter?: string; channel: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<"conectando" | "ao vivo" | "offline">("conectando");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const ch = supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 300);
      })
      .subscribe((status: string) => setState(status === "SUBSCRIBED" ? "ao vivo" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "conectando"));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [router, table, filter, channel]);

  const color = state === "ao vivo" ? "bg-ok" : state === "offline" ? "bg-danger" : "bg-warn";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {state}
    </span>
  );
}
