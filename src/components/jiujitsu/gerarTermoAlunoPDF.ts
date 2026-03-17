import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { differenceInYears } from "date-fns";
import { savePDF } from "@/lib/export";

export function gerarTermoAlunoPDF(aluno: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 25;

  const dataHoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const isMenor = aluno.data_nascimento
    ? differenceInYears(new Date(), new Date(aluno.data_nascimento)) < 18
    : false;

  const dataNascFormatada = aluno.data_nascimento
    ? format(new Date(aluno.data_nascimento), "dd/MM/yyyy")
    : "Não informada";

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("IGREJA GILEADE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(11);
  doc.text("MINISTÉRIO DE JIU-JITSU", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // --- FICHA DO ALUNO ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA CADASTRAL DO ALUNO", pageW / 2, y, { align: "center" });
  y += 10;

  const addField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}: `, marginL, y);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(value || "Não informado", marginL + labelW, y);
    y += 6;
  };

  addField("Nome Completo", aluno.nome);
  addField("Data de Nascimento", dataNascFormatada);
  addField("Gênero", aluno.genero || "Não informado");
  addField("CPF", aluno.cpf || "Não informado");
  addField("Tipo", aluno.tipo === "membro" ? "Membro da Igreja" : "Visitante");
  addField("Telefone / WhatsApp", aluno.telefone || aluno.whatsapp || "Não informado");
  addField("E-mail", aluno.email || "Não informado");
  addField("Endereço", aluno.endereco || "Não informado");

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CONTATO DE EMERGÊNCIA", marginL, y);
  y += 6;
  addField("Nome", aluno.contato_emergencia_nome || "Não informado");
  addField("Telefone", aluno.contato_emergencia_telefone || "Não informado");

  if (isMenor) {
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.text("RESPONSÁVEL LEGAL (MENOR DE IDADE)", marginL, y);
    y += 6;
    addField("Nome do Responsável", aluno.responsavel_nome || "Não informado");
    addField("Telefone do Responsável", aluno.responsavel_telefone || "Não informado");
  }

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text("INFORMAÇÕES DE SAÚDE", marginL, y);
  y += 6;
  addField("Tipo Sanguíneo", aluno.tipo_sanguineo || "Não informado");
  addField("Plano de Saúde", aluno.plano_saude ? "Sim" : "Não");
  addField("Alergias", aluno.alergias || "Nenhuma");
  addField("Medicamento Contínuo", aluno.medicamento_continuo || "Nenhum");
  addField("Restrição Física", aluno.restricao_fisica || "Nenhuma");

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text("GRADUAÇÃO", marginL, y);
  y += 6;
  addField("Faixa", aluno.faixa || "Branca");
  addField("Graus", String(aluno.graus || 0));

  // --- TERMO DE RESPONSABILIDADE E EMERGÊNCIA ---
  y += 10;
  if (y > 240) { doc.addPage(); y = 25; }

  doc.setDrawColor(0);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMO DE RESPONSABILIDADE E AUTORIZAÇÃO PARA ATENDIMENTO DE EMERGÊNCIA", pageW / 2, y, { align: "center", maxWidth: contentW });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const termoEmergenciaTexto = isMenor
    ? `Eu, ${aluno.responsavel_nome || "___________________________"}, portador(a) do CPF nº ${aluno.cpf || "_______________"}, na qualidade de responsável legal pelo(a) menor ${aluno.nome}, nascido(a) em ${dataNascFormatada}, DECLARO para os devidos fins que:\n\n1. Autorizo expressamente a Igreja Gileade, por meio de seus representantes, instrutores e colaboradores do Ministério de Jiu-Jitsu, a encaminhar o(a) menor acima identificado(a) ao posto de atendimento médico ou unidade de saúde mais próxima, em caso de emergência, acidente ou mal súbito ocorrido durante as aulas, treinos ou atividades relacionadas ao ministério.\n\n2. ISENTO a Igreja Gileade, seus pastores, líderes, instrutores, voluntários e colaboradores de qualquer responsabilidade civil ou criminal decorrente de acidentes, lesões ou quaisquer danos físicos que venham a ocorrer durante a prática do Jiu-Jitsu, desde que não comprovada conduta dolosa.\n\n3. DECLARO estar ciente dos riscos inerentes à prática de artes marciais, incluindo, mas não se limitando a: contusões, torções, fraturas, escoriações e outras lesões físicas.\n\n4. COMPROMETO-ME a acompanhar o(a) menor durante as aulas e atividades, auxiliando sempre que necessário, e a manter atualizados os dados de contato e informações de saúde junto à coordenação do ministério.\n\n5. DECLARO que todas as informações de saúde prestadas nesta ficha são verdadeiras e completas, responsabilizando-me por eventuais omissões.`
    : `Eu, ${aluno.nome}, portador(a) do CPF nº ${aluno.cpf || "_______________"}, nascido(a) em ${dataNascFormatada}, DECLARO para os devidos fins que:\n\n1. Autorizo expressamente a Igreja Gileade, por meio de seus representantes, instrutores e colaboradores do Ministério de Jiu-Jitsu, a me encaminhar ao posto de atendimento médico ou unidade de saúde mais próxima, em caso de emergência, acidente ou mal súbito ocorrido durante as aulas, treinos ou atividades relacionadas ao ministério.\n\n2. ISENTO a Igreja Gileade, seus pastores, líderes, instrutores, voluntários e colaboradores de qualquer responsabilidade civil ou criminal decorrente de acidentes, lesões ou quaisquer danos físicos que venham a ocorrer durante a prática do Jiu-Jitsu, desde que não comprovada conduta dolosa.\n\n3. DECLARO estar ciente dos riscos inerentes à prática de artes marciais, incluindo, mas não se limitando a: contusões, torções, fraturas, escoriações e outras lesões físicas.\n\n4. DECLARO que todas as informações de saúde prestadas nesta ficha são verdadeiras e completas, responsabilizando-me por eventuais omissões.`;

  const splitEmergencia = doc.splitTextToSize(termoEmergenciaTexto, contentW);
  doc.text(splitEmergencia, marginL, y);
  y += splitEmergencia.length * 4 + 5;

  if (y > 240) { doc.addPage(); y = 25; }

  // Aceite
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(aluno.termo_emergencia_aceito ? "☑ ACEITO EM " + format(new Date(aluno.created_at || new Date()), "dd/MM/yyyy 'às' HH:mm") : "☐ NÃO ACEITO", marginL, y);
  y += 12;

  // --- TERMO DE DIREITO DE IMAGEM ---
  if (y > 230) { doc.addPage(); y = 25; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM", pageW / 2, y, { align: "center", maxWidth: contentW });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const termoImagemTexto = isMenor
    ? `Eu, ${aluno.responsavel_nome || "___________________________"}, na qualidade de responsável legal pelo(a) menor ${aluno.nome}, AUTORIZO, de forma gratuita, irrevogável e por prazo indeterminado, o uso, a reprodução e a divulgação da imagem do(a) menor acima identificado(a) em fotografias, vídeos e demais materiais audiovisuais produzidos pela Igreja Gileade e pelo Ministério de Jiu-Jitsu, para fins exclusivamente institucionais, educacionais e de divulgação das atividades do ministério.\n\nA presente autorização abrange a utilização da imagem em:\na) Redes sociais oficiais da Igreja Gileade e do Ministério de Jiu-Jitsu;\nb) Website e aplicativos da Igreja;\nc) Materiais impressos e digitais de divulgação;\nd) Apresentações institucionais;\ne) Relatórios de atividades.\n\nFica vedada a utilização da imagem para fins comerciais, publicitários com finalidade lucrativa ou que atentem contra a honra, a boa fama ou a dignidade do(a) menor.`
    : `Eu, ${aluno.nome}, portador(a) do CPF nº ${aluno.cpf || "_______________"}, AUTORIZO, de forma gratuita, irrevogável e por prazo indeterminado, o uso, a reprodução e a divulgação da minha imagem em fotografias, vídeos e demais materiais audiovisuais produzidos pela Igreja Gileade e pelo Ministério de Jiu-Jitsu, para fins exclusivamente institucionais, educacionais e de divulgação das atividades do ministério.\n\nA presente autorização abrange a utilização da imagem em:\na) Redes sociais oficiais da Igreja Gileade e do Ministério de Jiu-Jitsu;\nb) Website e aplicativos da Igreja;\nc) Materiais impressos e digitais de divulgação;\nd) Apresentações institucionais;\ne) Relatórios de atividades.\n\nFica vedada a utilização da imagem para fins comerciais, publicitários com finalidade lucrativa ou que atentem contra a honra, a boa fama ou a dignidade do(a) autorizante.`;

  const splitImagem = doc.splitTextToSize(termoImagemTexto, contentW);
  doc.text(splitImagem, marginL, y);
  y += splitImagem.length * 4 + 5;

  if (y > 260) { doc.addPage(); y = 25; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(aluno.termo_imagem_aceito ? "☑ ACEITO EM " + format(new Date(aluno.created_at || new Date()), "dd/MM/yyyy 'às' HH:mm") : "☐ NÃO ACEITO", marginL, y);
  y += 15;

  // Assinaturas
  if (y > 240) { doc.addPage(); y = 25; }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Local e Data: _________________________________, ${dataHoje}`, marginL, y);
  y += 20;

  // Linhas de assinatura
  const sigLineW = 70;
  const sig1X = marginL;
  const sig2X = pageW - marginR - sigLineW;

  doc.line(sig1X, y, sig1X + sigLineW, y);
  doc.line(sig2X, y, sig2X + sigLineW, y);
  y += 5;

  doc.setFontSize(8);
  doc.text(isMenor ? "Assinatura do Responsável Legal" : "Assinatura do Aluno", sig1X + sigLineW / 2, y, { align: "center" });
  doc.text("Instrutor / Responsável pelo Ministério", sig2X + sigLineW / 2, y, { align: "center" });

  // Footer
  y += 15;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Documento gerado eletronicamente pelo sistema da Igreja Gileade em " + dataHoje + ".", pageW / 2, y, { align: "center" });
  doc.text("Este documento possui validade mediante aceite digital registrado no sistema.", pageW / 2, y + 4, { align: "center" });

  const nomeArquivo = `Termo_JiuJitsu_${aluno.nome.replace(/\s+/g, "_")}.pdf`;
  savePDF(doc, nomeArquivo);
}
