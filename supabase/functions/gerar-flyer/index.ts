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

// Função para quebrar texto em múltiplas linhas respeitando limite de caracteres
const wrapText = (text: string, maxChars: number): string[] => {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

// Gerar SVG do flyer
const generateFlyerSVG = (params: {
  titulo: string;
  dataFormatada: string;
  dataFimFormatada?: string;
  horaInicio?: string;
  horaFim?: string;
  local?: string;
  descricao?: string;
  publicoAlvo?: string;
  idadeMinima?: number;
  idadeMaxima?: number;
  temRefeicao?: boolean;
  comentariosRefeicao?: string;
  temCusto?: boolean;
  valorCusto?: number;
  comentariosCusto?: string;
  cronograma?: string[];
  limiteVagas?: number;
  observacoes?: string;
  corFundo: string;
  template: string;
}): string => {
  const {
    titulo,
    dataFormatada,
    dataFimFormatada,
    horaInicio,
    horaFim,
    local,
    descricao,
    publicoAlvo,
    idadeMinima,
    idadeMaxima,
    temRefeicao,
    comentariosRefeicao,
    temCusto,
    valorCusto,
    comentariosCusto,
    cronograma,
    limiteVagas,
    observacoes,
    corFundo,
    template,
  } = params;

  // Determinar público
  let publicoTexto = "Todos os públicos";
  if (publicoAlvo === "masculino" || publicoAlvo === "homens") publicoTexto = "Público masculino";
  else if (publicoAlvo === "feminino" || publicoAlvo === "mulheres") publicoTexto = "Público feminino";
  else if (publicoAlvo === "jovens") publicoTexto = "Jovens";
  else if (publicoAlvo === "adolescentes") publicoTexto = "Adolescentes";
  else if (publicoAlvo === "criancas") publicoTexto = "Crianças";

  // Faixa etária
  let faixaEtaria = "";
  if (idadeMinima && idadeMaxima) {
    faixaEtaria = `${idadeMinima} a ${idadeMaxima} anos`;
  } else if (idadeMinima) {
    faixaEtaria = `A partir de ${idadeMinima} anos`;
  } else if (idadeMaxima) {
    faixaEtaria = `Até ${idadeMaxima} anos`;
  }

  // Horário formatado
  const horarioTexto = horaInicio 
    ? (horaFim ? `${horaInicio} às ${horaFim}` : `A partir das ${horaInicio}`)
    : "";

  // Data formatada (com data fim se houver)
  const dataTexto = dataFimFormatada && dataFimFormatada !== dataFormatada
    ? `${dataFormatada} a ${dataFimFormatada}`
    : dataFormatada;

  // Custo formatado
  let custoTexto = "Entrada gratuita";
  let custoDetalhe = "";
  if (temCusto && valorCusto) {
    custoTexto = `R$ ${valorCusto.toFixed(2).replace('.', ',')}`;
    if (comentariosCusto) custoDetalhe = comentariosCusto;
  }

  // Refeição formatada
  let refeicaoTexto = "";
  if (temRefeicao) {
    refeicaoTexto = comentariosRefeicao || "Refeições inclusas";
  }

  // Vagas
  const vagasTexto = limiteVagas ? `${limiteVagas} vagas` : "";

  // Quebrar título em linhas (max 20 chars por linha)
  const tituloLinhas = wrapText(titulo.toUpperCase(), 18);

  // Template Minimalista - Layout limpo com muito espaço
  if (template === "minimalista") {
    let y = 280;
    const lineHeight = 80;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .titulo { font-family: 'Arial Black', Arial, sans-serif; font-weight: 900; font-size: 64px; fill: white; }
      .subtitulo { font-family: Arial, sans-serif; font-weight: 700; font-size: 32px; fill: white; }
      .texto { font-family: Arial, sans-serif; font-weight: 400; font-size: 28px; fill: rgba(255,255,255,0.95); }
      .destaque { font-family: Arial, sans-serif; font-weight: 700; font-size: 36px; fill: white; }
      .marca { font-family: Arial, sans-serif; font-weight: 700; font-size: 42px; fill: rgba(255,255,255,0.9); }
    </style>
  </defs>
  
  <!-- Fundo -->
  <rect width="1080" height="1920" fill="${corFundo}"/>
  
  <!-- Linha decorativa superior -->
  <rect x="80" y="180" width="100" height="5" fill="white" opacity="0.9"/>
  
  <!-- Título -->
  ${tituloLinhas.map((linha, i) => 
    `<text x="80" y="${y + (i * lineHeight)}" class="titulo">${escapeXml(linha)}</text>`
  ).join('\n  ')}
  
  <!-- Descrição -->
  ${descricao ? wrapText(descricao, 45).slice(0, 2).map((linha, i) => 
    `<text x="80" y="${y + (tituloLinhas.length * lineHeight) + 40 + (i * 36)}" class="texto">${escapeXml(linha)}</text>`
  ).join('\n  ') : ''}
  
  <!-- Informações principais -->
  <g transform="translate(80, ${y + (tituloLinhas.length * lineHeight) + (descricao ? 160 : 60)})">
    <rect x="-20" y="-30" width="940" height="${(horarioTexto ? 65 : 0) + (local ? 65 : 0) + 100}" rx="12" fill="rgba(255,255,255,0.08)"/>
    
    <!-- Data -->
    <text x="0" y="30" class="destaque">📅  ${escapeXml(dataTexto)}</text>
    
    <!-- Horário -->
    ${horarioTexto ? `<text x="0" y="95" class="subtitulo">🕐  ${escapeXml(horarioTexto)}</text>` : ''}
    
    <!-- Local -->
    ${local ? `<text x="0" y="${horarioTexto ? 160 : 95}" class="subtitulo">📍  ${escapeXml(local.substring(0, 40))}</text>` : ''}
  </g>
  
  <!-- Cronograma (se houver) -->
  ${cronograma && cronograma.length > 0 ? `
  <g transform="translate(80, ${y + (tituloLinhas.length * lineHeight) + (descricao ? 160 : 60) + (horarioTexto ? 65 : 0) + (local ? 65 : 0) + 180})">
    <text x="0" y="0" class="subtitulo">📋 Programação</text>
    ${cronograma.slice(0, 4).map((item, i) => 
      `<text x="20" y="${45 + (i * 38)}" class="texto">• ${escapeXml(item.substring(0, 50))}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Informações adicionais -->
  <g transform="translate(80, 1250)">
    <!-- Público -->
    <text x="0" y="0" class="texto">👥  ${escapeXml(publicoTexto)}${faixaEtaria ? ` (${faixaEtaria})` : ''}</text>
    
    <!-- Vagas -->
    ${vagasTexto ? `<text x="0" y="50" class="texto">🎟️  ${escapeXml(vagasTexto)}</text>` : ''}
    
    <!-- Refeição -->
    ${refeicaoTexto ? `<text x="0" y="${vagasTexto ? 100 : 50}" class="texto">🍽️  ${escapeXml(refeicaoTexto.substring(0, 45))}</text>` : ''}
  </g>
  
  <!-- Investimento -->
  <g transform="translate(80, 1480)">
    <rect x="-20" y="-30" width="940" height="${custoDetalhe ? 110 : 80}" rx="12" fill="rgba(255,255,255,0.12)"/>
    <text x="0" y="20" class="destaque">💰  ${escapeXml(custoTexto)}</text>
    ${custoDetalhe ? `<text x="30" y="65" class="texto">${escapeXml(custoDetalhe.substring(0, 50))}</text>` : ''}
  </g>
  
  <!-- Observações -->
  ${observacoes ? `
  <g transform="translate(80, 1620)">
    <text x="0" y="0" class="texto" opacity="0.8">ℹ️  ${escapeXml(observacoes.substring(0, 55))}</text>
  </g>
  ` : ''}
  
  <!-- Marca Gileade -->
  <text x="920" y="1820" class="marca" text-anchor="end">GILEADE</text>
  
  <!-- Linha decorativa inferior -->
  <rect x="880" y="1845" width="100" height="5" fill="white" opacity="0.9"/>
</svg>`;
  }

  // Template Festivo - Colorido e animado
  if (template === "festivo") {
    const corClara = ajustarCor(corFundo, 40);
    let y = 320;
    const lineHeight = 85;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .titulo { font-family: 'Arial Black', Arial, sans-serif; font-weight: 900; font-size: 70px; fill: white; }
      .subtitulo { font-family: Arial, sans-serif; font-weight: 700; font-size: 34px; fill: white; }
      .texto { font-family: Arial, sans-serif; font-weight: 500; font-size: 30px; fill: rgba(255,255,255,0.95); }
      .destaque { font-family: Arial, sans-serif; font-weight: 800; font-size: 40px; fill: white; }
      .marca { font-family: Arial, sans-serif; font-weight: 700; font-size: 44px; fill: white; }
    </style>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${corFundo}" />
      <stop offset="50%" style="stop-color:${corClara}" />
      <stop offset="100%" style="stop-color:${corFundo}" />
    </linearGradient>
  </defs>
  
  <!-- Fundo gradiente -->
  <rect width="1080" height="1920" fill="url(#bgGrad)"/>
  
  <!-- Elementos decorativos -->
  <circle cx="100" cy="150" r="80" fill="rgba(255,255,255,0.1)"/>
  <circle cx="980" cy="250" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="150" cy="1800" r="100" fill="rgba(255,255,255,0.1)"/>
  <circle cx="950" cy="1700" r="60" fill="rgba(255,255,255,0.08)"/>
  
  <!-- Estrelas decorativas -->
  <text x="200" y="200" font-size="40" fill="rgba(255,255,255,0.3)">✨</text>
  <text x="850" y="180" font-size="50" fill="rgba(255,255,255,0.3)">⭐</text>
  <text x="900" y="1600" font-size="45" fill="rgba(255,255,255,0.3)">✨</text>
  
  <!-- Banner superior -->
  <rect x="0" y="0" width="1080" height="10" fill="rgba(255,255,255,0.4)"/>
  <rect x="0" y="1910" width="1080" height="10" fill="rgba(255,255,255,0.4)"/>
  
  <!-- Título -->
  ${tituloLinhas.map((linha, i) => 
    `<text x="540" y="${y + (i * lineHeight)}" class="titulo" text-anchor="middle">${escapeXml(linha)}</text>`
  ).join('\n  ')}
  
  <!-- Descrição -->
  ${descricao ? `
  <text x="540" y="${y + (tituloLinhas.length * lineHeight) + 30}" class="texto" text-anchor="middle">${escapeXml(descricao.substring(0, 50))}</text>
  ` : ''}
  
  <!-- Card principal -->
  <rect x="60" y="${y + (tituloLinhas.length * lineHeight) + 80}" width="960" height="420" rx="25" fill="rgba(255,255,255,0.15)"/>
  <rect x="60" y="${y + (tituloLinhas.length * lineHeight) + 80}" width="960" height="6" rx="3" fill="rgba(255,255,255,0.5)"/>
  
  <g transform="translate(100, ${y + (tituloLinhas.length * lineHeight) + 140})">
    <!-- Data -->
    <text x="0" y="0" class="destaque">📅  ${escapeXml(dataTexto)}</text>
    
    <!-- Horário -->
    ${horarioTexto ? `<text x="0" y="70" class="subtitulo">🕐  ${escapeXml(horarioTexto)}</text>` : ''}
    
    <!-- Local -->
    ${local ? `<text x="0" y="${horarioTexto ? 140 : 70}" class="subtitulo">📍  ${escapeXml(local.substring(0, 35))}</text>` : ''}
    
    <!-- Público -->
    <text x="0" y="${(horarioTexto ? 140 : 70) + (local ? 70 : 0)}" class="texto">👥  ${escapeXml(publicoTexto)}${faixaEtaria ? ` • ${faixaEtaria}` : ''}</text>
    
    <!-- Vagas -->
    ${vagasTexto ? `<text x="0" y="${(horarioTexto ? 140 : 70) + (local ? 70 : 0) + 55}" class="texto">🎟️  ${escapeXml(vagasTexto)}</text>` : ''}
  </g>
  
  <!-- Cronograma -->
  ${cronograma && cronograma.length > 0 ? `
  <g transform="translate(100, 1050)">
    <text x="0" y="0" class="subtitulo">📋 Programação:</text>
    ${cronograma.slice(0, 3).map((item, i) => 
      `<text x="30" y="${50 + (i * 42)}" class="texto">• ${escapeXml(item.substring(0, 45))}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Refeição -->
  ${refeicaoTexto ? `
  <text x="100" y="1280" class="texto">🍽️  ${escapeXml(refeicaoTexto.substring(0, 40))}</text>
  ` : ''}
  
  <!-- Investimento - Destaque -->
  <rect x="60" y="1350" width="960" height="120" rx="20" fill="rgba(255,255,255,0.2)"/>
  <text x="540" y="1420" class="destaque" text-anchor="middle">💰 ${escapeXml(custoTexto)}</text>
  ${custoDetalhe ? `<text x="540" y="1455" class="texto" text-anchor="middle">${escapeXml(custoDetalhe.substring(0, 45))}</text>` : ''}
  
  <!-- Observações -->
  ${observacoes ? `
  <text x="540" y="1540" class="texto" text-anchor="middle" opacity="0.85">ℹ️ ${escapeXml(observacoes.substring(0, 50))}</text>
  ` : ''}
  
  <!-- Marca -->
  <text x="540" y="1780" class="marca" text-anchor="middle">🎉 GILEADE 🎉</text>
</svg>`;
  }

  // Template Elegante - Sofisticado e refinado
  if (template === "elegante") {
    const corEscura = ajustarCor(corFundo, -40);
    let y = 350;
    const lineHeight = 90;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .titulo { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 62px; fill: white; letter-spacing: 4px; }
      .subtitulo { font-family: Georgia, serif; font-weight: 400; font-size: 32px; fill: rgba(255,255,255,0.95); }
      .texto { font-family: Arial, sans-serif; font-weight: 400; font-size: 28px; fill: rgba(255,255,255,0.9); }
      .destaque { font-family: Georgia, serif; font-weight: 700; font-size: 38px; fill: white; }
      .marca { font-family: Georgia, serif; font-weight: 400; font-size: 48px; fill: rgba(255,255,255,0.85); letter-spacing: 8px; }
    </style>
    <linearGradient id="elegantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${corFundo}" />
      <stop offset="100%" style="stop-color:${corEscura}" />
    </linearGradient>
  </defs>
  
  <!-- Fundo elegante -->
  <rect width="1080" height="1920" fill="url(#elegantGrad)"/>
  
  <!-- Bordas douradas -->
  <rect x="40" y="40" width="1000" height="1840" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <rect x="60" y="60" width="960" height="1800" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  
  <!-- Ornamento superior -->
  <line x1="340" y1="180" x2="740" y2="180" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
  <circle cx="540" cy="180" r="8" fill="rgba(255,255,255,0.5)"/>
  <line x1="340" y1="200" x2="740" y2="200" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  
  <!-- Título -->
  ${tituloLinhas.map((linha, i) => 
    `<text x="540" y="${y + (i * lineHeight)}" class="titulo" text-anchor="middle">${escapeXml(linha)}</text>`
  ).join('\n  ')}
  
  <!-- Linha decorativa -->
  <line x1="400" y1="${y + (tituloLinhas.length * lineHeight) + 20}" x2="680" y2="${y + (tituloLinhas.length * lineHeight) + 20}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  
  <!-- Descrição -->
  ${descricao ? `
  <text x="540" y="${y + (tituloLinhas.length * lineHeight) + 70}" class="subtitulo" text-anchor="middle" font-style="italic">"${escapeXml(descricao.substring(0, 45))}"</text>
  ` : ''}
  
  <!-- Informações -->
  <g transform="translate(540, ${y + (tituloLinhas.length * lineHeight) + 150})">
    <!-- Data -->
    <text x="0" y="0" class="destaque" text-anchor="middle">${escapeXml(dataTexto)}</text>
    
    <!-- Horário e Local -->
    ${horarioTexto ? `<text x="0" y="60" class="subtitulo" text-anchor="middle">${escapeXml(horarioTexto)}${local ? ` • ${local.substring(0, 25)}` : ''}</text>` : 
      (local ? `<text x="0" y="60" class="subtitulo" text-anchor="middle">${escapeXml(local.substring(0, 40))}</text>` : '')}
    
    <!-- Público -->
    <text x="0" y="130" class="texto" text-anchor="middle">${escapeXml(publicoTexto)}${faixaEtaria ? ` — ${faixaEtaria}` : ''}</text>
    
    <!-- Vagas -->
    ${vagasTexto ? `<text x="0" y="175" class="texto" text-anchor="middle">${escapeXml(vagasTexto)}</text>` : ''}
  </g>
  
  <!-- Cronograma -->
  ${cronograma && cronograma.length > 0 ? `
  <g transform="translate(540, 1000)">
    <text x="0" y="0" class="subtitulo" text-anchor="middle">— Programação —</text>
    ${cronograma.slice(0, 4).map((item, i) => 
      `<text x="0" y="${55 + (i * 40)}" class="texto" text-anchor="middle">${escapeXml(item.substring(0, 45))}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Refeição e observações -->
  <g transform="translate(540, 1320)">
    ${refeicaoTexto ? `<text x="0" y="0" class="texto" text-anchor="middle">🍽️ ${escapeXml(refeicaoTexto.substring(0, 40))}</text>` : ''}
    ${observacoes ? `<text x="0" y="${refeicaoTexto ? 50 : 0}" class="texto" text-anchor="middle" opacity="0.8">${escapeXml(observacoes.substring(0, 45))}</text>` : ''}
  </g>
  
  <!-- Investimento -->
  <g transform="translate(540, 1500)">
    <line x1="-150" y1="-30" x2="150" y2="-30" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <text x="0" y="20" class="destaque" text-anchor="middle">${escapeXml(custoTexto)}</text>
    ${custoDetalhe ? `<text x="0" y="65" class="texto" text-anchor="middle">${escapeXml(custoDetalhe.substring(0, 40))}</text>` : ''}
    <line x1="-150" y1="${custoDetalhe ? 90 : 50}" x2="150" y2="${custoDetalhe ? 90 : 50}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  </g>
  
  <!-- Ornamento inferior -->
  <line x1="340" y1="1720" x2="740" y2="1720" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <circle cx="540" cy="1740" r="8" fill="rgba(255,255,255,0.5)"/>
  <line x1="340" y1="1760" x2="740" y2="1760" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
  
  <!-- Marca -->
  <text x="540" y="1830" class="marca" text-anchor="middle">GILEADE</text>
</svg>`;
  }

  // Template Corporativo - Profissional e clean
  if (template === "corporativo") {
    let y = 300;
    const lineHeight = 75;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .titulo { font-family: Arial, sans-serif; font-weight: 700; font-size: 58px; fill: white; }
      .subtitulo { font-family: Arial, sans-serif; font-weight: 600; font-size: 30px; fill: white; }
      .texto { font-family: Arial, sans-serif; font-weight: 400; font-size: 26px; fill: rgba(255,255,255,0.9); }
      .label { font-family: Arial, sans-serif; font-weight: 600; font-size: 22px; fill: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px; }
      .destaque { font-family: Arial, sans-serif; font-weight: 700; font-size: 36px; fill: white; }
      .marca { font-family: Arial, sans-serif; font-weight: 700; font-size: 38px; fill: white; }
    </style>
  </defs>
  
  <!-- Fundo sólido -->
  <rect width="1080" height="1920" fill="${corFundo}"/>
  
  <!-- Header bar -->
  <rect x="0" y="0" width="1080" height="120" fill="rgba(255,255,255,0.1)"/>
  <text x="80" y="75" class="marca">GILEADE</text>
  <rect x="0" y="120" width="1080" height="3" fill="rgba(255,255,255,0.3)"/>
  
  <!-- Título -->
  <g transform="translate(80, ${y})">
    ${tituloLinhas.map((linha, i) => 
      `<text x="0" y="${i * lineHeight}" class="titulo">${escapeXml(linha)}</text>`
    ).join('\n    ')}
  </g>
  
  <!-- Descrição -->
  ${descricao ? `
  <g transform="translate(80, ${y + (tituloLinhas.length * lineHeight) + 20})">
    ${wrapText(descricao, 50).slice(0, 2).map((linha, i) => 
      `<text x="0" y="${i * 35}" class="texto">${escapeXml(linha)}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Grid de informações -->
  <g transform="translate(80, ${y + (tituloLinhas.length * lineHeight) + (descricao ? 120 : 40)})">
    <!-- Coluna 1 -->
    <g>
      <text x="0" y="0" class="label">Data</text>
      <text x="0" y="35" class="subtitulo">${escapeXml(dataTexto)}</text>
      
      <text x="0" y="100" class="label">Horário</text>
      <text x="0" y="135" class="subtitulo">${horarioTexto ? escapeXml(horarioTexto) : 'A definir'}</text>
      
      <text x="0" y="200" class="label">Local</text>
      <text x="0" y="235" class="subtitulo">${local ? escapeXml(local.substring(0, 30)) : 'A definir'}</text>
    </g>
    
    <!-- Coluna 2 -->
    <g transform="translate(500, 0)">
      <text x="0" y="0" class="label">Público</text>
      <text x="0" y="35" class="subtitulo">${escapeXml(publicoTexto)}</text>
      
      ${faixaEtaria ? `
      <text x="0" y="100" class="label">Faixa Etária</text>
      <text x="0" y="135" class="subtitulo">${escapeXml(faixaEtaria)}</text>
      ` : ''}
      
      ${vagasTexto ? `
      <text x="0" y="${faixaEtaria ? 200 : 100}" class="label">Vagas</text>
      <text x="0" y="${faixaEtaria ? 235 : 135}" class="subtitulo">${escapeXml(vagasTexto)}</text>
      ` : ''}
    </g>
  </g>
  
  <!-- Cronograma -->
  ${cronograma && cronograma.length > 0 ? `
  <g transform="translate(80, 950)">
    <text x="0" y="0" class="label">Programação</text>
    <rect x="-10" y="20" width="930" height="${40 + (cronograma.slice(0, 4).length * 38)}" rx="8" fill="rgba(255,255,255,0.05)"/>
    ${cronograma.slice(0, 4).map((item, i) => 
      `<text x="10" y="${60 + (i * 38)}" class="texto">• ${escapeXml(item.substring(0, 50))}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Refeição -->
  ${refeicaoTexto ? `
  <g transform="translate(80, 1280)">
    <text x="0" y="0" class="label">Alimentação</text>
    <text x="0" y="35" class="subtitulo">${escapeXml(refeicaoTexto.substring(0, 45))}</text>
  </g>
  ` : ''}
  
  <!-- Investimento -->
  <rect x="60" y="1400" width="960" height="150" rx="12" fill="rgba(255,255,255,0.1)"/>
  <g transform="translate(80, 1440)">
    <text x="0" y="0" class="label">Investimento</text>
    <text x="0" y="50" class="destaque">${escapeXml(custoTexto)}</text>
    ${custoDetalhe ? `<text x="0" y="90" class="texto">${escapeXml(custoDetalhe.substring(0, 50))}</text>` : ''}
  </g>
  
  <!-- Observações -->
  ${observacoes ? `
  <g transform="translate(80, 1600)">
    <text x="0" y="0" class="label">Observações</text>
    <text x="0" y="35" class="texto">${escapeXml(observacoes.substring(0, 55))}</text>
  </g>
  ` : ''}
  
  <!-- Footer bar -->
  <rect x="0" y="1800" width="1080" height="120" fill="rgba(255,255,255,0.1)"/>
  <rect x="0" y="1800" width="1080" height="3" fill="rgba(255,255,255,0.3)"/>
  <text x="540" y="1870" class="subtitulo" text-anchor="middle">Igreja Gileade — Transformando vidas</text>
</svg>`;
  }

  // Template Moderno (padrão) - Equilibrado e versátil
  let y = 330;
  const lineHeight = 80;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .titulo { font-family: Arial, sans-serif; font-weight: bold; font-size: 64px; fill: white; }
      .subtitulo { font-family: Arial, sans-serif; font-weight: bold; font-size: 32px; fill: white; }
      .texto { font-family: Arial, sans-serif; font-size: 28px; fill: rgba(255,255,255,0.95); }
      .label { font-family: Arial, sans-serif; font-size: 24px; fill: rgba(255,255,255,0.7); }
      .destaque { font-family: Arial, sans-serif; font-weight: bold; font-size: 38px; fill: white; }
      .marca { font-family: Arial, sans-serif; font-weight: bold; font-size: 42px; fill: rgba(255,255,255,0.9); }
    </style>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${corFundo};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${ajustarCor(corFundo, -35)};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fundo gradiente -->
  <rect width="1080" height="1920" fill="url(#grad)"/>
  
  <!-- Elementos decorativos -->
  <circle cx="950" cy="150" r="180" fill="rgba(255,255,255,0.04)"/>
  <circle cx="100" cy="1780" r="140" fill="rgba(255,255,255,0.04)"/>
  
  <!-- Barra superior -->
  <rect x="0" y="0" width="1080" height="6" fill="rgba(255,255,255,0.35)"/>
  
  <!-- Título -->
  ${tituloLinhas.map((linha, i) => 
    `<text x="540" y="${y + (i * lineHeight)}" class="titulo" text-anchor="middle">${escapeXml(linha)}</text>`
  ).join('\n  ')}
  
  <!-- Linha decorativa -->
  <rect x="420" y="${y + (tituloLinhas.length * lineHeight) + 20}" width="240" height="4" fill="white" rx="2"/>
  
  <!-- Descrição -->
  ${descricao ? `
  <g transform="translate(540, ${y + (tituloLinhas.length * lineHeight) + 70})">
    ${wrapText(descricao, 48).slice(0, 2).map((linha, i) => 
      `<text x="0" y="${i * 35}" class="texto" text-anchor="middle">${escapeXml(linha)}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Card principal -->
  <rect x="70" y="${y + (tituloLinhas.length * lineHeight) + (descricao ? 150 : 60)}" width="940" height="380" rx="18" fill="rgba(255,255,255,0.1)"/>
  
  <g transform="translate(110, ${y + (tituloLinhas.length * lineHeight) + (descricao ? 200 : 110)})">
    <!-- Data -->
    <text x="0" y="0" class="destaque">📅  ${escapeXml(dataTexto)}</text>
    
    <!-- Horário -->
    ${horarioTexto ? `<text x="0" y="65" class="subtitulo">🕐  ${escapeXml(horarioTexto)}</text>` : ''}
    
    <!-- Local -->
    ${local ? `<text x="0" y="${horarioTexto ? 130 : 65}" class="subtitulo">📍  ${escapeXml(local.substring(0, 38))}</text>` : ''}
    
    <!-- Público e faixa etária -->
    <text x="0" y="${(horarioTexto ? 130 : 65) + (local ? 65 : 0)}" class="texto">👥  ${escapeXml(publicoTexto)}${faixaEtaria ? ` • ${faixaEtaria}` : ''}</text>
    
    <!-- Vagas -->
    ${vagasTexto ? `<text x="0" y="${(horarioTexto ? 130 : 65) + (local ? 65 : 0) + 50}" class="texto">🎟️  ${escapeXml(vagasTexto)}</text>` : ''}
  </g>
  
  <!-- Cronograma -->
  ${cronograma && cronograma.length > 0 ? `
  <rect x="70" y="1020" width="940" height="${60 + (cronograma.slice(0, 3).length * 42)}" rx="18" fill="rgba(255,255,255,0.08)"/>
  <g transform="translate(110, 1055)">
    <text x="0" y="0" class="subtitulo">📋 Programação</text>
    ${cronograma.slice(0, 3).map((item, i) => 
      `<text x="30" y="${48 + (i * 42)}" class="texto">• ${escapeXml(item.substring(0, 48))}</text>`
    ).join('\n    ')}
  </g>
  ` : ''}
  
  <!-- Refeição -->
  ${refeicaoTexto ? `
  <text x="540" y="1300" class="texto" text-anchor="middle">🍽️  ${escapeXml(refeicaoTexto.substring(0, 42))}</text>
  ` : ''}
  
  <!-- Investimento -->
  <rect x="70" y="1380" width="940" height="${custoDetalhe ? 130 : 100}" rx="18" fill="rgba(255,255,255,0.12)"/>
  <text x="540" y="1440" class="destaque" text-anchor="middle">💰  ${escapeXml(custoTexto)}</text>
  ${custoDetalhe ? `<text x="540" y="1485" class="texto" text-anchor="middle">${escapeXml(custoDetalhe.substring(0, 48))}</text>` : ''}
  
  <!-- Observações -->
  ${observacoes ? `
  <text x="540" y="1560" class="texto" text-anchor="middle" opacity="0.85">ℹ️  ${escapeXml(observacoes.substring(0, 50))}</text>
  ` : ''}
  
  <!-- Marca -->
  <text x="540" y="1780" class="marca" text-anchor="middle">GILEADE</text>
  
  <!-- Barra inferior -->
  <rect x="0" y="1914" width="1080" height="6" fill="rgba(255,255,255,0.35)"/>
</svg>`;
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
      idadeMinima,
      idadeMaxima,
      temRefeicao,
      comentariosRefeicao,
      temCusto,
      valorCusto,
      comentariosCusto,
      horariosPorDia,
      limiteVagas,
      observacoes,
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

    // Formatar datas
    const dataFormatada = formatDate(dataEvento);
    const dataFimFormatada = dataFim ? formatDate(dataFim) : undefined;

    // Construir cronograma se for multidatas
    const cronograma: string[] = [];
    if (dataFim && dataEvento !== dataFim && horariosPorDia && horariosPorDia.length > 0) {
      const horariosPorData: Record<string, HorarioDia[]> = {};
      horariosPorDia.forEach((h: HorarioDia) => {
        if (!horariosPorData[h.data]) {
          horariosPorData[h.data] = [];
        }
        horariosPorData[h.data].push(h);
      });

      const datasOrdenadas = Object.keys(horariosPorData).sort();
      datasOrdenadas.forEach((data) => {
        const horariosData = horariosPorData[data];
        horariosData.forEach((h) => {
          cronograma.push(`${formatShortDate(data)}: ${getPeriodoLabel(h.periodo)} ${h.hora_inicio}-${h.hora_fim}`);
        });
      });
    }

    // Gerar SVG
    const svgContent = generateFlyerSVG({
      titulo,
      dataFormatada,
      dataFimFormatada,
      horaInicio,
      horaFim,
      local,
      descricao,
      publicoAlvo,
      idadeMinima: idadeMinima ? parseInt(idadeMinima) : undefined,
      idadeMaxima: idadeMaxima ? parseInt(idadeMaxima) : undefined,
      temRefeicao,
      comentariosRefeicao,
      temCusto,
      valorCusto: valorCusto ? parseFloat(valorCusto) : undefined,
      comentariosCusto,
      cronograma: cronograma.length > 0 ? cronograma : undefined,
      limiteVagas: limiteVagas ? parseInt(limiteVagas) : undefined,
      observacoes,
      corFundo: corFundo || "#1e3a5f",
      template,
    });

    console.log("SVG gerado com sucesso");

    // Upload para o storage do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Salvar como SVG
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
