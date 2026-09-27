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

Checagens: `bun test` · `bun run lint` · `bun run typecheck`.
