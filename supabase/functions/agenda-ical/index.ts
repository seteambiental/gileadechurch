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

function formatDateOnly(date: string): string {
  return date.replace(/-/g, "");
}

function nowUtcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function buildEvent(evento: any, dtstamp: string): string[] {
  const lines: string[] = [];
  const uid = `${evento.id}@gileade.church`;
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

  const TZID = "America/Sao_Paulo";

  const shouldRepeatWeekly = evento.recorrente === true && typeof evento.dia_semana === "number";

  if (shouldRepeatWeekly) {
    // Eventos recorrentes semanais: só gera RRULE quando o cadastro tem dia_semana explícito.
    // Se recorrente estiver marcado por engano sem dia_semana, o evento é tratado como data única.
    const diaSemana = evento.dia_semana;
    const today = new Date();
    const dayOfWeekToday = today.getUTCDay();
    let diff = diaSemana - dayOfWeekToday;
    if (diff > 0) diff -= 7;
    const anchor = new Date(today);
    anchor.setUTCDate(today.getUTCDate() + diff);
    const anchorStr = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}-${String(anchor.getUTCDate()).padStart(2, "0")}`;

    if (evento.hora_inicio) {
      lines.push(`DTSTART;TZID=${TZID}:${formatDateTimeLocal(anchorStr, evento.hora_inicio)}`);
      lines.push(
        `DTEND;TZID=${TZID}:${formatDateTimeLocal(anchorStr, evento.hora_fim || evento.hora_inicio)}`
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(anchorStr)}`);
    }
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAYS[diaSemana]}`);
  } else if (evento.data_evento) {
    if (evento.hora_inicio) {
      lines.push(`DTSTART;TZID=${TZID}:${formatDateTimeLocal(evento.data_evento, evento.hora_inicio)}`);
      lines.push(
        `DTEND;TZID=${TZID}:${formatDateTimeLocal(
          evento.data_fim || evento.data_evento,
          evento.hora_fim || evento.hora_inicio,
        )}`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(evento.data_evento)}`);
      // Para all-day, DTEND deve ser dia seguinte
      const end = evento.data_fim || evento.data_evento;
      const endDate = new Date(end + "T00:00:00Z");
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const endStr = `${endDate.getUTCFullYear()}${String(endDate.getUTCMonth() + 1).padStart(2, "0")}${String(endDate.getUTCDate()).padStart(2, "0")}`;
      lines.push(`DTEND;VALUE=DATE:${endStr}`);
    }
  }

  lines.push("END:VEVENT");
  return lines;
}

// ICS line folding (RFC 5545: max 75 octets por linha)
function foldLines(lines: string[]): string {
  return lines
    .map((line) => {
      if (line.length <= 75) return line;
      const parts: string[] = [];
      let remaining = line;
      parts.push(remaining.slice(0, 75));
      remaining = remaining.slice(75);
      while (remaining.length > 74) {
        parts.push(" " + remaining.slice(0, 74));
        remaining = remaining.slice(74);
      }
      if (remaining.length) parts.push(" " + remaining);
      return parts.join("\r\n");
    })
    .join("\r\n");
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
        "id, titulo, descricao, tipo_evento, local, data_evento, data_fim, hora_inicio, hora_fim, recorrente, dia_semana, status, ativo, visibilidade, genero_alvo, necessita_inscricao",
      )
      .eq("ativo", true)
      .eq("status", "aprovado")
      .neq("genero_alvo", "somente_convidados");

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

    for (const ev of eventos || []) {
      try {
        lines.push(...buildEvent(ev, dtstamp));
      } catch (e) {
        console.error("Erro ao processar evento", ev.id, e);
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