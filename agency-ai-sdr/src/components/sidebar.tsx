"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, BadgeDollarSign, Bot, Building, CalendarClock, FileChartColumn, Gauge, LayoutDashboard,
  Megaphone, Menu, MessagesSquare, Settings, Target, X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/empresas", label: "Empresas", icon: Building },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/conversas", label: "Conversas", icon: MessagesSquare },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/reunioes", label: "Reuniões", icon: CalendarClock },
  { href: "/vendas", label: "Vendas", icon: BadgeDollarSign },
  { href: "/relatorios", label: "Relatórios", icon: FileChartColumn },
  { href: "/custos", label: "Custos e limites", icon: Gauge },
  { href: "/monitoramento", label: "Monitoramento", icon: Activity },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
            isActive(href) ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold">Agency AI SDR</span>
        <button aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen((o) => !o)} className="rounded-md p-1.5 hover:bg-surface-2">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && <div className="border-b border-line bg-surface lg:hidden">{nav}</div>}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-4">
          <div className="text-sm font-semibold">Agency AI SDR</div>
          <div className="truncate text-xs text-muted">{userLabel}</div>
        </div>
        {nav}
      </aside>
    </>
  );
}
