import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/ui/export-button";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { Users, Building2, HandHeart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, firstDayOfMonthStr, todayDateStr } from "@/lib/date-utils";

const tiposInstituicao: Record<string, string> = {
  idosos: "Idosos",
  criancas: "Crianças",
  comunidade_terapeutica: "Comunidade Terapêutica",
  abrigo: "Abrigo",
  ong: "ONG",
  outros: "Outros",
};

const formatCurrency = (value: number | null) => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  const onlyDate = date.length > 10 ? date.slice(0, 10) : date;
  return format(parseLocalDate(onlyDate), "dd/MM/yyyy", { locale: ptBR });
};

const sim = (v: boolean | null) => (v ? "Sim" : "Não");

export function AcaoSocialRelatoriosTab() {
  const [startInput, setStartInput] = useState(firstDayOfMonthStr());
  const [endInput, setEndInput] = useState(todayDateStr());
  const [range, setRange] = useState({ start: firstDayOfMonthStr(), end: todayDateStr() });

  const { data: familias = [] } = useQuery({
    queryKey: ["relatorio_familias", range],
    queryFn: async () => {
      let query = supabase
        .from("acao_social_familias")
        .select(`*, casa_refugio:casas_refugio(name), lider:members!acao_social_familias_lider_responsavel_id_fkey(full_name)`)
        .order("nome_familia");
      if (range.start) query = query.gte("created_at", `${range.start}T00:00:00`);
      if (range.end) query = query.lte("created_at", `${range.end}T23:59:59`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: membrosCount = {} } = useQuery({
    queryKey: ["relatorio_familia_membros_count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("acao_social_familia_membros").select("familia_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        map[m.familia_id] = (map[m.familia_id] || 0) + 1;
      });
      return map;
    },
  });

  const { data: instituicoes = [] } = useQuery({
    queryKey: ["relatorio_instituicoes", range],
    queryFn: async () => {
      let query = supabase.from("acao_social_instituicoes").select("*").order("nome");
      if (range.start) query = query.gte("created_at", `${range.start}T00:00:00`);
      if (range.end) query = query.lte("created_at", `${range.end}T23:59:59`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ajudas = [] } = useQuery({
    queryKey: ["relatorio_ajudas", range],
    queryFn: async () => {
      let query = supabase
        .from("acao_social_ajudas")
        .select(`*, familia:acao_social_familias(nome_familia, cidade, bairro, whatsapp), instituicao:acao_social_instituicoes(nome, cidade, bairro, whatsapp), registrado:members!acao_social_ajudas_registrado_por_fkey(full_name)`)
        .order("data_ajuda", { ascending: false });
      if (range.start) query = query.gte("data_ajuda", range.start);
      if (range.end) query = query.lte("data_ajuda", range.end);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const totalValor = ajudas.reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalKilos = ajudas.reduce((acc: number, a: any) => acc + (a.quantidade_kilos || 0), 0);
  const totalCestas = ajudas.reduce((acc: number, a: any) => acc + (a.quantidade_cestas || 0), 0);

  const periodoLabel = `${formatDate(range.start)} a ${formatDate(range.end)}`;

  const familiaColumns = [
    { header: "Nome do Responsável", accessor: "nome_familia" },
    { header: "Qtd. Membros", accessor: (r: any) => membrosCount[r.id] || 0 },
    { header: "Renda Total", accessor: (r: any) => formatCurrency(r.renda_total) },
    { header: "Telefone", accessor: (r: any) => r.telefone || "-" },
    { header: "WhatsApp", accessor: (r: any) => r.whatsapp || "-" },
    { header: "Email", accessor: (r: any) => r.email || "-" },
    { header: "CEP", accessor: (r: any) => r.cep || "-" },
    { header: "Endereço", accessor: (r: any) => r.endereco || "-" },
    { header: "Número", accessor: (r: any) => r.numero || "-" },
    { header: "Complemento", accessor: (r: any) => r.complemento || "-" },
    { header: "Bairro", accessor: (r: any) => r.bairro || "-" },
    { header: "Cidade", accessor: (r: any) => r.cidade || "-" },
    { header: "Estado", accessor: (r: any) => r.estado || "-" },
    { header: "Casa Refúgio", accessor: (r: any) => r.casa_refugio?.name || "-" },
    { header: "Líder Responsável", accessor: (r: any) => r.lider?.full_name || "-" },
    { header: "Tipo de Ajuda", accessor: (r: any) => r.tipo_ajuda || "-" },
    { header: "Frequência", accessor: (r: any) => r.frequencia_ajuda || "-" },
    { header: "Observações", accessor: (r: any) => r.observacoes || "-" },
    { header: "Status", accessor: (r: any) => (r.ativo ? "Ativo" : "Inativo") },
    { header: "Cadastrado em", accessor: (r: any) => formatDate(r.created_at) },
  ];

  const instituicaoColumns = [
    { header: "Nome", accessor: "nome" },
    { header: "CNPJ", accessor: (r: any) => r.cnpj || "-" },
    { header: "Tipo", accessor: (r: any) => tiposInstituicao[r.tipo_instituicao] || r.tipo_instituicao || "-" },
    { header: "Responsável", accessor: (r: any) => r.responsavel_nome || "-" },
    { header: "Telefone do Responsável", accessor: (r: any) => r.responsavel_telefone || "-" },
    { header: "Telefone", accessor: (r: any) => r.telefone || "-" },
    { header: "WhatsApp", accessor: (r: any) => r.whatsapp || "-" },
    { header: "Email", accessor: (r: any) => r.email || "-" },
    { header: "CEP", accessor: (r: any) => r.cep || "-" },
    { header: "Endereço", accessor: (r: any) => r.endereco || "-" },
    { header: "Número", accessor: (r: any) => r.numero || "-" },
    { header: "Complemento", accessor: (r: any) => r.complemento || "-" },
    { header: "Bairro", accessor: (r: any) => r.bairro || "-" },
    { header: "Cidade", accessor: (r: any) => r.cidade || "-" },
    { header: "Estado", accessor: (r: any) => r.estado || "-" },
    { header: "Atendidos", accessor: (r: any) => r.quantidade_atendidos ?? 0 },
    { header: "Tipo de Ajuda", accessor: (r: any) => r.tipo_ajuda || "-" },
    { header: "Frequência", accessor: (r: any) => r.frequencia_ajuda || "-" },
    { header: "Observações", accessor: (r: any) => r.observacoes || "-" },
    { header: "Status", accessor: (r: any) => (r.ativo ? "Ativo" : "Inativo") },
    { header: "Cadastrado em", accessor: (r: any) => formatDate(r.created_at) },
  ];

  const ajudaColumns = [
    { header: "Data", accessor: (r: any) => formatDate(r.data_ajuda) },
    { header: "Beneficiário", accessor: (r: any) => r.familia?.nome_familia || r.instituicao?.nome || "-" },
    { header: "Categoria", accessor: (r: any) => (r.familia ? "Família" : "Instituição") },
    { header: "Bairro", accessor: (r: any) => r.familia?.bairro || r.instituicao?.bairro || "-" },
    { header: "Cidade", accessor: (r: any) => r.familia?.cidade || r.instituicao?.cidade || "-" },
    { header: "WhatsApp", accessor: (r: any) => r.familia?.whatsapp || r.instituicao?.whatsapp || "-" },
    { header: "Tipo de Ajuda", accessor: (r: any) => r.tipo_ajuda || "-" },
    { header: "Valor", accessor: (r: any) => formatCurrency(r.valor) },
    { header: "Kilos", accessor: (r: any) => (r.quantidade_kilos ? `${r.quantidade_kilos} kg` : "-") },
    { header: "Cestas", accessor: (r: any) => r.quantidade_cestas ?? "-" },
    { header: "Itens", accessor: (r: any) => r.quantidade_itens ?? "-" },
    { header: "Descrição", accessor: (r: any) => r.descricao || "-" },
    { header: "Observações", accessor: (r: any) => r.observacoes || "-" },
    { header: "Registrado por", accessor: (r: any) => r.registrado?.full_name || "-" },
    { header: "Registrado em", accessor: (r: any) => formatDate(r.created_at) },
  ];

  return (
    <div className="space-y-4">
      <DateRangeFilter
        startDate={startInput}
        endDate={endInput}
        onStartDateChange={setStartInput}
        onEndDateChange={setEndInput}
        onApply={() => setRange({ start: startInput, end: endInput })}
        onClear={() => {
          setStartInput("");
          setEndInput("");
          setRange({ start: "", end: "" });
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total entregue em valor</p>
            <p className="text-xl font-bold">{formatCurrency(totalValor)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total em kilos</p>
            <p className="text-xl font-bold">{totalKilos.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de cestas</p>
            <p className="text-xl font-bold">{totalCestas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ajudas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="w-5 h-5" />
            Entregas de Auxílio ({ajudas.length})
          </CardTitle>
          <ExportButton
            data={ajudas}
            columns={ajudaColumns}
            filename="relatorio-ajudas-acao-social"
            title={`Entregas de Auxílio - ${periodoLabel}`}
            sheetName="Ajudas"
          />
        </CardHeader>
        <CardContent>
          {ajudas.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhuma entrega no período</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Kilos</TableHead>
                    <TableHead className="hidden md:table-cell">Cestas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ajudas.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.data_ajuda)}</TableCell>
                      <TableCell className="font-medium">
                        {a.familia?.nome_familia || a.instituicao?.nome || "-"}
                      </TableCell>
                      <TableCell>{a.tipo_ajuda || "-"}</TableCell>
                      <TableCell>{formatCurrency(a.valor)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {a.quantidade_kilos ? `${a.quantidade_kilos} kg` : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{a.quantidade_cestas || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Famílias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Famílias cadastradas no período ({familias.length})
          </CardTitle>
          <ExportButton
            data={familias}
            columns={familiaColumns}
            filename="relatorio-familias-acao-social"
            title={`Famílias - ${periodoLabel}`}
            sheetName="Famílias"
          />
        </CardHeader>
        <CardContent>
          {familias.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhuma família no período</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="hidden md:table-cell">Membros</TableHead>
                    <TableHead className="hidden md:table-cell">Cidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {familias.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome_familia}</TableCell>
                      <TableCell className="hidden md:table-cell">{membrosCount[f.id] || 0}</TableCell>
                      <TableCell className="hidden md:table-cell">{f.cidade || "-"}</TableCell>
                      <TableCell>{sim(f.ativo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instituições */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Instituições cadastradas no período ({instituicoes.length})
          </CardTitle>
          <ExportButton
            data={instituicoes}
            columns={instituicaoColumns}
            filename="relatorio-instituicoes-acao-social"
            title={`Instituições - ${periodoLabel}`}
            sheetName="Instituições"
          />
        </CardHeader>
        <CardContent>
          {instituicoes.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhuma instituição no período</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Atendidos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instituicoes.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tiposInstituicao[i.tipo_instituicao] || i.tipo_instituicao || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{i.quantidade_atendidos || 0}</TableCell>
                      <TableCell>{sim(i.ativo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
