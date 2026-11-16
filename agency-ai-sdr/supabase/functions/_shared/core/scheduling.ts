// Agenda: horários livres a partir da disponibilidade configurada.
// A confirmação é SEMPRE humana (garantido no banco); aqui só calculamos opções.

import { zonedParts, zonedTimeToUtc } from "./schedule.ts";

export interface MeetingConfig {
  days: number[];            // 0 = domingo … 6 = sábado
  start: string;             // "09:00"
  end: string;               // "17:00"
  durationMin: number;
  bufferMin: number;
  maxPerDay: number;
  minNoticeHours: number;
  horizonDays: number;
  timezone: string;
}

export interface BusyRange {
  starts_at: string;
  ends_at: string;
  status: string;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lista horários livres (instantes UTC) respeitando dias, expediente, duração, intervalo, antecedência, feriados e limite diário. */
export function computeAvailableSlots(
  cfg: MeetingConfig,
  busy: BusyRange[],
  holidays: string[],
  now: Date,
  limit = 6,
): Date[] {
  const out: Date[] = [];
  const holidaySet = new Set(holidays);
  const earliest = now.getTime() + cfg.minNoticeHours * 3600_000;
  const today = zonedParts(now, cfg.timezone).date;
  const step = cfg.durationMin + cfg.bufferMin;
  const ranges = busy.map((b) => ({ s: new Date(b.starts_at).getTime(), e: new Date(b.ends_at).getTime() }));

  for (let d = 0; d <= cfg.horizonDays && out.length < limit; d++) {
    const date = addDays(today, d);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!cfg.days.includes(weekday) || holidaySet.has(date)) continue;

    const dayStart = zonedTimeToUtc(date, "00:00", cfg.timezone).getTime();
    const dayEnd = dayStart + 24 * 3600_000;
    const confirmedThatDay = busy.filter((b) => b.status === "confirmada" && new Date(b.starts_at).getTime() >= dayStart && new Date(b.starts_at).getTime() < dayEnd).length;
    if (confirmedThatDay >= cfg.maxPerDay) continue;

    for (let m = toMin(cfg.start); m + cfg.durationMin <= toMin(cfg.end) && out.length < limit; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const start = zonedTimeToUtc(date, `${hh}:${mm}`, cfg.timezone).getTime();
      const end = start + cfg.durationMin * 60_000;
      if (start < earliest) continue;
      // Respeita o intervalo também em relação a compromissos existentes.
      const conflict = ranges.some((r) => start < r.e + cfg.bufferMin * 60_000 && end + cfg.bufferMin * 60_000 > r.s);
      if (!conflict) out.push(new Date(start));
    }
  }
  return out;
}

const WEEKDAY_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function formatSlotPtBr(d: Date, tz: string): string {
  const p = zonedParts(d, tz);
  const [, mo, da] = p.date.split("-");
  return `${WEEKDAY_PT[p.weekday]}, ${da}/${mo} às ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function meetingConfigFrom(s: Record<string, unknown>): MeetingConfig {
  return {
    days: (s.meeting_days as number[]) ?? [1, 2, 3, 4, 5],
    start: String(s.meeting_start ?? "09:00"),
    end: String(s.meeting_end ?? "17:00"),
    durationMin: Number(s.meeting_duration_min ?? 30),
    bufferMin: Number(s.meeting_buffer_min ?? 15),
    maxPerDay: Number(s.meeting_max_per_day ?? 4),
    minNoticeHours: Number(s.meeting_min_notice_hours ?? 4),
    horizonDays: Number(s.meeting_horizon_days ?? 10),
    timezone: String(s.timezone ?? "America/Sao_Paulo"),
  };
}
