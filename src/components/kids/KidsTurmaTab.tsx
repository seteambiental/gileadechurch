import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, UserRound } from "lucide-react";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface Crianca {
  id: string;
  nome: string;
  idade: number;
  genero: string | null;
  whatsapp: string | null;
  foto: string | null;
  tipo: "membro" | "novo_convertido";
}

interface KidsTurmaTabProps {
  turma: TurmaConfig;
  criancas: Crianca[];
}

export const KidsTurmaTab = ({ turma, criancas }: KidsTurmaTabProps) => {
  const [search, setSearch] = useState("");

  const criancasFiltradas = criancas.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const meninos = criancas.filter((c) => c.genero === "masculino").length;
  const meninas = criancas.filter((c) => c.genero === "feminino").length;

  return (
    <div className="space-y-4">
      {/* Stats da turma */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full" 
                style={{ backgroundColor: `${turma.cor_hex}20` }}
              >
                <Users className="h-5 w-5" style={{ color: turma.cor_hex }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{criancas.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <UserRound className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meninos}</p>
                <p className="text-xs text-muted-foreground">Meninos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-100">
                <UserRound className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meninas}</p>
                <p className="text-xs text-muted-foreground">Meninas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${turma.cor_hex}20` }}
              >
                <span className="text-sm font-bold" style={{ color: turma.cor_hex }}>
                  {turma.idade_minima}-{turma.idade_maxima}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">Faixa Etária</p>
                <p className="text-xs text-muted-foreground">anos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de crianças */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: turma.cor_hex }} 
              />
              Crianças - Turma {turma.nome_exibicao}
            </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar criança..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {criancasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhuma criança encontrada" : "Nenhuma criança nesta turma"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>WhatsApp Responsável</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criancasFiltradas.map((crianca) => (
                    <TableRow key={`${crianca.tipo}-${crianca.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={crianca.foto || undefined} />
                            <AvatarFallback 
                              style={{ backgroundColor: `${turma.cor_hex}30` }}
                            >
                              {crianca.nome.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{crianca.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>{crianca.idade} anos</TableCell>
                      <TableCell>
                        {crianca.genero === "masculino" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Menino
                          </Badge>
                        ) : crianca.genero === "feminino" ? (
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                            Menina
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {crianca.whatsapp || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={crianca.tipo === "membro" ? "default" : "secondary"}
                        >
                          {crianca.tipo === "membro" ? "Membro" : "Consolidação"}
                        </Badge>
                      </TableCell>
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
};
