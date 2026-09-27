# ReformAI (versão simples)

Plataforma web de **uma** administradora de condomínios para controlar reformas nas unidades:
o morador cadastra a obra, o sistema diz se exige ART/RRT e quais documentos, o morador anexa,
síndico/administradora confere e libera. **A plataforma não emite ART/RRT.** Fonte de verdade: `PLAN.md`.

## Decisões tomadas (PLAN.md §2)
- Uma administradora só: sem Tenant/Organization; `ADMIN` vê todos os condomínios.
- Sem parceiro técnico, sem vistoria: o morador traz o próprio profissional; guardamos nome, registro e nº da ART/RRT.
- Sem comercial/pagamento. Sem dados legados (banco vazio + seed).
- Decisões pela **Julia-1** (`lib/decision.ts`); regras de `lib/rules/` são o **piso** (ela só aumenta exigências).
  Liberar/recusar é sempre clique humano. Sem `JULIA_URL`/`OCR_URL`, tudo funciona só com regras. **Sem Claude** (decidido na Fase 7).

## Princípios (PLAN.md §4)
1. Código chato ganha. Função simples > classe > padrão de projeto.
2. Sem abstração antes do segundo uso. Uma implementação = nenhuma interface. Sem repositório, use case, provider, factory, eventos.
3. Regras de negócio em funções puras em `lib/rules/` (sem Prisma, sem Next), com teste. Único lugar com teste obrigatório.
4. Julia-1 decide dentro de trilhos: nunca reduz nível, nunca dispensa ART/documento da tabela; toda decisão vira `CaseEvent` com contexto, resposta e justificativa.
5. Permissão sempre no servidor: toda leitura/ação de obra passa por `getCaseForUser()` / `assertCan()`.
6. Tudo que muda uma obra gera um `CaseEvent`. Sem exceção.
7. Arquivos nunca são públicos: download só por URL assinada de curta duração.

## Stack
Bun · Next.js 16 (App Router, TS strict) · Tailwind 4 + shadcn/ui (componentes copiados em `components/ui/`) ·
PostgreSQL + Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) · Auth.js v5 (`next-auth@beta`, JWT, e-mail/senha com `scrypt`) ·
S3 via `@aws-sdk/client-s3` (MinIO local) · Zod · `bun:test` (só `lib/`). Sem Redis, sem fila.

## Comandos
```
bun dev            # app em http://localhost:3000
docker compose up  # Postgres :5432 + MinIO :9000 (console :9001)
bun run typecheck  # tsc --noEmit
bun run lint       # eslint
bun test           # runner do Bun, só lib/**/*.test.ts (bunfig.toml)
bun run db:migrate | db:seed | db:generate | db:studio
```
Use sempre `bun`/`bunx`, nunca npm/npx/yarn. Copie `.env.example` para `.env`. Os scripts `db:*` rodam o CLI do
Prisma sob o Bun (`bunx --bun prisma`) para que o `.env` seja lido sem dotenv. Demo (seed): admin@demo.com,
sindico@demo.com, morador@demo.com — senha `senha123`.

## Estrutura
```
app/(public)/login, cadastro/[signupCode]   app/(app)/obras, obras/nova, obras/[id], obras/[id]/imprimir, art, admin
app/api/files/[documentId]/route.ts         # route handler: checa permissão e redireciona para URL assinada (1h)
lib/db.ts auth.ts (getCurrentUser) password.ts permissions.ts (can/assertCan/getCaseForUser) format.ts
lib/storage.ts (uploadFile/signedDownloadUrl) events.ts (logEvent) protocol.ts
lib/extract-text.ts (unpdf → OCR) ocr.ts (PaddleOCR serving: só fetch + Zod)
lib/decision.ts (Julia-1: só fetch + Zod + perguntas tipadas; testes com fetch mockado) julia.ts (cola com o banco: classifyWithRules, maybeJudgeDocument, maybeRecommendRelease)
lib/rules/   services.ts risk.ts checklist.ts status.ts merge.ts art.ts document-checks.ts (+ *.test.ts)   # PURO
lib/actions/ auth.ts signup.ts cases.ts documents.ts review.ts admin.ts  # "use server", finas; state.ts = ActionState
  (review.ts: reviewDocument, requestChanges, approveCase, rejectCase, confirmCompletion — sempre clique humano)
components/case/ (tela da obra: form, documentos, responsável técnico, envio, timeline)
components/ui/ (shadcn)  components/ (da tela)   prisma/schema.prisma seed.ts   docs/telas/ (mockups, referência)
```

## Padrão de server action (todas seguem isso)
```ts
export async function approveCase(caseId: string, input: unknown) {
  const user = await getCurrentUser();                 // 1. quem é
  const data = ApproveSchema.parse(input);             // 2. valida (Zod)
  const c = await getCaseForUser(user, caseId);        // 3. pode ver?
  assertCan(user, "review", c);                        // 4. pode fazer?
  assertCanApprove(c, docs, data.artConfirmed);        // 5. regra pura (lib/rules)
  await db.$transaction(async (tx) => { /* update + logEvent(tx, ...) */ }); // 6. grava + CaseEvent
  revalidatePath(`/obras/${caseId}`);                  // 7. revalida
}
```

## Convenções
- Código em inglês, textos de tela em português do Brasil. Server Components para leitura, Server Actions para mutação.
- Tokens de cor (status, risco, Julia-1 em roxo) em `app/globals.css`; mockups e screenshots em `docs/telas/` (PLAN.md §14).
- Botão bloqueado sempre diz o que falta. Cada exigência mostra a origem: "pela tabela" ou "pela Julia-1: motivo".
- Mobile first: tudo funciona em 390px; tabelas rolam dentro do card. Formulários: client component + `useActionState`;
  a action devolve `ActionState`. Upload passa pela server action (`bodySizeLimit` 25mb). Erro de storage vira mensagem.
- Julia-1 (docs/julia-1-api.md): modelo de decisão tipado (choice/score/noul, probabilidades), não gera texto nem lê
  arquivos. Decisão 1 (classificação) ao salvar a obra via `mergeClassification`; Decisão 2 (parecer do documento) no
  upload, com o texto extraído (docs/ocr.md) e os achados de `document-checks.ts`; Decisão 3 (recomendação) quando todos
  os documentos foram avaliados. 2 e 3 só pré-preenchem. Sugestão de serviços = um `noul` por serviço. A justificativa
  gravada é pergunta → opção → probabilidade. Sem `JULIA_URL`, nada é chamado.
- Não implementar nada da §13 (backlog) sem pedido. Em dúvida sobre o PLAN.md, perguntar.
