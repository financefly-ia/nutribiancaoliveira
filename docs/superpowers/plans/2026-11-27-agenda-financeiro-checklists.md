# Agenda, Financeiro e Checklists — Plano (básico)

> Execução nativa (nesta sessão). Usuário pediu plano enxuto.

**Spec:** `docs/superpowers/specs/2026-11-27-agenda-financeiro-checklists-design.md`

**Arquitetura:** módulo novo `lib/consultorio/` (tipos, padrões do manual, store do documento `consultorio` com migração de `config`, regras puras, serviço de mutações), consumido por páginas server-side do painel. Página lê no máximo `contatos` + `consultorio` (este via `cache()` por requisição).

## Restrições globais
- 2 leituras de documento por página; dinheiro em centavos; datas `YYYY-MM-DD` SP; horas `HH:MM`.
- Toda action chama `exigirSessao()`; leitura via `dados-painel.ts`.
- Textos neutros em gênero; mensagens em PT-BR.

## Foco de revisão
1. Trocar e-mail de paciente com contrato não pode perder/atribuir errado contratos e consultas.
2. Fechar plano reenviado (duplo clique/retry) não duplica contrato.
3. Parcelas: soma = valor, resto dos centavos na 1ª; cancelar dispensa pendentes.
4. Fim do plano por meses em dia 29–31 (ex.: 31/01 + 1 mês → 28/02).
5. Hoje não lista coisas de planos encerrados/cancelados nem atrasos com mais de 60 dias.

## Tarefas
1. **Domínio** — `lib/consultorio/{tipos,padroes,store,regras,dinheiro}.ts` + testes (`tests/consultorio-regras.test.ts`): fim do plano, situação, início derivado da 1ª realizada (ou manual), contagem N de M, checklist por fase com itens condicionais/automáticos, pendências, itens do Hoje, resumo financeiro, parse/format de reais, migração de `config`.
2. **Mutações** — `lib/consultorio/servico.ts` + testes (`tests/consultorio-servico.test.ts`): fecharPlano (idempotente, vincula consultas soltas, renovação), registrar/desfazer recebimento, cancelar (dispensa), encerrar, agendar/editar consulta (conflito com `forcar`), mudar situação, marcar item, salvar serviços/checklists; mover referências de contato (troca de e-mail com desfazer).
3. **Contatos** — etapa `plano_vencido`, `moverEtapaSe`, `atualizarDados` aceita id aleatório injetado; mensagens com modelos novos e variáveis extras lendo do `consultorio`; CSV com plano.
4. **Telas** — abas (Hoje, Agenda, Contatos, Financeiro, Ajustes); Agenda semanal; formulário de consulta; Fechar plano; bloco Plano + Checklist na página do contato; Financeiro; Ajustes (mensagens/planos/checklists); Hoje com seções novas; CSS.
5. **Verificação** — vitest, tsc, eslint, build de produção, e2e local (playwright) no celular e desktop, deploy e checagem pós-deploy.
