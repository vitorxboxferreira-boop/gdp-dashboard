// Importação de empresas a partir de uma lista colada (CSV com ; , ou tabulação).
// Código puro e testável. Nada é inventado: campos ausentes ficam vazios.
import { normalizeBrPhone } from "@core/phone.ts";
import { classifyWebsite, type WebsiteStatus } from "@core/website.ts";

export interface ImportRow {
  line: number;
  name: string;
  category_label: string | null;
  primary_category: string | null;
  phone_national: string | null;
  phone_e164: string | null;
  formatted_address: string | null;
  city: string;
  state: string;
  website_uri: string | null;
  website_status: WebsiteStatus;
  notes: string | null;
}

export interface ImportParseResult {
  rows: ImportRow[];
  errors: Array<{ line: number; reason: string }>;
}

const HEADER_ALIASES: Record<string, string> = {
  nome: "name", empresa: "name", name: "name",
  categoria: "category", ramo: "category", category: "category",
  telefone: "phone", fone: "phone", whatsapp: "phone", phone: "phone",
  endereco: "address", "endereço": "address", address: "address",
  cidade: "city", city: "city",
  uf: "state", estado: "state", state: "state",
  site: "website", website: "website",
  fonte: "source", source: "source", link: "source",
  observacoes: "notes", "observações": "notes", obs: "notes", notes: "notes",
};

/** Palavras-chave → tipo usado na pontuação (mesmos tipos do Google Places). */
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/barbe/i, "barber_shop"], [/sal[aã]o|cabeleire|est[eé]tica|beleza/i, "beauty_salon"], [/manicure|unha/i, "nail_salon"],
  [/dent|odont/i, "dentist"], [/fisio/i, "physiotherapist"], [/veterin/i, "veterinary_care"], [/pet/i, "pet_store"],
  [/academia|crossfit|pilates/i, "gym"], [/oficina|mec[aâ]nic/i, "car_repair"], [/lava.?(jato|car)|lavagem/i, "car_wash"],
  [/auto ?pe[cç]as/i, "auto_parts_store"], [/padaria|confeitaria/i, "bakery"], [/caf[eé]/i, "cafe"],
  [/restaurante|pizzaria|churrascaria|lanchonete|hamburg/i, "restaurant"], [/roupa|moda|boutique|confec/i, "clothing_store"],
  [/flor/i, "florist"], [/m[oó]veis/i, "furniture_store"], [/ferragem|material de constru/i, "hardware_store"],
  [/imobili/i, "real_estate_agency"], [/advoca|advogad/i, "lawyer"], [/contab/i, "accounting"], [/segur(o|adora)/i, "insurance_agency"],
  [/cl[ií]nica|m[eé]dic|consult[oó]rio/i, "doctor"],
];

export function guessCategory(label: string | null): string | null {
  if (!label) return null;
  return CATEGORY_KEYWORDS.find(([re]) => re.test(label))?.[1] ?? null;
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === sep && !quoted) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCompanyList(text: string, defaults: { city: string; state: string }, maxRows = 300): ImportParseResult {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const result: ImportParseResult = { rows: [], errors: [] };
  if (!lines.length) return result;
  const sep = lines[0].includes("\t") ? "\t" : lines[0].split(";").length >= lines[0].split(",").length ? ";" : ",";
  const header = splitLine(lines[0], sep).map((h) => HEADER_ALIASES[h.toLowerCase()] ?? "");
  if (!header.includes("name")) {
    result.errors.push({ line: 1, reason: 'A primeira linha deve ser o cabeçalho e conter a coluna "nome"' });
    return result;
  }
  const body = lines.slice(1);
  if (body.length > maxRows) result.errors.push({ line: maxRows + 2, reason: `Máximo de ${maxRows} empresas por importação; o restante foi ignorado` });

  body.slice(0, maxRows).forEach((raw, idx) => {
    const line = idx + 2;
    const cells = splitLine(raw, sep);
    const get = (k: string) => { const i = header.indexOf(k); return i >= 0 ? (cells[i] ?? "").trim() : ""; };
    const name = get("name");
    if (name.length < 2 || name.length > 200) return void result.errors.push({ line, reason: "Nome ausente ou inválido" });
    const phoneRaw = get("phone");
    const phone = phoneRaw ? normalizeBrPhone(phoneRaw) : null;
    let site: string | null = get("website") || null;
    if (site && !/^https?:\/\//i.test(site)) site = `https://${site}`;
    if (site) { try { new URL(site); } catch { site = null; } }
    const source = get("source");
    const noteParts = [
      get("notes"),
      source && /^https?:\/\//i.test(source) ? `Fonte: ${source}` : source ? `Fonte: ${source}` : "",
      phoneRaw && !phone ? `Telefone informado não validado: ${phoneRaw}` : "",
      "Importado por lista — conferir os dados antes de qualquer contato.",
    ].filter(Boolean);
    const state = (get("state") || defaults.state).toUpperCase().slice(0, 2);
    const label = get("category") || null;
    result.rows.push({
      line, name,
      category_label: label,
      primary_category: guessCategory(label),
      phone_national: phoneRaw || null,
      phone_e164: phone,
      formatted_address: get("address") || null,
      city: get("city") || defaults.city,
      state,
      website_uri: site,
      website_status: classifyWebsite(site),
      notes: noteParts.join("\n").slice(0, 2000),
    });
  });
  return result;
}
