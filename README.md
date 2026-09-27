# ReformAI (versão simples)

Plataforma web para uma administradora de condomínios controlar as reformas nas
unidades: saber quais obras exigem ART/RRT, orientar o morador sobre como
conseguir e conferir se ela foi entregue antes de liberar a obra.

**A plataforma não emite ART/RRT.** Quem emite é o profissional habilitado
contratado pelo morador.

- Plano completo, regras de negócio e fases: [`PLAN.md`](PLAN.md)
- Guia para quem codifica (princípios, estrutura, comandos): [`CLAUDE.md`](CLAUDE.md)
- Mockups de referência das telas: [`docs/telas/index.html`](docs/telas/index.html)

## Rodando local

```bash
cp .env.example .env
docker compose up -d        # Postgres + MinIO
bun install
bun run db:migrate          # aplica as migrations
bun run db:seed             # usuários demo (senha: senha123)
bun dev                     # http://localhost:3000
```

Serviços opcionais: `docker compose --profile julia up` (Julia-1, decisões) e `--profile ocr` (OCR dos documentos).

Checagens: `bun test` · `bun run lint` · `bun run typecheck` · `bun run test:e2e` (caminho feliz no navegador, ver `e2e/README.md`).

## Produção

Um container (`Dockerfile`) + Postgres + bucket S3. Passo a passo em [`docs/deploy.md`](docs/deploy.md).
Referências: [`docs/julia-1-api.md`](docs/julia-1-api.md), [`docs/ocr.md`](docs/ocr.md).
