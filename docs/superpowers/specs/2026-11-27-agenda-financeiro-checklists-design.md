# Painel — Agenda, Financeiro e Checklists (fase 2)

Data: 2026-11-27 · Base: manual "Consultório 2027 — Manual operacional" da Bianca (serviços, valores, jornada, checklists).

## Intenção

O painel deixa de ser só o funil de leads e passa a ser o consultório da Bianca: **a agenda principal dela**, o que cada paciente contratou e pagou, e os checklists do manual aparecendo no momento certo de cada paciente. O objetivo é que ela não precise de outra agenda, planilha ou checklist em papel para tocar a jornada descrita no manual, e que o painel lembre por ela o que vence (retorno, entrega em 48h, fim de plano, renovação, parcela).

## Objetivos

1. **Contratação ("Fechar plano")** a partir de um contato: serviço, valor, parcelas; o contato vira Paciente.
2. **Agenda** própria: consultas com data/hora/duração/formato/tipo/situação; visão semanal em lista; aviso de conflito; segunda-feira sinalizada como dia administrativo.
3. **Prazo do plano** contado a partir da **primeira consulta realizada**; contagem "consulta N de M"; sugestão de retorno em 30–45 dias.
4. **Financeiro só de entradas**: parcelas a receber/recebidas; mês com recebido, a receber, atrasado, por serviço, últimos 6 meses.
5. **Checklists por fase** com os itens do manual, editáveis; itens automáticos; pendências no Hoje.
6. **Hoje** ganha: consultas de hoje/amanhã, entregas atrasadas (48h), parcelas vencendo/atrasadas, pendências de checklist, retornos a agendar, planos terminando (≤10 dias), renovação da avulsa (dias 23–27).
7. **Mensagens prontas novas**: confirmação de consulta, lembrete de pagamento, renovação da avulsa (texto do manual).

## Não-objetivos (ficam para depois)

- Despesas, lucro, recibo/nota fiscal.
- Rotina semanal de check-ins (sexta/segunda) — vem com o check-in por link.
- Prontuário (anamnese, medidas, gráficos, anexos).
- Calendário arrastável, integração com Google Agenda, lembretes automáticos (sem API de WhatsApp; tudo continua por link wa/api.whatsapp + copiar).
- Política de faltas/cancelamento/reagendamento (pendência do manual) — o painel não aplica regra, só registra.

## Anti-objetivos

- Estourar o limite gratuito do Blob (10 mil operações simples/mês): **cada página do painel continua lendo no máximo 2 documentos**.
- O formulário público da lista de espera tocar em dado financeiro/clínico.
- A Bianca marcar a mesma coisa em dois lugares (ex.: confirmar consulta e depois o item "data confirmada").
- O Hoje virar um muro de avisos: cada seção curta, só o que pede ação.

## Restrições

- Next.js 16 App Router (ver `node_modules/next/dist/docs/`), React 19, TS, sem Tailwind; CSS em `app/painel/painel.css`.
- Armazenamento: camada `Documentos` existente (`lib/dados/documentos*.ts`) com concorrência otimista (`atualizarDocumento`, ETag forte). Sem banco novo. Usuário vai migrar de banco quando o uso chegar perto do limite.
- Autenticação: toda leitura/gravação do painel passa por `exigirSessao()` (padrão de `dados-painel.ts`).
- Datas de calendário `YYYY-MM-DD` em America/Sao_Paulo (`lib/contatos/datas.ts`); horas `HH:MM`.
- Dinheiro em **centavos inteiros**; exibição `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`.
- Textos de interface neutros em gênero (padrão já adotado).

## Abordagens consideradas

- **A) Tudo dentro de cada contato** (doc `contatos`). Menos leituras e "fechar plano" atômico, mas o formulário público passaria a regravar dados financeiros/clínicos e disputaria o mesmo documento com cliques da agenda. Rejeitada.
- **B) Doc novo `consultorio` + `config` separado.** Separação boa, mas o Hoje leria 3 documentos (~9 mil leituras/mês com uso intenso). Rejeitada pelo limite.
- **C) Doc `consultorio` que absorve as configurações** (mensagens, planos, modelos de checklist). 2 leituras por página (contatos + consultório), igual hoje; o público só toca em `contatos`. **Escolhida pelo usuário.**
- Um documento por paciente: descartado (Hoje leria N documentos).

## Desenho

### Armazenamento

`dados/consultorio.json` (via `Documentos`, nome `consultorio`):

```ts
type DocConsultorio = {
  versao: 1
  config: {
    modelos?: Partial<Modelos>            // mensagens personalizadas (antes em `config`)
    servicos: Servico[]                    // planos e valores
    checklists: Record<Fase, ItemModelo[]> // modelos de checklist
  }
  contratos: Record<string, Contrato>
  consultas: Record<string, Consulta>
}
```

**Migração:** na primeira leitura, se `consultorio` não existe, cria com `config.modelos` vindo do doc antigo `config` (se houver) + serviços e checklists padrão. O doc `config` antigo fica como cópia de segurança e não é mais lido. Mesmo padrão da migração de contatos (`atualizarDocumento` com `inicial`).

**Leituras por página:** Hoje, Agenda, Paciente, Financeiro = `contatos` + `consultorio`. Contatos e Ajustes podem ler só o que precisam. Ler o mesmo documento duas vezes na mesma requisição deve ser evitado (usar `cache()` do React por requisição se mais de um componente precisar).

### Serviços (planos)

```ts
type Servico = {
  id: string            // 'avulsa' | 'trimestral' | 'semestral' | novo id
  nome: string
  valorCentavos: number
  consultas: number     // 1, 3, 6
  prazo: { dias: number } | { meses: number } // avulsa 30 dias; tri 3 meses; sem 6 meses
  ativo: boolean        // desativado some do "Fechar plano", contratos antigos intactos
}
```

Padrão do manual: Avulsa R$ 280 / 1 consulta / 30 dias; Trimestral R$ 750 / 3 / 3 meses; Semestral R$ 1.380 / 6 / 6 meses. Editáveis em Ajustes → Planos (nome, valor, nº de consultas, prazo, ativo; criar novo).

### Contrato

```ts
type Contrato = {
  id: string
  contatoId: string
  servico: Servico          // cópia congelada no fechamento (valor/consultas/prazo da época)
  valorCentavos: number     // pode diferir do servico (desconto)
  parcelas: Parcela[]
  inicio?: string           // YYYY-MM-DD da 1ª consulta realizada; ausente = "aguardando 1ª consulta"
  encerradoEm?: string      // Bianca encerrou (ou renovou)
  canceladoEm?: string
  checklist: Record<string, string> // chave `${fase}:${itemId}` (ou `${fase}:${consultaId}:${itemId}` para retornos) → ISO de quando marcou
  criadoEm: string
}
type Parcela = {
  id: string
  valorCentavos: number
  vencimento: string        // YYYY-MM-DD
  forma: 'pix' | 'cartao' | 'dinheiro' | 'outro'
  recebidaEm?: string       // YYYY-MM-DD; presença = recebida
}
```

- **Fim do plano** = `inicio + prazo` (calculado, não gravado). Avulsa: +30 dias.
- **Situação calculada:** `aguardando` (sem início) → `ativo` → `terminando` (≤10 dias do fim) → `vencido` (passou do fim e não encerrado) → `encerrado`/`cancelado`.
- Um paciente pode ter vários contratos (histórico/renovação); no máximo um não encerrado/cancelado por vez. "Renovar" encerra o atual e abre o fluxo de fechar plano com o mesmo contato.
- Soma das parcelas deve bater com `valorCentavos` (validação no fechar plano; editar parcelas depois também valida).
- **Fechar plano** grava primeiro o contrato no `consultorio` e depois a etapa "Paciente" (com evento no histórico) em `contatos`. O formulário leva um id gerado no cliente/servidor ao renderizar (campo oculto); se o contrato com esse id já existe, não duplica — reenviar conserta uma falha no meio.

### Consultas (agenda)

```ts
type Consulta = {
  id: string
  contatoId: string
  contratoId?: string       // vinculada ao contrato ativo por padrão
  data: string              // YYYY-MM-DD
  hora: string              // HH:MM
  duracaoMin: number        // padrão 60
  formato: 'online' | 'presencial'
  tipo: 'primeira' | 'retorno' | 'encerramento' | 'avulsa'
  situacao: 'agendada' | 'confirmada' | 'realizada' | 'faltou' | 'desmarcada'
  criadoEm: string
  atualizadoEm: string
}
```

- Pode-se agendar para qualquer contato. Se o contato está em "Lista de espera" ou "Em conversa", agendar o move para "Consulta agendada" (evento no histórico).
- Tipo sugerido automaticamente: sem consulta realizada no contrato → `primeira` (ou `avulsa` se o serviço tem 1 consulta); última do contrato (tri/sem) → `encerramento`; senão `retorno`. Editável.
- **Marcar a primeira consulta de um contrato como realizada** define `contrato.inicio = consulta.data` (se ainda não definido). Voltar essa consulta para outra situação limpa o início se não houver outra realizada.
- **Contagem** "N de M": consultas realizadas do contrato / `servico.consultas`. `faltou` e `desmarcada` não consomem consulta (política de faltas ainda não definida no manual).
- **Sugestão de retorno** ao marcar realizada e ainda faltarem consultas: botão "Agendar próximo retorno" com data sugerida = data + 30, mostrando a janela 30–45 dias (limitada ao fim do plano).
- **Conflito:** consultas não desmarcadas que se sobrepõem no mesmo dia geram aviso no formulário; a Bianca pode salvar mesmo assim (confirmação explícita).
- **Segunda-feira:** aviso "segunda é dia administrativo" no formulário; não bloqueia.
- **Remarcar** = editar data/hora (não cria nova consulta). Desmarcar mantém o registro.

### Checklists

Fases e quando abrem (itens vêm do manual, Parte 5 + checklists das etapas 6 e 8):

| Fase | Abre | Fecha/some quando | Itens condicionais |
|---|---|---|---|
| `entrada` | ao fechar plano | todos marcados | — |
| `pre_consulta` | ao fechar plano | 1ª consulta realizada (pendências restantes continuam visíveis) | "Estrutura do Mapa" só tri/sem |
| `primeira_consulta` | 1ª consulta realizada | todos marcados | "Mapa discutido" só tri/sem |
| `entrega` | 1ª consulta realizada | todos marcados; **prazo 48h** a partir de data+hora da consulta | Mapa, Guia de Decisões, E-book só tri/sem; kit de boas-vindas só sem |
| `retorno_antes` | por consulta de retorno agendada/confirmada | consulta realizada | — |
| `retorno_depois` | por consulta de retorno realizada | todos marcados | — |
| `encerramento` | tri/sem: 10 dias antes do fim; avulsa: dia 23 do ciclo | contrato encerrado | Relatório de evolução só sem; "Consulta de encerramento" só tri/sem |

```ts
type ItemModelo = {
  id: string
  texto: string
  servicos?: string[]   // ausente = vale para todos; senão ids de serviço
  auto?: 'pagamento' | 'consulta_confirmada' | 'proximo_agendado'
}
```

**Itens padrão** (texto do manual; `[tri/sem]` = só trimestral e semestral; `[sem]` = só semestral; `[avulsa]` = só avulsa; `(auto: x)` = automático):

- `entrada`: Pagamento confirmado (auto: pagamento) · Grupo individual criado · Material de boas-vindas enviado · Kit de boas-vindas enviado [sem] · Contrato assinado · Pré-anamnese preenchida · Cadastro no aplicativo concluído · Data da consulta confirmada (auto: consulta_confirmada)
- `pre_consulta`: Pré-anamnese revisada · Exames disponíveis analisados · Aplicativo conferido · Prioridades e dúvidas organizadas · Primeira estrutura do Mapa Nutricional + Rota de Ação [tri/sem]
- `primeira_consulta`: Acolhimento e avaliação realizados · Metas iniciais definidas · Mapa discutido [tri/sem] · Próximos passos explicados
- `entrega` (prazo 48h): Plano alimentar finalizado · Guia de Industrializados e lista de compras · Mapa Nutricional + Rota de Ação [tri/sem] · Guia de Decisões Alimentares [tri/sem] · E-book de receitas [tri/sem] · Materiais conferidos com o que foi discutido · Entrega enviada pelo WhatsApp · Registro no prontuário  *(desdobrar "materiais do plano" nos materiais da tabela da Etapa 5 é decisão nossa, para o checklist já dizer o que enviar em cada plano)*
- `retorno_antes`: Revisar o prontuário e as metas anteriores · Conferir check-ins e feedbacks desde a última consulta · Revisar diário alimentar e informações do aplicativo · Conferir evolução de peso, medidas e indicadores · Identificar dificuldades e avanços · Separar os assuntos prioritários
- `retorno_depois`: Atualizar o prontuário com evolução, dificuldades e condutas · Registrar as novas metas · Atualizar o plano alimentar, quando necessário · Enviar materiais e orientações combinados · Próxima consulta confirmada (auto: proximo_agendado) · Atualizar a frequência dos check-ins
- `encerramento` [tri/sem]: Revisar o prontuário desde a primeira consulta · Comparar a avaliação inicial com os dados atuais · Revisar metas alcançadas, dificuldades e estratégias que funcionaram · Conferir medidas e indicadores relevantes · Identificar pontos que ainda precisam de atenção · Preparar os pontos principais da consulta de encerramento · Consulta de encerramento realizada · Relatório de Evolução Nutricional entregue [sem] · Continuidade conversada · Renovação formalizada ou ciclo encerrado
- `encerramento` [avulsa]: Último check-in enviado e avaliado (dias 23–27) · Continuidade conversada · Renovação formalizada ou ciclo encerrado

**Renovação da avulsa (modelo `renovacao_avulsa`, Etapa 10 do manual):**
> Oii, {nome}! 💚 Estamos chegando ao final dos nossos 30 dias de acompanhamento e queria saber como você está se sentindo com tudo o que construímos até aqui.
>
> Pelo seu feedback, podemos avaliar se faz sentido continuarmos com mais um período de acompanhamento ou se, neste momento, você se sente segura para seguir com as estratégias que trabalhamos.
>
> Se quiser continuar, posso te explicar as opções para darmos sequência ao seu acompanhamento!

- **Automáticos:** `pagamento` = alguma parcela do contrato recebida; `consulta_confirmada` = 1ª consulta confirmada ou realizada; `proximo_agendado` = existe consulta futura não desmarcada do contrato. Itens automáticos aparecem marcados e não são clicáveis.
- Marcar/desmarcar item grava no `contrato.checklist`. Editar modelos (Ajustes → Checklists): renomear, adicionar, remover, reordenar por fase, escolher serviços. Item removido some (marcações antigas ignoradas); item novo aparece desmarcado.
- Os itens da seção "Acompanhamento" do manual (check-ins, feedbacks) ficam de fora até a fase de check-in.

### Telas

Abas: **Hoje · Agenda · Contatos · Financeiro · Ajustes** (Ajustes = Mensagens + Planos + Checklists; a rota `/painel/mensagens` redireciona). Barra inferior no celular com 5 itens.

- **Hoje** (ordem): Consultas de hoje e amanhã (com mensagem de confirmação e botões Confirmada/Realizada/Faltou) → Atrasos (entregas >48h, parcelas atrasadas/vencendo hoje com mensagem de lembrete) → Pendências de checklist (agrupadas por paciente: "Júlia: contrato assinado, pré-anamnese") → Retornos a agendar (contrato ativo com consultas faltando e sem consulta futura) → Planos terminando (≤10 dias) e renovação da avulsa (dias 23–27, com a mensagem do manual) → seções atuais (retomar, novos, aniversários, próximos dias). Seções vazias não aparecem.
- **Agenda:** semana (seg–dom) em lista com setas e "hoje"; `?semana=YYYY-MM-DD`; segunda rotulada "dia administrativo"; botão "+ Nova consulta" (escolhe contato com busca). Cada consulta abre edição (situação, data/hora, duração, formato, tipo).
- **Página do contato/paciente:** bloco "Plano atual" (serviço, situação, "consulta 2 de 3", início/fim, próximas consultas, parcelas com "recebi"), checklist da fase atual aberto e fases concluídas recolhidas, histórico de planos; botões "Fechar plano" (sem contrato ativo), "Agendar consulta", "Encerrar acompanhamento", "Renovar".
- **Fechar plano:** serviço (valor preenchido), valor editável, à vista ou N parcelas (padrão: valor dividido igualmente, vencimentos mensais a partir de hoje, todos editáveis), forma por parcela, "já recebi a primeira" opcional.
- **Financeiro:** mês com setas (`?mes=YYYY-MM`); Recebido no mês (soma `recebidaEm` no mês) · A receber no mês (vencimento no mês, não recebidas) · Atrasado (vencimento < hoje, não recebidas, qualquer mês, com nomes) · Contratos fechados no mês por serviço (quantidade e valor) · lista de recebimentos · barras dos últimos 6 meses (recebido). Faturamento = regime de caixa (quando recebe).
- **Ajustes:** Mensagens (existente + 3 modelos novos), Planos, Checklists.

### Mensagens novas

Modelos `confirmacao`, `pagamento`, `renovacao_avulsa`, com variáveis novas `{data}` ("terça, 25/11"), `{hora}`, `{formato}`, `{valor}`, `{vencimento}`. `preencher` passa a aceitar um contexto extra. Texto da renovação da avulsa = mensagem do manual (Etapa 10), com `[nome]` → `{nome}`.

### Integridade com o id do contato

Hoje o id do contato muda quando o e-mail muda (`atualizarDados` move para `idPorEmail`). Como contratos e consultas guardam `contatoId`, a troca de id passa a ser **obrigatoriamente acompanhada** no consultório (decisão nossa, para nunca atribuir dados de um paciente a outra pessoa que se inscreva depois com o e-mail antigo):

1. Grava no `consultorio` as referências `id antigo → id novo` (se o contato tem contrato/consulta).
2. Grava a mudança em `contatos`.
3. Se o passo 2 falhar (ex.: e-mail em uso), desfaz o passo 1. Se o passo 1 falhar, a troca de e-mail não acontece e a Bianca vê o erro.

Sem `idsAnteriores`: referência do consultório sempre aponta para o id atual.

### Casos de borda (decisões nossas)

- **Consulta marcada antes de fechar o plano** (lead em conversa): ao fechar plano, consultas do contato **sem contrato** e não desmarcadas, de até 30 dias atrás em diante, são vinculadas ao novo contrato; se alguma já estiver realizada, ela define o `inicio`. Ao agendar para quem não tem contrato, o tipo sugerido é `primeira`.
- **Pacientes que já existiam antes desta fase:** entram pelo "Fechar plano" normal; o formulário aceita vencimentos e recebimentos em datas passadas e tem a opção **"acompanhamento já em andamento"** com data de início manual. Nesse caso as fases `entrada`, `pre_consulta`, `primeira_consulta` e `entrega` já nascem concluídas (não geram pendência). Hoje, os avisos de atraso só olham os últimos 60 dias para não virar muro.
- **Cancelar contrato:** pergunta o que fazer com parcelas não recebidas; padrão "não vou mais receber" (somem do a receber/atrasado e dos lembretes). Contrato `vencido` (passou do fim sem encerrar) mantém as parcelas pendentes normalmente e aparece no Hoje como "encerrar ou renovar".

### CSV

Exportação de contatos ganha "Plano atual" e "Situação do plano". (Exportar financeiro fica para depois.)

## Decidido pelo usuário

- Painel é a agenda principal, enxuta (lista por dia/semana, sem arrastar).
- Financeiro só entradas (faturamento).
- Checklists entram nesta fase, por fase, com itens automáticos e editáveis.
- Rotina semanal de check-ins fica para depois.
- Armazenamento opção C; usuário acompanha o uso do Blob e migra de banco quando necessário.
- **Nova etapa "Plano vencido"** (`plano_vencido`), entre "Paciente" e "Sem interesse no momento". O contato vai para ela quando a Bianca **encerra** o acompanhamento sem renovar ou **cancela** o contrato. Contrato que passa do fim sem ação continua no Hoje como "encerrar ou renovar" até ela decidir (a etapa só muda por ação dela; nada muda sozinho em leitura). Fechar plano / renovar a partir dela volta para "Paciente". Ganha modelo de mensagem próprio ("Oi, {nome}! Faz um tempinho que não nos falamos…" — texto padrão nosso, editável), entra no filtro de Contatos, no CSV e conta como etapa com "retomar em". Ao encerrar, o formulário sugere "retomar em 90 dias".

### Cartão parcelado (decisão nossa; usuário não definiu)

No "Fechar plano", forma **cartão** tem duas opções: **"recebo tudo de uma vez"** (1 parcela com valor cheio, vencimento no dia) ou **"recebo mês a mês"** (N parcelas mensais). Parcelas de cartão **nunca** geram lembrete de pagamento para o paciente (quem cobra é a operadora); continuam aparecendo como "a receber" no Financeiro.

## Deixado para quem constrói

- Layout fino das telas (seguindo o estilo atual do painel), textos de botões e mensagens vazias.
- Formato exato dos ids novos (seguir `novoId`).
- Organização em arquivos/módulos (sugestão: `lib/consultorio/` com tipos, serviço puro e testes, como `lib/contatos/`).
- Como evitar leitura dupla na mesma requisição.
