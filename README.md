# Bianca Oliveira · Nutrição

Site da Bianca com lista de espera e um mini-CRM privado (`/painel`).

- **Site:** Next.js 16 (App Router). O visual é uma cópia fiel de [`mockups/a-editorial.html`](mockups/a-editorial.html).
- **Dados:** Vercel Blob em modo **privado**, um documento JSON por coleção: `dados/contatos.json` (leads e pacientes) e `dados/consultorio.json` (agenda, planos, parcelas, checklists e ajustes). Veja [Armazenamento](#armazenamento).
- **Painel:** `/painel`, protegido por senha, com sessão de 30 dias. Não há link para ele no site.
  - **Hoje:** consultas de hoje e amanhã, atrasos (entrega em 48h, parcelas), pendências do checklist, retornos a agendar, planos terminando, renovação da avulsa, conversas para retomar, novos na lista e aniversários.
  - **Agenda:** semana em lista, nova consulta, aviso de conflito de horário, segunda marcada como dia administrativo.
  - **Contatos:** lista, busca, filtro por etapa e exportação para planilha.
  - **Contato:** mensagem pronta para o WhatsApp, "Fiz contato hoje", plano (fechar, renovar, encerrar, cancelar), consultas "N de M", parcelas, checklist por fase e histórico.
  - **Financeiro:** recebido no mês (regime de caixa), a receber, atrasos, planos fechados e últimos 6 meses.
  - **Ajustes:** mensagens (`{nome}`, `{nome_completo}`, `{objetivo}`, `{data}`, `{hora}`, `{formato}`, `{valor}`, `{vencimento}`), planos e valores, modelos de checklist.
  - O prazo do plano conta a partir da **primeira consulta realizada** (manual "Consultório 2027").
- Design e plano: [`docs/superpowers/`](docs/superpowers/).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha ADMIN_PASSWORD e SESSION_SECRET
npm run dev                  # http://localhost:3000
npm test                     # testes (Vitest)
```

Sem `BLOB_READ_WRITE_TOKEN`, os dados ficam em `.data/` (fora do git). Para testar o build de produção localmente sem Blob: `npm run build && ARMAZENAMENTO=arquivo npx next start`.

## Armazenamento

O plano grátis do Vercel Blob limita **operações por mês** (cerca de 10 mil leituras e 2 mil gravações/listagens). Se estourar, a Vercel bloqueia o Blob por 30 dias, o que derruba o painel e o formulário. Por isso:

- Cada coleção é **um único documento JSON**. Abrir uma tela do painel custa 1 ou 2 leituras, e cada salvamento custa 1 gravação. Salvar sem mudança não grava nada.
- Gravações usam **ETag** (`ifMatch`): se duas gravações acontecerem ao mesmo tempo (ex.: inscrição pelo site enquanto a Bianca edita), a segunda relê e reaplica, sem perder dados.
- O formato antigo (`contatos/<id>.json`, um arquivo por contato) é migrado sozinho na primeira leitura. Os arquivos antigos ficam como backup.
- `dados/consultorio.json` nasce na primeira abertura do painel com os planos e checklists do manual e com as mensagens que estavam em `dados/config.json` (que fica como backup e deixa de ser lido). Cada tela lê no máximo os dois documentos.
- Ao trocar o e-mail de um contato, o id dele muda; planos e consultas são levados para o id novo antes, e devolvidos se a edição falhar.

Acompanhe o uso em **Vercel → Storage → (o Blob) → Usage**.

## Publicar na Vercel (uma vez só)

1. **Importar o projeto:** em [vercel.com/new](https://vercel.com/new), escolha o repositório `financefly-ia/nutribiancaoliveira`. O framework é detectado sozinho (Next.js). Clique em **Deploy**.
2. **Criar o Blob:** no projeto, abra **Storage → Create Database → Blob**, dê um nome (ex.: `bianca-contatos`) e clique em **Connect** para ligá-lo ao projeto. A Vercel cria a variável `BLOB_READ_WRITE_TOKEN` automaticamente.
3. **Variáveis de ambiente:** em **Settings → Environment Variables**, adicione para *Production* e *Preview*:
   | Nome | Valor |
   |---|---|
   | `ADMIN_PASSWORD` | a senha que a Bianca vai usar no painel |
   | `SESSION_SECRET` | uma string aleatória longa. Para gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NEXT_PUBLIC_SITE_URL` | *(opcional)* o domínio final, ex.: `https://nutribiancaoliveira.com.br` |
4. **Refazer o deploy:** em **Deployments**, abra o último deploy, clique em **⋯ → Redeploy** e confirme. É isso que faz as variáveis valerem.
5. **Testar:** abra o site no celular, entre na lista de espera com um contato de teste e confira em `/painel`.

A partir daí, todo `git push` na branch `main` publica o site automaticamente.

> **Trocar a senha:** altere `ADMIN_PASSWORD` e faça o redeploy. Para derrubar todas as sessões abertas, troque também o `SESSION_SECRET`.

## Instalar o painel no celular da Bianca

O painel pode ficar na tela inicial do celular como se fosse um app, com o ícone BO.

**iPhone (Safari)**
1. Abra `https://<endereço-do-site>/painel` e entre com a senha.
2. Toque em **Compartilhar** (o quadrado com a seta para cima).
3. Toque em **Adicionar à Tela de Início** e depois em **Adicionar**.

**Android (Chrome)**
1. Abra `https://<endereço-do-site>/painel` e entre com a senha.
2. Toque no menu **⋮**.
3. Toque em **Adicionar à tela inicial** (ou **Instalar app**) e confirme.

Ela entra com a senha uma vez e continua logada por 30 dias.

## Estrutura

```
app/                     páginas (site, privacidade, painel) e API
  api/lista-espera/      POST da lista de espera
  painel/                login, mini-CRM e exportação CSV
components/site/         seções do site e formulário
components/painel/       topo, badge e formulários do painel
lib/contatos/            tipos, validação, regras, datas, mensagens, armazenamento e CSV
lib/dados/               documentos JSON com gravação condicional (Blob / arquivo / memória)
lib/auth/                sessão (cookie assinado) e proteção do painel
tests/                   testes Vitest
mockups/                 protótipos HTML (só referência, fora do site)
```
