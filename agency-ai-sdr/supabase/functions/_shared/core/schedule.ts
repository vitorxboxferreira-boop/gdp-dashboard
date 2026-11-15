// Calendário operacional no fuso America/Sao_Paulo.
// Horários são METAS operacionais: o orquestrador executa cada etapa quando
// a etapa anterior concluiu e o horário-alvo já passou.

export const DEFAULT_TZ = "America/Sao_Paulo";

export interface ZonedParts {
  date: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  weekday: number; // 0 = domingo … 6 = sábado
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function zonedParts(at: Date, tz = DEFAULT_TZ): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(at).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS[p.weekday as string],
  };
}

/** Offset (ms) do fuso em um instante: horário local − UTC. */
function tzOffsetMs(at: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Converte data local (YYYY-MM-DD) + HH:MM no fuso informado para um instante UTC. */
export function zonedTimeToUtc(date: string, time: string, tz = DEFAULT_TZ): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  const second = guess - tzOffsetMs(new Date(first), tz);
  return new Date(second);
}

export interface OperatingDayOptions {
  holidays: Set<string> | string[];
  runOnWeekends: boolean;
  runOnHolidays: boolean;
}

export function isOperatingDay(
  parts: Pick<ZonedParts, "date" | "weekday">,
  opts: OperatingDayOptions,
): { ok: boolean; reason?: string } {
  const holidays = opts.holidays instanceof Set ? opts.holidays : new Set(opts.holidays);
  if (!opts.runOnWeekends && (parts.weekday === 0 || parts.weekday === 6)) {
    return { ok: false, reason: "Fim de semana (campanhas desativadas sem configuração explícita)" };
  }
  if (!opts.runOnHolidays && holidays.has(parts.date)) {
    return { ok: false, reason: "Feriado (campanhas desativadas sem configuração explícita)" };
  }
  return { ok: true };
}

export type PipelineStep =
  | "campaign.start"
  | "scout.search"
  | "analyst.score"
  | "leads.classify"
  | "eligibility.check"
  | "report.prepare"
  | "report.publish";

/** Plano diário (metas operacionais, horário local). */
export const DAILY_PLAN: ReadonlyArray<{ step: PipelineStep; time: string; label: string }> = [
  { step: "campaign.start", time: "08:00", label: "Iniciar campanha" },
  { step: "scout.search", time: "08:05", label: "Pesquisar empresas" },
  { step: "analyst.score", time: "08:20", label: "Analisar resultados" },
  { step: "leads.classify", time: "08:30", label: "Classificar e organizar leads" },
  { step: "eligibility.check", time: "08:40", label: "Verificar elegibilidade de contato" },
  { step: "report.prepare", time: "11:45", label: "Preparar relatório" },
  { step: "report.publish", time: "12:00", label: "Disponibilizar relatório" },
];

/** Etapa que precisa estar concluída antes de cada etapa. */
export const STEP_DEPENDENCY: Partial<Record<PipelineStep, PipelineStep>> = {
  "scout.search": "campaign.start",
  "analyst.score": "scout.search",
  "leads.classify": "analyst.score",
  "eligibility.check": "leads.classify",
  "report.prepare": "eligibility.check",
  "report.publish": "report.prepare",
};

/** Janela em que uma nova campanha automática pode ser iniciada (evita iniciar à noite após falhas). */
export function withinStartWindow(parts: Pick<ZonedParts, "hour" | "minute">, start = "08:00", end = "11:30"): boolean {
  const now = parts.hour * 60 + parts.minute;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return now >= sh * 60 + sm && now <= eh * 60 + em;
}
