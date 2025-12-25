import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HorarioDia {
  data: string;
  periodo: string;
  hora_inicio: string;
  hora_fim: string;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('pt-BR', options);
};

const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short'
  };
  return date.toLocaleDateString('pt-BR', options);
};

const getPeriodoLabel = (periodo: string): string => {
  const labels: Record<string, string> = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite",
  };
  return labels[periodo] || periodo;
};

// Gerar SVG do flyer (texto perfeito garantido)
const generateFlyerSVG = (params: {
  titulo: string;
  dataFormatada: string;
  horaInicio?: string;
  horaFim?: string;
  local?: string;
  descricao?: string;
  publicoAlvo?: string;
  temRefeicao?: boolean;
  comentariosRefeicao?: string;
  temCusto?: boolean;
  valorCusto?: number;
  comentariosCusto?: string;
  cronograma?: string;
  linkInscricao?: string;
  corFundo: string;
  template: string;
}): string => {
  const {
    titulo,
    dataFormatada,
    horaInicio,
    horaFim,
    local,
    descricao,
    publicoAlvo,
    temRefeicao,
    comentariosRefeicao,
    temCusto,
    valorCusto,
    comentariosCusto,
    cronograma,
    linkInscricao,
    corFundo,
    template,
  } = params;

  // Determinar público
  let publicoTexto = "Todos";
  if (publicoAlvo === "masculino") publicoTexto = "Homens";
  else if (publicoAlvo === "feminino") publicoTexto = "Mulheres";
  else if (publicoAlvo === "jovens") publicoTexto = "Jovens";

  // Horário formatado
  const horarioTexto = horaInicio 
    ? (horaFim ? `${horaInicio} às ${horaFim}` : horaInicio)
    : "";

  // Custo formatado
  let custoTexto = "Entrada Gratuita";
  if (temCusto && valorCusto) {
    custoTexto = `Investimento: R$ ${valorCusto.toFixed(2).replace('.', ',')}`;
    if (comentariosCusto) custoTexto += ` - ${comentariosCusto}`;
  }

  // Refeição formatada
  let refeicaoTexto = "";
  if (temRefeicao) {
    refeicaoTexto = "Refeições inclusas";
    if (comentariosRefeicao) refeicaoTexto += ` (${comentariosRefeicao})`;
  }

  // Template Minimalista
  if (template === "minimalista") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&amp;display=swap');
      .titulo { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 72px; fill: white; }
      .subtitulo { font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 36px; fill: white; }
      .texto { font-family: 'Montserrat', sans-serif; font-weight: 400; font-size: 32px; fill: white; }
      .texto-pequeno { font-family: 'Montserrat', sans-serif; font-weight: 400; font-size: 28px; fill: rgba(255,255,255,0.8); }
      .marca { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 48px; fill: rgba(255,255,255,0.9); }
      .icone { font-size: 32px; fill: white; }
    </style>
  </defs>
  
  <!-- Fundo -->
  <rect width="1080" height="1920" fill="${corFundo}"/>
  
  <!-- Linha decorativa superior -->
  <rect x="80" y="200" width="120" height="6" fill="white" opacity="0.8"/>
  
  <!-- Título -->
  <text x="80" y="320" class="titulo">
    ${escapeXml(titulo.toUpperCase()).split(' ').slice(0, 3).join(' ')}
  </text>
  ${titulo.split(' ').length > 3 ? `<text x="80" y="400" class="titulo">${escapeXml(titulo.toUpperCase()).split(' ').slice(3).join(' ')}</text>` : ''}
  
  <!-- Descrição -->
  ${descricao ? `<text x="80" y="500" class="texto-pequeno">${escapeXml(descricao.substring(0, 60))}${descricao.length > 60 ? '...' : ''}</text>` : ''}
  
  <!-- Informações principais -->
  <g transform="translate(80, 650)">
    <!-- Data -->
    <text x="0" y="0" class="subtitulo">📅 ${escapeXml(dataFormatada)}</text>
    
    <!-- Horário -->
    ${horarioTexto ? `<text x="0" y="60" class="subtitulo">🕐 ${escapeXml(horarioTexto)}</text>` : ''}
    
    <!-- Local -->
    ${local ? `<text x="0" y="120" class="subtitulo">📍 ${escapeXml(local)}</text>` : ''}
  </g>
  
  <!-- Cronograma (se houver) -->
  ${cronograma ? `
  <g transform="translate(80, 900)">
    <text x="0" y="0" class="subtitulo">Programação:</text>
    <text x="0" y="50" class="texto-pequeno">${escapeXml(cronograma.substring(0, 100))}</text>
  </g>
  ` : ''}
  
  <!-- Detalhes -->
  <g transform="translate(80, 1150)">
    <text x="0" y="0" class="texto">👥 Público: ${escapeXml(publicoTexto)}</text>
    ${refeicaoTexto ? `<text x="0" y="60" class="texto">🍽️ ${escapeXml(refeicaoTexto)}</text>` : ''}
    <text x="0" y="${refeicaoTexto ? '120' : '60'}" class="texto">💰 ${escapeXml(custoTexto)}</text>
  </g>
  
  <!-- Link de inscrição -->
  ${linkInscricao ? `
  <g transform="translate(80, 1450)">
    <rect x="-20" y="-40" width="940" height="100" rx="10" fill="rgba(255,255,255,0.15)"/>
    <text x="0" y="0" class="subtitulo">📝 Inscrições:</text>
    <text x="0" y="45" class="texto-pequeno">${escapeXml(linkInscricao)}</text>
  </g>
  ` : ''}
  
  <!-- Marca Gileade -->
  <text x="900" y="1850" class="marca" text-anchor="end">GILEADE</text>
  
  <!-- Linha decorativa inferior -->
  <rect x="880" y="1870" width="120" height="6" fill="white" opacity="0.8"/>
</svg>`;
  }

  // Template Moderno (padrão)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .titulo { font-family: Arial, sans-serif; font-weight: bold; font-size: 68px; fill: white; }
      .subtitulo { font-family: Arial, sans-serif; font-weight: bold; font-size: 34px; fill: white; }
      .texto { font-family: Arial, sans-serif; font-size: 30px; fill: white; }
      .texto-pequeno { font-family: Arial, sans-serif; font-size: 26px; fill: rgba(255,255,255,0.85); }
      .marca { font-family: Arial, sans-serif; font-weight: bold; font-size: 44px; fill: rgba(255,255,255,0.9); }
    </style>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${corFundo};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${ajustarCor(corFundo, -30)};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fundo com gradiente -->
  <rect width="1080" height="1920" fill="url(#grad)"/>
  
  <!-- Elementos decorativos -->
  <circle cx="950" cy="150" r="200" fill="rgba(255,255,255,0.05)"/>
  <circle cx="100" cy="1800" r="150" fill="rgba(255,255,255,0.05)"/>
  
  <!-- Barra superior -->
  <rect x="0" y="0" width="1080" height="8" fill="rgba(255,255,255,0.3)"/>
  
  <!-- Título -->
  <text x="540" y="350" class="titulo" text-anchor="middle">
    ${escapeXml(titulo.toUpperCase()).split(' ').slice(0, 3).join(' ')}
  </text>
  ${titulo.split(' ').length > 3 ? `<text x="540" y="430" class="titulo" text-anchor="middle">${escapeXml(titulo.toUpperCase()).split(' ').slice(3, 6).join(' ')}</text>` : ''}
  
  <!-- Linha decorativa -->
  <rect x="440" y="480" width="200" height="4" fill="white" rx="2"/>
  
  <!-- Descrição -->
  ${descricao ? `<text x="540" y="560" class="texto-pequeno" text-anchor="middle">${escapeXml(descricao.substring(0, 55))}${descricao.length > 55 ? '...' : ''}</text>` : ''}
  
  <!-- Card de informações -->
  <rect x="80" y="620" width="920" height="380" rx="20" fill="rgba(255,255,255,0.1)"/>
  
  <g transform="translate(120, 680)">
    <text x="0" y="0" class="subtitulo">📅  ${escapeXml(dataFormatada)}</text>
    ${horarioTexto ? `<text x="0" y="70" class="subtitulo">🕐  ${escapeXml(horarioTexto)}</text>` : ''}
    ${local ? `<text x="0" y="140" class="subtitulo">📍  ${escapeXml(local)}</text>` : ''}
    <text x="0" y="210" class="texto">👥  Público: ${escapeXml(publicoTexto)}</text>
    <text x="0" y="280" class="texto">💰  ${escapeXml(custoTexto.substring(0, 45))}</text>
  </g>
  
  <!-- Cronograma (se houver) -->
  ${cronograma ? `
  <rect x="80" y="1040" width="920" height="180" rx="20" fill="rgba(255,255,255,0.1)"/>
  <text x="120" y="1100" class="subtitulo">Programação</text>
  <text x="120" y="1160" class="texto-pequeno">${escapeXml(cronograma.substring(0, 70))}</text>
  ` : ''}
  
  <!-- Refeição -->
  ${refeicaoTexto ? `
  <text x="540" y="1300" class="texto" text-anchor="middle">🍽️  ${escapeXml(refeicaoTexto)}</text>
  ` : ''}
  
  <!-- Link de inscrição -->
  ${linkInscricao ? `
  <rect x="80" y="1400" width="920" height="140" rx="20" fill="rgba(255,255,255,0.15)"/>
  <text x="540" y="1460" class="subtitulo" text-anchor="middle">📝  Inscrições</text>
  <text x="540" y="1510" class="texto-pequeno" text-anchor="middle">${escapeXml(linkInscricao.substring(0, 50))}</text>
  ` : ''}
  
  <!-- Marca Gileade -->
  <text x="540" y="1780" class="marca" text-anchor="middle">GILEADE</text>
  
  <!-- Barra inferior -->
  <rect x="0" y="1912" width="1080" height="8" fill="rgba(255,255,255,0.3)"/>
</svg>`;
};

// Função para escapar caracteres XML
const escapeXml = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Função para ajustar cor (escurecer/clarear)
const ajustarCor = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      titulo, 
      descricao, 
      tipoEvento, 
      dataEvento, 
      dataFim,
      horaInicio, 
      horaFim,
      local, 
      publicoAlvo,
      temRefeicao,
      comentariosRefeicao,
      temCusto,
      valorCusto,
      comentariosCusto,
      horariosPorDia,
      corFundo,
      linkInscricao,
      template = "moderno"
    } = await req.json();

    if (!titulo) {
      throw new Error('Título do evento é obrigatório');
    }

    if (!dataEvento) {
      throw new Error('Data do evento é obrigatória');
    }

    console.log(`Gerando flyer via template para: ${titulo}`);

    // Formatar data
    const dataFormatada = formatDate(dataEvento);

    // Construir cronograma se for multidatas
    let cronograma = "";
    if (dataFim && dataEvento !== dataFim && horariosPorDia && horariosPorDia.length > 0) {
      const horariosPorData: Record<string, HorarioDia[]> = {};
      horariosPorDia.forEach((h: HorarioDia) => {
        if (!horariosPorData[h.data]) {
          horariosPorData[h.data] = [];
        }
        horariosPorData[h.data].push(h);
      });

      const datasOrdenadas = Object.keys(horariosPorData).sort();
      const partes: string[] = [];
      datasOrdenadas.forEach((data) => {
        const horariosData = horariosPorData[data];
        horariosData.forEach((h) => {
          partes.push(`${formatShortDate(data)}: ${getPeriodoLabel(h.periodo)} ${h.hora_inicio}-${h.hora_fim}`);
        });
      });
      cronograma = partes.slice(0, 3).join(" | ");
    }

    // Gerar SVG
    const svgContent = generateFlyerSVG({
      titulo,
      dataFormatada,
      horaInicio,
      horaFim,
      local,
      descricao,
      publicoAlvo,
      temRefeicao,
      comentariosRefeicao,
      temCusto,
      valorCusto: valorCusto ? parseFloat(valorCusto) : undefined,
      comentariosCusto,
      cronograma,
      linkInscricao,
      corFundo: corFundo || "#1e3a5f",
      template,
    });

    console.log("SVG gerado com sucesso");

    // Upload para o storage do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Salvar como SVG (pode ser convertido para PNG no frontend se necessário)
    const fileName = `flyer-${Date.now()}.svg`;
    const svgBuffer = new TextEncoder().encode(svgContent);
    
    const { error: uploadError } = await supabase.storage
      .from('encontros-fotos')
      .upload(`flyers/${fileName}`, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw new Error('Erro ao salvar flyer');
    }

    const { data: urlData } = supabase.storage
      .from('encontros-fotos')
      .getPublicUrl(`flyers/${fileName}`);

    console.log('Flyer salvo:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        flyerUrl: urlData.publicUrl,
        message: 'Flyer gerado com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});