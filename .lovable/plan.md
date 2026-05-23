## O que vou construir no módulo Missões — Moçambique

### 1. Filtro de mês no topo (compartilhado entre as abas)
- Um seletor de mês/ano fica no topo do módulo (acima das abas).
- Todas as abas (Contribuintes, Lançamentos, Despesas, Fechamento, Relatório) passam a respeitar esse mês.
- Por padrão abre no mês atual.

### 2. Cotação automática Real → Metical (MZN)
- Vou criar uma função no servidor (edge function) que busca a cotação atualizada do BRL→MZN na internet (usando uma API pública gratuita de câmbio).
- A cotação aparece em destaque no topo, com data/hora da última atualização e botão de "atualizar".
- O usuário ainda pode digitar uma cotação manual caso queira sobrescrever (igual hoje).
- Os totais em MZN passam a usar a cotação atual.

### 3. Nova aba "Despesas" (igual à dos eventos)
- Cadastro de despesas do módulo (descrição, categoria, valor, data, forma de pagamento, comprovante opcional, observações).
- Filtrado pelo mês selecionado.
- Cards de resumo: Total de despesas, Saldo (Arrecadado − Despesas).
- Mesmo padrão visual do `TeologiaDespesasTab`.

### 4. Nova aba "Lançamentos" + botão "Lançar Contribuição"
- Botão grande "Lançar Contribuição" abre um diálogo com 2 modos:
  - **Por Membro**: busca o membro (igual ao MemberSearchSelect já usado em outros módulos) — preenche valor, data, forma de pagamento, observações.
  - **Por Condomínio**: lista os condomínios cadastrados, permite escolher um e lançar o valor ofertado por aquele condomínio no mês.
- Os lançamentos do mês aparecem em uma tabela com filtros, podem ser editados ou excluídos.
- Lançamentos manuais entram no total arrecadado do mês (junto com as contribuições registradas dos contribuintes fixos).

### 5. Relatório mensal completo
- Nova aba "Relatório" (ou botão "Gerar Relatório PDF" no Fechamento).
- O relatório do mês selecionado traz:
  - Cabeçalho com mês, cotação usada, totais em R$ e MZN.
  - Lista de contribuintes fixos (quem pagou, quem está pendente).
  - Lista de lançamentos avulsos por membro.
  - Lista de ofertas por condomínio.
  - Lista de despesas do mês.
  - Saldo final (Arrecadado − Despesas) em R$ e MZN.
  - Equivalência em poder de compra (mantém os itens já existentes).
- Exportação em PDF (mesmo padrão dos demais relatórios do sistema) e Excel.

---

## Mudanças no banco de dados

- **Nova tabela** `missoes_mocambique_despesas` (descrição, categoria, valor, data, forma de pagamento, comprovante, observações, mes_referencia).
- **Nova tabela** `missoes_mocambique_lancamentos` para lançamentos avulsos:
  - Pode referenciar `member_id` **ou** `condominio_id` **ou** nome manual.
  - Campos: valor, data, forma de pagamento, mes_referencia, observações.
- **Nova tabela** `missoes_mocambique_cotacao_cache` (1 linha) para guardar a última cotação automática + timestamp, evitando chamadas repetidas.
- Regras de acesso (RLS): mesmo padrão das tabelas atuais do módulo.

## Mudanças técnicas

- Nova função no servidor `obter-cotacao-mzn` que consulta a API pública `https://api.frankfurter.app/latest?from=BRL&to=MZN` (gratuita, sem chave). Se falhar, mantém o último valor em cache.
- Layout das abas em Missões muda de 2 para 5 abas: Contribuintes • Lançamentos • Despesas • Fechamento • Relatório.

## O que NÃO vou mexer (a menos que você peça)

- Lógica de envio de WhatsApp de agradecimento já existente.
- Cadastro de contribuintes fixos (continua igual).
- Layout do dashboard de fechamento (apenas adiciono "despesas" e "saldo" nos cards).

---

Posso seguir com tudo isso?