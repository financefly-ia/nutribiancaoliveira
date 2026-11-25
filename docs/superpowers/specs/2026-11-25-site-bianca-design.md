# Site Bianca Oliveira · Nutrição — Design

**Data:** 2026-11-25
**Status:** aprovado pelo Juan em 2026-11-25 (conversa)

## Intenção

A Bianca está se formando em Nutrição e quer, antes de começar a atender, um site sofisticado que:
1. a apresente (história, visão e forma de trabalhar), com os textos que ela mesma escreveu;
2. capture uma **lista de espera** de futuras pacientes;
3. dê a ela um **mini-CRM** privado para acompanhar cada contato, desde a lista de espera até virar paciente, e cadastrar contatos que chegam por outros canais. Ela não usa nenhuma ferramenta hoje; este é o primeiro sistema dela.

A maioria das visitas virá do **celular** (link do Instagram/WhatsApp). O mobile é a experiência principal, não uma adaptação.

## Objetivos

- Reproduzir **fielmente** o mockup escolhido: [mockups/a-editorial.html](../../../mockups/a-editorial.html) (Opção A — Editorial). Cores, tipografia, espaçamentos, animações e textos idênticos.
- Formulário de lista de espera funcional, salvando no Vercel Blob.
- Mini-CRM privado em `/painel` para a Bianca.
- Deploy contínuo: push no GitHub (`financefly-ia/nutribiancaoliveira`), deploy automático na Vercel.

## Não-objetivos

- Agendamento, pagamentos, blog, área da paciente.
- **Fase 2 (fora desta entrega):** agenda de consultas, histórico clínico, lembretes automáticos.
- Excluir contatos pelo painel (decisão do Juan).
- E-mails automáticos ou notificações (pode vir depois).
- CMS para editar textos (os textos ficam no código).

## Anti-objetivos (seria fracasso mesmo funcionando)

- Ficar visualmente diferente do mockup ou com cara de template genérico.
- Ficar ruim, lento ou com rolagem horizontal no celular.
- Dados das inscritas (nome, e-mail, WhatsApp) acessíveis publicamente.
- Perder inscrições sem que a pessoa perceba (erro silencioso).

## Abordagens consideradas

| Abordagem | Trade-off | Decisão |
|---|---|---|
| **Next.js (App Router) + Vercel Blob** | Um projeto só: site, API e painel. Formato nativo da Vercel, imagens otimizadas. | **Escolhida** (aprovada pelo Juan) |
| HTML estático + funções serverless soltas | Simples no início; painel com login vira gambiarra. | Descartada |
| Next.js + Neon (Postgres) | Melhor para consultas complexas; exagero para uma lista de espera. | Descartada; o Juan prefere o Blob (500 MB) |

## Decisões tomadas

### Visual (fonte da verdade = `mockups/a-editorial.html`)
- Paleta: Marrom `#4A2E27`, Terracota `#A85A47`, Laranja `#D7875B`, Bege `#DCC6B4`, Off-white `#F8F6F1`, Papel `#F1E9E0`.
- Fontes: Playfair Display (títulos) e Montserrat (textos), via `next/font/google`, com os mesmos pesos do mockup.
- Monograma "BO" + folha recriados em SVG (como no mockup).
- Foto: `bianca-recorte.webp` (fundo removido) no hero; `bianca.jpg` (original) na seção Sobre.
- Seções, em ordem: Nav fixa → Hero (arco terracota + selo girando) → faixa de palavras-chave → Sobre + 3 pilares → Método (4 etapas, fundo marrom) → Convite (terracota) → Formulário → Rodapé.
- O CSS do mockup é portado como está (CSS global ou CSS Modules) — **sem trocar por Tailwind**, para garantir fidelidade.

### Mobile
- Testado em 360, 390 e 430 px de largura, sem rolagem horizontal.
- No celular: foto primeiro, texto depois (como no mockup); etapas do método em 1 coluna abaixo de 560 px; formulário com campos em 1 coluna.
- Campos com `font-size` ≥ 16 px (evita o zoom automático do iPhone ao focar); teclado certo por campo (`type="email"`, `inputmode="tel"`).
- Áreas de toque de pelo menos 44 px; animações respeitam `prefers-reduced-motion`.
- Foto otimizada via `next/image` (tamanhos responsivos, prioridade no hero).

### Formulário / API
- Campos (todos obrigatórios): nome completo, e-mail, WhatsApp (máscara `(00) 00000-0000`), objetivo principal (texto livre).
- **Consentimento LGPD (aprovado pelo Juan):** caixa obrigatória acima do botão, no estilo do formulário: "Autorizo o uso dos meus dados para contato sobre os atendimentos, conforme a [Política de Privacidade]." O envio é bloqueado sem ela (cliente e servidor). A data/hora do aceite é gravada. Esta é a **única diferença visual** em relação ao mockup.
- Página `/privacidade`: política curta e clara (quais dados, para quê, por quanto tempo, como pedir remoção pelo e-mail/WhatsApp da Bianca), no mesmo visual. Link no formulário e no rodapé.
- `POST /api/lista-espera`: valida no servidor (formato de e-mail, WhatsApp com 10–11 dígitos, limites de tamanho) e grava.
- Estados na tela: enviando (botão desabilitado), sucesso (mensagem do mockup), erro (mensagem amigável + manter os dados digitados).
- Anti-spam: campo "honeypot" invisível; inscrições com ele preenchido são descartadas em silêncio.
- **Duplicadas:** a chave do registro é derivada do e-mail (hash). Se a pessoa se inscrever de novo, o registro é atualizado (mantém a data original, atualiza os dados).

### Armazenamento (Vercel Blob)
- Um arquivo JSON por contato: `contatos/<id>.json`. Para inscrições do site, `id` = hash do e-mail (reinscrição atualiza o mesmo contato). Para contatos manuais, `id` aleatório; se um contato manual tiver e-mail igual a uma inscrição, a inscrição atualiza esse contato em vez de duplicar.
- Formato do registro:
  ```
  { id, nome, email?, whatsapp, objetivo?, origem: "site"|"instagram"|"indicacao"|"outro",
    etapa: "lista"|"conversa"|"agendada"|"paciente"|"sem_interesse",
    notas: [{ texto, criadoEm }], consentimentoEm?, criadoEm, atualizadoEm }
  ```
  Na reinscrição pelo site, etapa e notas **não** são sobrescritas.
- Os dados só são lidos pelo servidor (painel). Usar acesso **privado** do Blob se disponível no SDK atual; senão, acesso público com caminho não adivinhável (hash + sufixo aleatório) e a URL nunca exposta ao navegador.
- Token `BLOB_READ_WRITE_TOKEN` configurado pela Vercel ao conectar o Blob Store ao projeto.

### Mini-CRM `/painel`
- Login com uma única senha (`ADMIN_PASSWORD`, variável de ambiente na Vercel). Sessão em cookie `httpOnly`, `secure`, assinado (`SESSION_SECRET`), válida por 30 dias.
- **Acesso (aprovado pelo Juan):** endereço próprio `/painel`, **nenhum link no site**. O painel tem manifest/ícone (monograma BO) para ser "Adicionado à tela inicial" no celular dela, abrindo como um app. A entrega inclui instruções curtas para iPhone e Android.
- Topo: contador por etapa (Lista de espera · Em conversa · Consulta agendada · Paciente · Sem interesse) e quantas entraram pelo site nos últimos 7 dias.
- Lista de contatos (mais recente primeiro) com filtro por etapa e busca por nome/e-mail/WhatsApp/objetivo.
- Detalhe do contato: todos os dados, origem, objetivo, data de entrada; trocar etapa com um toque; adicionar anotação datada (histórico de notas, mais recente primeiro); editar nome/e-mail/WhatsApp/objetivo/origem.
- Botão "+ Novo contato": cadastro manual (nome e WhatsApp obrigatórios; e-mail, objetivo e origem opcionais; etapa inicial escolhível).
- Botão WhatsApp por contato (abre `wa.me/55...`) e "Exportar planilha" (CSV para Excel, UTF-8 com BOM, respeitando o filtro atual).
- Sem exclusão de contatos.
- Mesmo visual do site (paleta/fontes), **pensado para celular** (ela vai olhar pelo celular): cartões em vez de tabela no mobile.
- `noindex` no painel.

### Extras
- Metadados para SEO e prévia bonita ao compartilhar no WhatsApp/Instagram (Open Graph com imagem).
- Favicon com o monograma.
- Página 404 simples no mesmo estilo.

## Restrições

- Hospedagem: Vercel (plano gratuito), Blob Store de 500 MB.
- Repositório: `https://github.com/financefly-ia/nutribiancaoliveira`; a Vercel puxa os commits da branch principal.
- Idioma: português do Brasil.
- Estado atual: o repositório no GitHub está **vazio e público** (checado em 2026-11-25). O projeto na Vercel está sendo criado pelo Juan.
- Configuração manual na Vercel (feita pelo Juan, com passo a passo entregue junto): conectar o repositório, criar/ligar o Blob Store, definir `ADMIN_PASSWORD` e `SESSION_SECRET`.
- Domínio: ainda indefinido. A URL base vem de `NEXT_PUBLIC_SITE_URL`, com fallback para `VERCEL_PROJECT_PRODUCTION_URL`, para que as prévias de WhatsApp/Instagram funcionem já no `*.vercel.app` e depois no domínio próprio sem mexer no código.
- Desenvolvimento local: sem token do Blob, a API grava num arquivo local (`.data/`, fora do git), para dar para testar tudo antes da Vercel.

## Fica a critério de quem constrói

- Estrutura de pastas/componentes do Next.js.
- CSS global vs CSS Modules (desde que o resultado seja idêntico).
- Biblioteca de validação (ou validação manual).
- Detalhes de implementação da assinatura do cookie.
- Testes: validação da API e do login; checagem visual por screenshot (desktop + mobile) comparando com o mockup.

## Decisões minhas (para o Juan conferir)

1. Inscrição repetida com o mesmo e-mail **atualiza** em vez de duplicar (sem mexer em etapa e notas).
2. Nomes das etapas do CRM e lista de origens.
3. Os textos que eu escrevi no mockup (descrições curtas das 4 etapas, pilares, faixa de palavras, mensagem de sucesso) entram como estão até a Bianca revisar.
4. A pasta `mockups/` fica no repositório como referência, mas fora do site publicado.
