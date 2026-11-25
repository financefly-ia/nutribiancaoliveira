# Site Bianca Oliveira + Mini-CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o site da Bianca (cópia fiel do mockup A, mobile-first) com lista de espera gravando no Vercel Blob e um mini-CRM privado em `/painel`.

**Architecture:** Um app Next.js (App Router, TypeScript). O site é a tradução do `mockups/a-editorial.html` em componentes React com o CSS do mockup portado literalmente. Os dados ficam numa camada `lib/contatos` com um `ContatoStore` intercambiável (Blob privado em produção, arquivo local em dev, memória nos testes). O painel usa Server Components + Server Actions protegidos por cookie de sessão assinado (HMAC).

**Tech Stack:** Next.js 16.x, React 19, TypeScript, `@vercel/blob` 2.x (`access: 'private'`), Vitest 5.x, `next/font/google`, `next/image`. Sem Tailwind.

**Spec:** [docs/superpowers/specs/2026-11-25-site-bianca-design.md](../specs/2026-11-25-site-bianca-design.md). Referência visual: [mockups/a-editorial.html](../../../mockups/a-editorial.html).

## Global Constraints

- Fidelidade visual: cores, fontes, espaçamentos, animações e textos **idênticos** a `mockups/a-editorial.html`. Única diferença permitida no site: a caixa de consentimento LGPD no formulário (+ link "Política de Privacidade" no rodapé).
- Paleta: `--marrom:#4A2E27; --terracota:#A85A47; --laranja:#D7875B; --bege:#DCC6B4; --off:#F8F6F1; --papel:#F1E9E0`.
- Fontes: Playfair Display (400, 500, 600, itálico 400/500) e Montserrat (300, 400, 500, 600) via `next/font/google`, expostas como `--serif` e `--sans`.
- Mobile: sem rolagem horizontal em 360/390/430 px; inputs com `font-size` ≥ 16px; alvos de toque ≥ 44px; `prefers-reduced-motion` desliga animações (marquee, selo, reveal).
- Idioma `pt-BR` em todo texto visível, mensagens de erro inclusive.
- Dados de contato nunca chegam ao navegador fora do `/painel` autenticado; Blob sempre com `access: 'private'`.
- Variáveis de ambiente: `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` (opcional; fallback `VERCEL_PROJECT_PRODUCTION_URL`, depois `http://localhost:3000`).
- Etapas (valor → rótulo): `lista`→"Lista de espera", `conversa`→"Em conversa", `agendada`→"Consulta agendada", `paciente`→"Paciente", `sem_interesse`→"Sem interesse no momento".
- Origens: `site`→"Site", `instagram`→"Instagram", `indicacao`→"Indicação", `outro`→"Outro".
- Sem exclusão de contatos em nenhum lugar.
- Git: repositório `https://github.com/financefly-ia/nutribiancaoliveira` (vazio), branch `main`. Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **WhatsApp em formatos variados** (`+55 (11) 98888-7777`, `11988887777`, `5511988887777`, com espaços) → normalizado para 10–11 dígitos sem DDI; link `wa.me/55<dígitos>` sempre correto. Teste em Task 2.
2. **E-mail com maiúsculas/espaços** (`" Ana@Gmail.com "`) → mesmo contato que `ana@gmail.com` (sem duplicar). Teste em Task 2 e Task 4.
3. **Reinscrição de alguém que a Bianca já está acompanhando** → atualiza nome/whatsapp/objetivo mas **preserva** `etapa`, `notas`, `origem` e `criadoEm`. Teste em Task 4.
4. **Falha do Blob ao gravar** → API responde 500 com `{ erro: "Não foi possível enviar agora. Tente novamente em instantes." }`; o formulário mantém o que foi digitado. Teste em Task 5 (API) e verificação manual em Task 6.
5. **Texto livre com vírgulas, aspas, quebras de linha, acentos e emoji** → CSV abre correto no Excel (BOM UTF-8, separador `;`, campos entre aspas com `""` escapado). Teste em Task 8.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, .gitignore, .env.example, README.md
public/images/bianca-recorte.webp, public/images/bianca.jpg, public/og.jpg
public/painel.webmanifest, public/icons/icon-192.png, public/icons/icon-512.png, public/icons/apple-touch-icon.png
app/layout.tsx                 fontes, metadata global, <html lang="pt-BR">
app/icon.svg                   favicon (monograma)
app/globals.css                reset + tokens (:root) — vindo do mockup
app/(site)/site.css            CSS do mockup A, literal
app/(site)/page.tsx            home: compõe as seções
app/(site)/privacidade/page.tsx
app/not-found.tsx
app/api/lista-espera/route.ts  POST inscrição
components/site/SvgDefs.tsx    <symbol id="folha">, <symbol id="bo">, gradiente
components/site/Monograma.tsx  <svg><use href="#bo"/></svg>
components/site/Nav.tsx        (client) classe .scrolled
components/site/Reveal.tsx     (client) IntersectionObserver para .reveal
components/site/Hero.tsx, Marquee.tsx, Sobre.tsx, Metodo.tsx, Convite.tsx, Footer.tsx
components/site/WaitlistForm.tsx (client) máscara, consentimento, estados
lib/config.ts                  siteUrl(), CONTATO_BIANCA (e-mail/Instagram p/ política)
lib/contatos/types.ts          Contato, Etapa, Origem, Nota, rótulos
lib/contatos/normalizar.ts     normalizarEmail, normalizarWhatsapp, idPorEmail, novoId
lib/contatos/validacao.ts      validarInscricao, validarContatoManual
lib/contatos/store.ts          interface ContatoStore + memoryStore
lib/contatos/store-file.ts     fileStore (dev)
lib/contatos/store-blob.ts     blobStore (prod)
lib/contatos/get-store.ts      getStore()
lib/contatos/servico.ts        regras de negócio
lib/contatos/csv.ts            contatosParaCsv
lib/auth/session.ts            criarToken, verificarToken
lib/auth/guard.ts              exigirSessao(), sessaoValida()
app/painel/layout.tsx          visual do painel, manifest, noindex
app/painel/painel.css
app/painel/login/page.tsx + actions.ts
app/painel/page.tsx            lista + contadores + filtro + busca
app/painel/novo/page.tsx
app/painel/contato/[id]/page.tsx
app/painel/actions.ts          server actions (criar, editar, etapa, nota, sair)
app/painel/exportar/route.ts   GET CSV
tests/*.test.ts
```

---

### Task 1: Projeto Next.js, git e assets

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `public/images/*`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Produces: scripts `npm run dev`, `npm run build`, `npm test` (vitest run), alias `@/*` → raiz.

- [ ] **Step 1:** `git init -b main` na raiz; `git remote add origin https://github.com/financefly-ia/nutribiancaoliveira.git`.
- [ ] **Step 2:** Criar o app com `npx create-next-app@16 . --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm` (a pasta já tem `mockups/` e `docs/`; se o CLI recusar pasta não-vazia, gerar em pasta temporária e mover os arquivos). Remover o conteúdo de exemplo de `app/page.tsx`/`globals.css`.
- [ ] **Step 3:** `npm i @vercel/blob@2` e `npm i -D vitest@5 @vitest/coverage-v8`; `vitest.config.ts` com `environment: 'node'`, `include: ['tests/**/*.test.ts']`, alias `@` → raiz; script `"test": "vitest run"`.
- [ ] **Step 4:** `.gitignore` inclui `.env*` (exceto `.env.example`), `.data/`, `.vercel`, `opcoes-site-bianca.zip`. `.env.example` lista as 4 variáveis das Global Constraints com comentário em pt-BR.
- [ ] **Step 5:** Copiar `mockups/assets/bianca-recorte.webp` e `mockups/assets/bianca.jpg` para `public/images/`. Configurar `next.config.ts` com `outputFileTracingExcludes` (ou equivalente) para não empacotar `mockups/`.
- [ ] **Step 6:** `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Rodar `npm test` → PASS; `npm run build` → sucesso.
- [ ] **Step 7:** Commit `chore: scaffold Next.js app with mockups and spec`.

---

### Task 2: Tipos, normalização e validação

**Files:**
- Create: `lib/contatos/types.ts`, `lib/contatos/normalizar.ts`, `lib/contatos/validacao.ts`
- Test: `tests/normalizar.test.ts`, `tests/validacao.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Etapa = 'lista'|'conversa'|'agendada'|'paciente'|'sem_interesse'
  type Origem = 'site'|'instagram'|'indicacao'|'outro'
  type Nota = { texto: string; criadoEm: string }            // ISO
  type Contato = { id: string; nome: string; email?: string; whatsapp: string; objetivo?: string;
    origem: Origem; etapa: Etapa; notas: Nota[]; consentimentoEm?: string; criadoEm: string; atualizadoEm: string }
  const ETAPAS: { valor: Etapa; rotulo: string }[]   // ordem das Global Constraints
  const ORIGENS: { valor: Origem; rotulo: string }[]
  normalizarEmail(s: string): string                   // trim + lowercase
  normalizarWhatsapp(s: string): string                // só dígitos; remove DDI 55 se resultar 12–13 dígitos
  idPorEmail(email: string): string                    // sha256 hex (node:crypto) do e-mail normalizado, 32 primeiros chars
  novoId(): string                                     // 'm' + randomUUID sem hífens
  type Resultado<T> = { ok: true; dados: T } | { ok: false; erros: Record<string, string> }
  validarInscricao(input: unknown): Resultado<{ nome; email; whatsapp; objetivo; consentimento: true }>
  validarContatoManual(input: unknown): Resultado<{ nome; whatsapp; email?; objetivo?; origem: Origem; etapa: Etapa }>
  ```
- Regras: nome 2–120 chars; e-mail regex simples `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤ 160; WhatsApp normalizado com 10 ou 11 dígitos; objetivo 3–1500 chars; `consentimento === true` obrigatório na inscrição. Mensagens: `nome: "Informe seu nome completo."`, `email: "Informe um e-mail válido."`, `whatsapp: "Informe um WhatsApp com DDD."`, `objetivo: "Conte qual é o seu principal objetivo."`, `consentimento: "É preciso autorizar o uso dos dados para entrar na lista."`. Strings são `trim()`adas.

- [ ] **Step 1: Testes que falham**
  ```ts
  test('normaliza whatsapp em vários formatos', () => {
    for (const v of ['+55 (11) 98888-7777','11988887777','5511988887777',' 11 98888 7777 '])
      expect(normalizarWhatsapp(v)).toBe('11988887777')
    expect(normalizarWhatsapp('(21) 3333-4444')).toBe('2133334444')
  })
  test('email com maiúsculas e espaços gera o mesmo id', () => {
    expect(idPorEmail(' Ana@Gmail.com ')).toBe(idPorEmail('ana@gmail.com'))
    expect(idPorEmail('ana@gmail.com')).toHaveLength(32)
  })
  test('inscrição válida', () => {
    const r = validarInscricao({ nome:' Ana Souza ', email:'ANA@x.com', whatsapp:'(11) 98888-7777', objetivo:'Emagrecer com saúde', consentimento:true })
    expect(r).toEqual({ ok:true, dados:{ nome:'Ana Souza', email:'ana@x.com', whatsapp:'11988887777', objetivo:'Emagrecer com saúde', consentimento:true } })
  })
  test('inscrição sem consentimento e com whatsapp curto', () => {
    const r = validarInscricao({ nome:'Ana', email:'a@b.co', whatsapp:'9888', objetivo:'abc', consentimento:false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['consentimento','whatsapp'])
  })
  test('input não-objeto é rejeitado sem lançar', () => { expect(validarInscricao(null).ok).toBe(false) })
  test('contato manual: email opcional, origem/etapa default', () => {
    const r = validarContatoManual({ nome:'Bia', whatsapp:'11988887777' })
    expect(r).toEqual({ ok:true, dados:{ nome:'Bia', whatsapp:'11988887777', origem:'outro', etapa:'lista' } })
  })
  test('contato manual rejeita etapa inválida', () => {
    expect(validarContatoManual({ nome:'Bia', whatsapp:'11988887777', etapa:'xpto' }).ok).toBe(false)
  })
  ```
- [ ] **Step 2:** `npm test` → FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar os três arquivos conforme Interfaces.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: contato types, normalization and validation`.

---

### Task 3: Armazenamento (`ContatoStore`)

**Files:**
- Create: `lib/contatos/store.ts`, `lib/contatos/store-file.ts`, `lib/contatos/store-blob.ts`, `lib/contatos/get-store.ts`
- Test: `tests/store.test.ts`

**Interfaces:**
- Consumes: `Contato` (Task 2).
- Produces:
  ```ts
  interface ContatoStore { get(id: string): Promise<Contato | null>; put(c: Contato): Promise<void>; list(): Promise<Contato[]> }
  memoryStore(): ContatoStore
  fileStore(dir = '.data/contatos'): ContatoStore         // um JSON por id
  blobStore(): ContatoStore
  getStore(): ContatoStore   // BLOB_READ_WRITE_TOKEN definido → blobStore; NODE_ENV==='production' sem token → lança Error('BLOB_READ_WRITE_TOKEN ausente'); senão fileStore
  ```
- `blobStore`: caminho `contatos/<id>.json`; `put(path, JSON.stringify(c), { access:'private', addRandomSuffix:false, allowOverwrite:true, contentType:'application/json' })`; `get(path, { access:'private', useCache:false })` → ler `stream` com `new Response(stream).json()`, `null` se resultado `null`; `list({ prefix:'contatos/' })` paginando por `cursor` até `hasMore === false`, depois `get` de cada (em paralelo, lotes de 10). `list()` do store retorna ordenado por `criadoEm` desc.
- IDs validados com `/^[a-z0-9]{1,64}$/` antes de virar caminho (evita path traversal no fileStore).

- [ ] **Step 1: Testes que falham** (rodam contra `memoryStore()` e `fileStore(tmpdir)`)
  ```ts
  describe.each([['memory', () => memoryStore()], ['file', () => fileStore(mkdtempSync(join(tmpdir(),'ct-')))]])('%s', (_, mk) => {
    test('put/get/list ordenado por criadoEm desc', async () => {
      const s = mk(); await s.put(c('a','2026-01-01T00:00:00Z')); await s.put(c('b','2026-02-01T00:00:00Z'))
      expect((await s.get('a'))?.nome).toBe('Contato a')
      expect((await s.list()).map(x => x.id)).toEqual(['b','a'])
    })
    test('get inexistente → null', async () => expect(await mk().get('zzz')).toBeNull())
    test('id inválido é rejeitado', async () => await expect(mk().get('../x')).rejects.toThrow())
  })
  ```
  (`c(id, criadoEm)` = helper que monta um `Contato` mínimo.)
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `memoryStore`, `fileStore`, `blobStore`, `getStore`.
- [ ] **Step 4:** `npm test` → PASS. (blobStore é exercitado no smoke de produção da Task 9.)
- [ ] **Step 5:** Commit `feat: contato stores (memory, file, blob)`.

---

### Task 4: Serviço de contatos (regras de negócio)

**Files:**
- Create: `lib/contatos/servico.ts`
- Test: `tests/servico.test.ts`

**Interfaces:**
- Consumes: Task 2 (validação, normalização), Task 3 (`ContatoStore`).
- Produces (todas recebem `store` e `agora: Date = new Date()` como últimos parâmetros, para teste):
  ```ts
  registrarInscricao(input: unknown, store, agora?): Promise<Resultado<{ id: string }>>
  criarContatoManual(input: unknown, store, agora?): Promise<Resultado<{ id: string }>>
  atualizarDados(id: string, input: unknown, store, agora?): Promise<Resultado<{ id: string }>>  // nome/email/whatsapp/objetivo/origem
  mudarEtapa(id: string, etapa: string, store, agora?): Promise<Resultado<{ id: string }>>
  adicionarNota(id: string, texto: string, store, agora?): Promise<Resultado<{ id: string }>>  // 1–2000 chars, insere no início
  listarContatos(store, filtro?: { etapa?: Etapa; busca?: string }): Promise<Contato[]>
  resumo(contatos: Contato[], agora?): { porEtapa: Record<Etapa, number>; siteUltimos7Dias: number; total: number }
  ```
- `registrarInscricao`: id = `idPorEmail`. Se existir: atualiza `nome, email, whatsapp, objetivo, consentimentoEm, atualizadoEm`; preserva `etapa, notas, origem, criadoEm`. Se não: cria com `origem:'site', etapa:'lista', notas:[]`.
- `criarContatoManual`: se tiver e-mail e existir contato com `idPorEmail(email)` → erro `{ email: "Já existe um contato com este e-mail." }`; senão id = `idPorEmail(email)` quando houver e-mail (assim uma inscrição futura pelo site cai no mesmo contato), ou `novoId()`.
- Busca: sem acento e sem caixa (`normalize('NFD').replace(/\p{Diacritic}/gu,'')`) em nome, e-mail, whatsapp, objetivo.
- Id inexistente → `{ ok:false, erros:{ id:'Contato não encontrado.' } }`.

- [ ] **Step 1: Testes que falham**
  ```ts
  const base = { nome:'Ana Souza', email:'ana@x.com', whatsapp:'11988887777', objetivo:'Ganhar massa', consentimento:true }
  test('nova inscrição entra como lista/site', async () => {
    const s = memoryStore(); const r = await registrarInscricao(base, s, new Date('2026-12-01T10:00:00Z'))
    const c = await s.get(r.ok ? r.dados.id : '')
    expect(c).toMatchObject({ origem:'site', etapa:'lista', notas:[], consentimentoEm:'2026-12-01T10:00:00.000Z' })
  })
  test('reinscrição preserva etapa, notas, origem e criadoEm', async () => {
    const s = memoryStore(); const r = await registrarInscricao(base, s, new Date('2026-12-01T10:00:00Z'))
    const id = r.ok ? r.dados.id : ''
    await mudarEtapa(id, 'conversa', s); await adicionarNota(id, 'Liguei', s)
    await registrarInscricao({ ...base, email:' ANA@X.COM ', objetivo:'Novo objetivo' }, s, new Date('2026-12-05T10:00:00Z'))
    const c = (await s.get(id))!
    expect(c).toMatchObject({ etapa:'conversa', objetivo:'Novo objetivo', criadoEm:'2026-12-01T10:00:00.000Z' })
    expect(c.notas.map(n => n.texto)).toEqual(['Liguei'])
    expect((await s.list())).toHaveLength(1)
  })
  test('manual com e-mail e depois inscrição pelo site = mesmo contato', async () => {
    const s = memoryStore()
    await criarContatoManual({ nome:'Ana', whatsapp:'11988887777', email:'ana@x.com', origem:'instagram' }, s)
    await registrarInscricao(base, s)
    const all = await s.list(); expect(all).toHaveLength(1); expect(all[0].origem).toBe('instagram')
  })
  test('manual duplicado por e-mail é recusado', async () => {
    const s = memoryStore(); await criarContatoManual({ nome:'A', whatsapp:'11988887777', email:'a@x.com' }, s)
    const r = await criarContatoManual({ nome:'B', whatsapp:'11977776666', email:'A@x.com' }, s)
    expect(r).toEqual({ ok:false, erros:{ email:'Já existe um contato com este e-mail.' } })
  })
  test('notas mais recentes primeiro; nota vazia recusada', async () => { /* duas notas → ordem inversa; '' → ok:false */ })
  test('mudarEtapa inválida ou id inexistente', async () => { /* 'xpto' → ok:false; id 'nao' → erros.id */ })
  test('busca ignora acento e caixa; filtro por etapa', async () => { /* 'joao' acha 'João'; etapa:'paciente' filtra */ })
  test('resumo conta por etapa e site nos últimos 7 dias', () => { /* 3 contatos fixos → valores exatos */ })
  ```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `servico.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: contato service (signup, manual, stage, notes, search)`.

---

### Task 5: API `POST /api/lista-espera`

**Files:**
- Create: `app/api/lista-espera/route.ts`
- Test: `tests/api-lista-espera.test.ts`

**Interfaces:**
- Consumes: `registrarInscricao`, `getStore`.
- Produces: `POST` JSON `{ nome, email, whatsapp, objetivo, consentimento, site? }` (`site` = honeypot).
  - 200 `{ ok: true }` — sucesso **ou** honeypot preenchido (nada gravado).
  - 400 `{ ok: false, erros: Record<string,string> }` — validação; também para corpo não-JSON (`{ erros:{ geral:'Dados inválidos.' } }`).
  - 500 `{ ok: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' }` — exceção do store (logar com `console.error`).
- `export const dynamic = 'force-dynamic'`; corpo limitado a 10 KB (413 acima disso).

- [ ] **Step 1: Testes que falham** (mock de `@/lib/contatos/get-store` com `vi.mock` retornando um `memoryStore()` ou um store cujo `put` lança)
  ```ts
  test('200 e grava', ...)                       // depois, store.list() tem 1 contato
  test('400 com erros de campo', ...)           // whatsapp '12' → res.status 400, body.erros.whatsapp definido
  test('honeypot → 200 sem gravar', ...)        // site:'http://spam' → list() vazio
  test('corpo inválido → 400', ...)             // body 'xx' (não JSON)
  test('falha do store → 500 com mensagem amigável', ...)
  ```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar o route handler.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: waitlist API`.

---

### Task 6: Site público (port fiel do mockup A)

**Files:**
- Create: `app/layout.tsx`, `app/globals.css`, `app/(site)/site.css`, `app/(site)/page.tsx`, `app/(site)/privacidade/page.tsx`, `app/not-found.tsx`, `app/icon.svg`, `components/site/*.tsx`, `lib/config.ts`, `public/og.jpg`

**Interfaces:**
- Consumes: API da Task 5.
- Produces: `siteUrl(): string` (`NEXT_PUBLIC_SITE_URL` → `https://${VERCEL_PROJECT_PRODUCTION_URL}` → `http://localhost:3000`); `CONTATO_BIANCA = { email: string; instagram: string }` em `lib/config.ts` (valores fornecidos pelo Juan antes do deploy).

- [ ] **Step 1: CSS.** Copiar o bloco `<style>` de `mockups/a-editorial.html` para `app/(site)/site.css` **sem alterar valores**; `:root`/reset/`body` vão para `globals.css`. Trocar só: `--serif`/`--sans` passam a usar as variáveis do `next/font` (`var(--font-playfair)`, `var(--font-montserrat)`), `.field input,.field textarea{font-size:1rem}` garante ≥ 16px, e acrescentar `@media (prefers-reduced-motion: reduce){ .marquee div,.seal,.scroll-hint i{animation:none} .reveal{opacity:1;transform:none;transition:none} }`.
- [ ] **Step 2: Layout.** `app/layout.tsx`: `next/font/google` Playfair_Display e Montserrat com os pesos das Global Constraints; `metadata` com `metadataBase: new URL(siteUrl())`, title `"Bianca Oliveira · Nutrição"`, description `"Nutrição com estratégia, individualidade e propósito. Entre na lista de espera."`, `openGraph.images: ['/og.jpg']`, `locale: 'pt_BR'`; `viewport.themeColor: '#F1E9E0'`.
- [ ] **Step 3: Componentes.** Um componente por seção, com o markup do mockup convertido para JSX (classes iguais, textos iguais, `class`→`className`, `style` inline como objeto). `SvgDefs` renderizado uma vez na página. Imagens via `next/image`: recorte no hero com `priority` e `sizes="(max-width:900px) 90vw, 45vw"`; `bianca.jpg` no Sobre com `sizes="(max-width:900px) 100vw, 40vw"`. `Nav` e `Reveal` são client components replicando o `<script>` do mockup (scroll > 40 → `.scrolled`; IntersectionObserver threshold .15, delay `(i%4)*90ms`).
- [ ] **Step 4: Formulário.** `WaitlistForm` (client): mesma estrutura do mockup + honeypot (`<input name="site" tabIndex={-1} autoComplete="off">` escondido fora da tela, `aria-hidden`) + caixa de consentimento abaixo do textarea, estilizada no padrão `.field` (checkbox custom 20px com borda `--terracota`, label `.74rem`, alvo de toque ≥ 44px): texto **"Autorizo o uso dos meus dados para contato sobre os atendimentos, conforme a [Política de Privacidade](/privacidade)."** Máscara do WhatsApp igual ao mockup. Estados: enviando → botão desabilitado com texto "Enviando…"; 200 → classe `.sent` (mensagem de sucesso do mockup); 400 → mensagem sob cada campo (`.field .erro`, cor `--terracota`, `.75rem`); 500/rede → aviso acima do botão com a mensagem da API ou "Sem conexão. Verifique sua internet e tente novamente.", mantendo os valores.
- [ ] **Step 5: Privacidade, 404, ícones.** `/privacidade` no mesmo visual (nav + rodapé, coluna de texto `max-width: 720px`): quais dados (nome, e-mail, WhatsApp, objetivo), finalidade (contato sobre abertura de vagas e atendimentos), base legal (consentimento), armazenamento (Vercel, acesso restrito à Bianca), prazo (até a pessoa pedir remoção ou 2 anos sem contato), direitos (acesso, correção, remoção) e contato (`CONTATO_BIANCA`). Rodapé ganha link "Política de Privacidade" (`.meta`). `not-found.tsx`: monograma + "Página não encontrada" + link para início. `app/icon.svg` = monograma. `public/og.jpg` 1200×630 gerado com Pillow: fundo `#F1E9E0`, recorte da foto à direita sobre arco terracota, "Bianca Oliveira" + "Nutrição com estratégia, individualidade e propósito." à esquerda.
- [ ] **Step 6: Verificação visual.** `npm run dev`; capturar com Playwright (Edge) página inteira em 1440, 430, 390 e 360 px, e as mesmas larguras do mockup. Esperado: lado a lado idênticos (exceto consentimento/link de privacidade); script de overflow (`elementos com getBoundingClientRect().right > largura` fora de containers `overflow:hidden`) retorna vazio em 360/390/430.
- [ ] **Step 7: Verificação funcional.** Sem token do Blob: enviar o formulário no navegador → sucesso e arquivo em `.data/contatos/`; reenviar com WhatsApp `12` → erro no campo; parar o servidor e enviar → aviso de conexão com dados preservados.
- [ ] **Step 8:** `npm test` e `npm run build` → sucesso. Commit `feat: public site ported from mockup A with waitlist form`.

---

### Task 7: Sessão e login do painel

**Files:**
- Create: `lib/auth/session.ts`, `lib/auth/guard.ts`, `app/painel/login/page.tsx`, `app/painel/login/actions.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- Produces:
  ```ts
  criarToken(secret: string, agora?: Date): string            // `${expiraEmMs}.${hmacSha256Base64url(expiraEmMs)}`, validade 30 dias
  verificarToken(token: string | undefined, secret: string, agora?: Date): boolean   // timingSafeEqual; expirado/malformado → false
  COOKIE_SESSAO = 'bo_sessao'
  exigirSessao(): Promise<void>      // em Server Components/Actions/route handlers do painel; sem sessão → redirect('/painel/login')
  entrar(formData): Promise<{ erro?: string }>   // server action: compara ADMIN_PASSWORD com timingSafeEqual; ok → cookie httpOnly, secure em prod, sameSite 'lax', path '/painel', maxAge 30d; redirect('/painel')
  sair(): Promise<void>              // apaga cookie, redirect('/painel/login')
  ```
- Senha errada → `{ erro: 'Senha incorreta.' }` após atraso de 600 ms. `ADMIN_PASSWORD` ou `SESSION_SECRET` ausente → login mostra "Painel não configurado." (sem lançar).

- [ ] **Step 1: Testes que falham**
  ```ts
  test('token válido até 30 dias', () => {
    const t = criarToken('s', new Date('2026-01-01'))
    expect(verificarToken(t, 's', new Date('2026-01-30'))).toBe(true)
    expect(verificarToken(t, 's', new Date('2026-02-01'))).toBe(false)
  })
  test('secret diferente, adulterado, vazio → false', () => {
    const t = criarToken('s'); expect(verificarToken(t, 'outro')).toBe(false)
    expect(verificarToken(t.replace(/^\d/, '9'), 's')).toBe(false)
    expect(verificarToken(undefined, 's')).toBe(false); expect(verificarToken('lixo', 's')).toBe(false)
  })
  ```
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementar. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Página de login mobile-first: fundo `--papel`, monograma, "Painel" em Playfair, um campo de senha (16px, `autoComplete="current-password"`), botão `.btn-solid` largura total. Verificar no navegador: senha errada → mensagem; certa → `/painel`.
- [ ] **Step 6:** Commit `feat: painel session and login`.

---

### Task 8: Mini-CRM (`/painel`)

**Files:**
- Create: `app/painel/layout.tsx`, `app/painel/painel.css`, `app/painel/page.tsx`, `app/painel/novo/page.tsx`, `app/painel/contato/[id]/page.tsx`, `app/painel/actions.ts`, `app/painel/exportar/route.ts`, `lib/contatos/csv.ts`, `public/painel.webmanifest`, `public/icons/*`
- Test: `tests/csv.test.ts`

**Interfaces:**
- Consumes: serviço (Task 4), `exigirSessao`/`sair` (Task 7), `ETAPAS`/`ORIGENS` (Task 2).
- Produces:
  ```ts
  contatosParaCsv(contatos: Contato[]): string
  // '﻿' + cabeçalho 'Nome;E-mail;WhatsApp;Objetivo;Etapa;Origem;Entrou em;Última nota' + '\r\n' + linhas
  // todo campo entre aspas, aspas internas duplicadas; datas dd/mm/aaaa; etapa/origem pelos rótulos
  // server actions (todas chamam exigirSessao() e revalidatePath('/painel')):
  criarContatoAction(prev, formData) / atualizarDadosAction(id, prev, formData) / mudarEtapaAction(id, etapa) / adicionarNotaAction(id, prev, formData)
  ```
- Layout: `metadata.robots = { index:false, follow:false }`, `metadata.manifest = '/painel.webmanifest'`, `appleWebApp: { capable:true, title:'BO Painel', statusBarStyle:'default' }`; `exigirSessao()` em todas as páginas, exceto `/painel/login` (o login fica fora do grupo protegido: usar route group `app/painel/(app)/...` para as páginas protegidas, se necessário).
- Manifest: `name "Bianca Oliveira · Painel"`, `short_name "BO Painel"`, `start_url "/painel"`, `scope "/painel"`, `display "standalone"`, `background_color "#F1E9E0"`, `theme_color "#4A2E27"`, ícones 192/512 + apple-touch-icon 180 (monograma sobre `#F1E9E0`, gerados com Pillow).

- [ ] **Step 1: Teste CSV que falha**
  ```ts
  test('csv escapa e abre no Excel', () => {
    const csv = contatosParaCsv([contato({ nome:'João "Jo"', objetivo:'Perder 5kg; ganhar energia\nsem sofrer 💪', etapa:'conversa', origem:'indicacao', criadoEm:'2026-12-03T12:00:00Z', notas:[{ texto:'Liguei', criadoEm:'2026-12-04T00:00:00Z' }] })])
    expect(csv.startsWith('﻿Nome;E-mail;WhatsApp;Objetivo;Etapa;Origem;Entrou em;Última nota\r\n')).toBe(true)
    expect(csv).toContain('"João ""Jo"""'); expect(csv).toContain('"Perder 5kg; ganhar energia\nsem sofrer 💪"')
    expect(csv).toContain('"Em conversa";"Indicação";"03/12/2026";"Liguei"')
  })
  ```
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementar `csv.ts`. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Lista (`/painel`).** Server Component com `searchParams` `etapa` e `q`. Topo: monograma, "Olá, Bianca", botão "Sair". Chips horizontais roláveis com contadores (`resumo`): "Todos (n)", cada etapa "(n)"; linha "+n pelo site nos últimos 7 dias". Busca (form GET, input 16px). Botões "+ Novo contato" e "Exportar planilha" (link para `/painel/exportar?etapa=&q=`). Cartões (mobile) / linhas (≥ 900px): nome, etapa (badge na cor da etapa), origem, data, trecho do objetivo (2 linhas), botão WhatsApp (`https://wa.me/55${whatsapp}`, `target="_blank"`). Toque no cartão → detalhe. Vazio: "Nenhum contato ainda. Quando alguém entrar na lista de espera, aparece aqui."
- [ ] **Step 6: Detalhe (`/painel/contato/[id]`).** Dados completos; seletor de etapa como botões segmentados (um toque = `mudarEtapaAction`); WhatsApp e e-mail (`mailto:`) clicáveis; formulário de nota (textarea + "Adicionar nota") e histórico (data `dd/mm/aaaa hh:mm`, mais recente primeiro); seção "Editar dados" recolhível (`<details>`) com `atualizarDadosAction`; "Entrou pelo site em … · consentimento em …". Id inexistente → `notFound()`.
- [ ] **Step 7: Novo (`/painel/novo`).** Nome*, WhatsApp* (máscara), e-mail, objetivo, origem (select, default "Instagram"), etapa inicial (select, default "Lista de espera"); erros por campo vindos de `criarContatoManual`; sucesso → redirect para o detalhe.
- [ ] **Step 8: Exportar.** `GET /painel/exportar`: `exigirSessao` (sem sessão → 401), aplica filtros, responde `text/csv; charset=utf-8` com `Content-Disposition: attachment; filename="contatos-bianca-AAAA-MM-DD.csv"`.
- [ ] **Step 9: Verificação.** No navegador a 390 px e 1440 px: cadastrar manual, mudar etapa, anotar, buscar "joao" achando "João", filtrar etapa, exportar e abrir no Excel (acentos e quebras corretos), `/painel` sem cookie → login, `/painel/exportar` sem cookie → 401. Sem overflow horizontal a 360 px.
- [ ] **Step 10:** `npm test`, `npm run build`. Commit `feat: mini-CRM painel`.

---

### Task 9: Publicação (GitHub + Vercel) e guia

**Files:**
- Create: `README.md`

- [ ] **Step 1: README em pt-BR:** como rodar local (`npm i`, `cp .env.example .env.local`, `npm run dev`), variáveis, e o **passo a passo da Vercel**: importar o repo; Storage → Create → Blob → conectar ao projeto (gera `BLOB_READ_WRITE_TOKEN`); Settings → Environment Variables: `ADMIN_PASSWORD` (senha da Bianca) e `SESSION_SECRET` (gerar com `openssl rand -base64 32` ou `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`); redeploy. E **como instalar o painel no celular:** iPhone (Safari → abrir `/painel` → Compartilhar → "Adicionar à Tela de Início"); Android (Chrome → ⋮ → "Adicionar à tela inicial"/"Instalar app").
- [ ] **Step 2:** `npm test` e `npm run build` limpos. Commit `docs: README with Vercel setup and painel install guide`.
- [ ] **Step 3:** `git push -u origin main` (confirmar com o Juan antes do primeiro push, já que o repo é público).
- [ ] **Step 4: Smoke em produção** (após o Juan concluir a configuração na Vercel): abrir a URL no celular; inscrever um contato de teste; ver no `/painel`; marcar etapa "Sem interesse no momento" e anotar "teste" (não há exclusão); exportar CSV. Confirmar que a URL do blob não aparece em nenhuma resposta pública.
