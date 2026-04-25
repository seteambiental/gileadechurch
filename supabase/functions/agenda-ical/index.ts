import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapeia dias da semana (0=Dom..6=Sáb) para regras RRULE
const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const tipoEventoLabels: Record<string, string> = {
  culto: "Culto",
  ceia: "Santa Ceia",
  batismo: "Batismo",
  impacto: "Impacto",
  retiro: "Retiro",
  conferencia: "Conferência",
  casa_refugio: "Casa Refúgio",
  gileade_fest: "Gileade Fest",
  retiro_kids: "Retiro Kids",
  evento: "Evento",
  conexao_lider: "Conexão de Líderes",
  quarta_proposito: "Quarta com Propósito",
  cursos: "Cursos",
  aulas: "Aulas",
  apresentacao_criancas: "Apresentação de Crianças",
  casamento: "Casamento",
  confraternizacao: "Confraternização",
  churrasco: "Churrasco",
  outros: "Outros",
};

function escapeICS(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function formatDateTimeLocal(date: string, time?: string | null): string {
  // Formato: YYYYMMDDTHHMMSS (sem Z = horário local com TZID)
  const [y, m, d] = date.split("-");
  const t = (time || "00:00:00").split(":");
  const hh = (t[0] || "00").padStart(2, "0");
  const mm = (t[1] || "00").padStart(2, "0");
  const ss = (t[2] || "00").padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

function formatDateTimeUtcFromSaoPaulo(date: string, time?: string | null): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = (time || "00:00:00").split(":").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour + 3, minute, second));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${utcDate.getUTCFullYear()}${pad(utcDate.getUTCMonth() + 1)}${pad(utcDate.getUTCDate())}T${pad(utcDate.getUTCHours())}${pad(utcDate.getUTCMinutes())}${pad(utcDate.getUTCSeconds())}Z`;
}

function formatDateOnly(date: string): string {
  return date.replace(/-/g, "");
}

function nowUtcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function normalizeKey(text: string | null | undefined): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dateFromString(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateToString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDaysToDateString(date: string, days: number): string {
  const d = dateFromString(date);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToString(d);
}

function getWeekOfMonthUtc(date: Date): number {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).getUTCDay();
  return Math.ceil((date.getUTCDate() + firstDay) / 7);
}

function isWeeklyRecurring(evento: any): boolean {
  return evento.recorrente === true && typeof evento.dia_semana === "number";
}

// Registros marcados como recorrentes mas SEM dia_semana são inconsistentes:
// não devem aparecer como recorrentes nem como evento único (a data_evento neles
// costuma ser apenas um placeholder que duplicaria o evento real).
function isInvalidRecurring(evento: any): boolean {
  return evento.recorrente === true && (evento.dia_semana === null || evento.dia_semana === undefined);
}

function occursOnDate(evento: any, dateStr: string): boolean {
  const date = dateFromString(dateStr);
  if (isWeeklyRecurring(evento)) {
    if (evento.dia_semana !== date.getUTCDay()) return false;
    if (evento.data_evento && dateStr < evento.data_evento) return false;
    if (evento.data_fim && dateStr > evento.data_fim) return false;
    if (evento.semana_mes !== null && evento.semana_mes !== undefined && evento.semana_mes > 0) {
      return evento.semana_mes === getWeekOfMonthUtc(date);
    }
    return true;
  }

  if (!evento.data_evento) return false;
  if (evento.data_fim) return dateStr >= evento.data_evento && dateStr <= evento.data_fim;
  return evento.data_evento === dateStr;
}

function pickNewest(events: any[]): any {
  return [...events].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function dedupeSameDayEvents(events: any[], dateStr: string): any[] {
  const groups = new Map<string, any[]>();

  for (const evento of events) {
    const titleKey = normalizeKey(evento.titulo || tipoEventoLabels[evento.tipo_evento] || "evento");
    const key = `${evento.tipo_evento || ""}|${titleKey}|${dateStr}`;
    groups.set(key, [...(groups.get(key) || []), evento]);
  }

  const result: any[] = [];
  for (const group of groups.values()) {
    const hasTimedEvent = group.some((evento) => Boolean(evento.hora_inicio));
    const candidates = hasTimedEvent ? group.filter((evento) => Boolean(evento.hora_inicio)) : group;
    const byStartTime = new Map<string, any[]>();

    for (const evento of candidates) {
      const timeKey = evento.hora_inicio || "dia-inteiro";
      byStartTime.set(timeKey, [...(byStartTime.get(timeKey) || []), evento]);
    }

    for (const sameTimeGroup of byStartTime.values()) {
      result.push(pickNewest(sameTimeGroup));
    }
  }

  return result;
}

function getEventsForDate(eventos: any[], dateStr: string): any[] {
  let eventsForDate = eventos.filter((evento) => occursOnDate(evento, dateStr));

  const temCeia = eventsForDate.some((evento) => evento.tipo_evento === "ceia");
  if (temCeia) {
    eventsForDate = eventsForDate.filter((evento) => evento.tipo_evento !== "culto");
  }

  const temQuartaProposito = eventsForDate.some(
    (evento) => evento.tipo_evento === "quarta_proposito" || evento.tipo_evento === "quarta_proposito_prestacao",
  );
  if (temQuartaProposito) {
    eventsForDate = eventsForDate.filter((evento) => {
      if (evento.tipo_evento === "culto" && normalizeKey(evento.titulo).includes("proposito")) return false;
      return true;
    });
  }

  return dedupeSameDayEvents(eventsForDate, dateStr);
}

function buildEvent(evento: any, dtstamp: string, occurrenceDate?: string): string[] {
  const lines: string[] = [];
  const eventDate = occurrenceDate || evento.data_evento;
  if (!eventDate) return [];

  const occurrenceSuffix = occurrenceDate ? `-${formatDateOnly(occurrenceDate)}` : "";
  const uid = `${evento.id}${occurrenceSuffix}@gileade.church`;
  const tipoLabel = tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento || "";
  const summary = evento.titulo || tipoLabel || "Evento";

  const descParts: string[] = [];
  if (tipoLabel && evento.titulo) descParts.push(`Tipo: ${tipoLabel}`);
  if (evento.descricao) descParts.push(evento.descricao);
  if (evento.necessita_inscricao) descParts.push("Requer inscrição.");

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${uid}`);
  lines.push(`DTSTAMP:${dtstamp}`);
  lines.push(`SUMMARY:${escapeICS(summary)}`);
  if (descParts.length) lines.push(`DESCRIPTION:${escapeICS(descParts.join("\n"))}`);
  if (evento.local) lines.push(`LOCATION:${escapeICS(evento.local)}`);

  if (evento.hora_inicio) {
    const startTime = evento.hora_inicio;
    const endTime = evento.hora_fim || evento.hora_inicio;
    let endDate = occurrenceDate ? eventDate : (evento.data_fim || eventDate);
    if (endDate === eventDate && endTime <= startTime) {
      endDate = addDaysToDateString(eventDate, 1);
    }

    lines.push(`DTSTART:${formatDateTimeUtcFromSaoPaulo(eventDate, startTime)}`);
    lines.push(`DTEND:${formatDateTimeUtcFromSaoPaulo(endDate, endTime)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(eventDate)}`);
    const end = occurrenceDate ? eventDate : (evento.data_fim || eventDate);
    lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addDaysToDateString(end, 1))}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

const textEncoder = new TextEncoder();

function byteLength(value: string): number {
  return textEncoder.encode(value).length;
}

// ICS line folding (RFC 5545: max 75 octetos por linha, contando UTF-8)
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let maxBytes = 75;

  for (const char of line) {
    if (current && byteLength(current + char) > maxBytes) {
      parts.push(current);
      current = char;
      maxBytes = 74; // as linhas de continuação recebem 1 espaço no início
    } else {
      current += char;
    }
  }

  parts.push(current);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

function foldLines(lines: string[]): string {
  return lines.map(foldLine).join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Filtro opcional: ?tipo=publico|interno
    const visibilidade = url.searchParams.get("visibilidade");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let query = supabase
      .from("agenda_igreja")
      .select(
        "id, titulo, descricao, tipo_evento, local, data_evento, data_fim, hora_inicio, hora_fim, recorrente, dia_semana, semana_mes, status, ativo, visibilidade, genero_alvo, necessita_inscricao, created_at",
      )
      .eq("ativo", true)
      .eq("status", "aprovado");

    // Por padrão, o feed inclui também eventos "somente_convidados" para que líderes
    // e convidados vejam esses compromissos no Google Calendar/Apple/Outlook.
    // Para excluir, basta adicionar ?publico=1 à URL.
    if (url.searchParams.get("publico") === "1") {
      query = query.neq("genero_alvo", "somente_convidados");
    }

    if (visibilidade) {
      query = query.eq("visibilidade", visibilidade);
    } else {
      // Por padrão expõe apenas eventos públicos no feed iCal
      query = query.in("visibilidade", ["publico", "interno"]);
    }

    const { data: eventos, error } = await query;
    if (error) throw error;

    const dtstamp = nowUtcStamp();
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gileade Church//Agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Agenda Gileade Church",
      "X-WR-TIMEZONE:America/Sao_Paulo",
      "X-WR-CALDESC:Eventos e programação da Gileade Church",
      // VTIMEZONE simplificada (sem DST — Brasil não usa atualmente)
      "BEGIN:VTIMEZONE",
      "TZID:America/Sao_Paulo",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:-0300",
      "TZOFFSETTO:-0300",
      "TZNAME:BRT",
      "END:STANDARD",
      "END:VTIMEZONE",
    ];

    const allEvents = eventos || [];
    const singleDateEvents = new Map<string, any[]>();
    for (const ev of allEvents.filter((evento) => !isWeeklyRecurring(evento) && !isInvalidRecurring(evento) && evento.data_evento)) {
      singleDateEvents.set(ev.data_evento, [...(singleDateEvents.get(ev.data_evento) || []), ev]);
    }

    for (const [dateStr, sameDayEvents] of singleDateEvents.entries()) {
      for (const ev of dedupeSameDayEvents(sameDayEvents, dateStr)) {
        try {
          lines.push(...buildEvent(ev, dtstamp));
        } catch (e) {
          console.error("Erro ao processar evento", ev.id, e);
        }
      }
    }

    const feedStart = new Date();
    feedStart.setUTCDate(feedStart.getUTCDate() - 90);
    const feedEnd = new Date();
    feedEnd.setUTCDate(feedEnd.getUTCDate() + 540);

    for (let cursor = new Date(feedStart); cursor <= feedEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dateStr = dateToString(cursor);
      for (const ev of getEventsForDate(allEvents, dateStr).filter(isWeeklyRecurring)) {
        try {
          lines.push(...buildEvent(ev, dtstamp, dateStr));
        } catch (e) {
          console.error("Erro ao processar evento recorrente", ev.id, e);
        }
      }
    }

    lines.push("END:VCALENDAR");
    const body = foldLines(lines) + "\r\n";

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="agenda-gileade.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Erro no feed iCal:", message, stack);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});