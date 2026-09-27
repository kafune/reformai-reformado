# Deploy

O app é um único container Next.js (Node) + PostgreSQL + um bucket S3-compatível. Julia-1, OCR e
e-mail são opcionais: sem as variáveis, o app funciona só com as regras.

## 1. Infra

| Serviço | Obrigatório | Exemplos |
|---|---|---|
| PostgreSQL 16 | sim | RDS, Neon, Supabase, container próprio |
| Bucket S3-compatível | sim | AWS S3, Cloudflare R2, MinIO |
| Julia-1 (`JULIA_URL`) | não | container do `docker compose --profile julia` na mesma rede |
| OCR (`OCR_URL`) | não | container do `docker compose --profile ocr` na mesma rede |
| SMTP (`SMTP_URL`) | não | Resend, Postmark, SES, qualquer SMTP |

## 2. Variáveis de ambiente

Copie `.env.example` e preencha. Em produção:

- `AUTH_SECRET`: `openssl rand -base64 32`. `AUTH_URL`: a URL pública (usada nos links de e-mail e no QR).
- `DATABASE_URL`: com `?sslmode=require` se o provedor exigir.
- `S3_*`: bucket **privado**. Nada é servido direto do bucket; o app gera URLs assinadas de 1h.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (opcional): se rodar mais de uma instância do app.

## 3. Build e subida

```bash
docker build -t reformai .
docker run --rm --env-file .env reformai ./node_modules/.bin/prisma migrate deploy   # migrations
docker run --rm --env-file .env reformai ./node_modules/.bin/prisma db seed          # só em ambiente de demo
docker run -d --name reformai --env-file .env -p 3000:3000 --restart unless-stopped reformai
curl -fsS http://localhost:3000/api/health     # {"status":"ok"}
```

Coloque um proxy com TLS na frente (Caddy, Nginx, o load balancer da nuvem). Upload de documento
vai até 20 MB: ajuste `client_max_body_size` (Nginx) ou equivalente.

## 4. Primeiro acesso

Sem seed, o banco nasce vazio e não há como logar. Crie a primeira conta da administradora:

```bash
docker run --rm -it --env-file .env reformai node -e '
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("./lib/generated/prisma/client");
const { scryptSync, randomBytes } = require("node:crypto");
const [name, email, password] = process.argv.slice(1);
const salt = randomBytes(16).toString("hex");
const hash = "scrypt$" + salt + "$" + scryptSync(password, salt, 64).toString("hex");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
db.user.create({ data: { name, email, passwordHash: hash, role: "ADMIN" } }).then(() => { console.log("ok"); process.exit(0); });
' "Nome" "admin@empresa.com.br" "senha-forte"
```

Depois, pelo app: **Condomínios → Novo condomínio → unidades → síndico → imprimir cartaz**.

## 5. Operação

- Health check: `GET /api/health` (app + banco).
- Backups: Postgres (dados) e bucket (documentos). O texto extraído dos documentos fica no banco.
- LGPD: cada usuário baixa os próprios dados e exclui a conta em **Minha conta** (anonimização; obras e histórico ficam).
- Logs: `console.error` para falhas de storage, OCR, Julia-1 e e-mail; nenhuma delas derruba a ação do usuário.
- Teste de fumaça (opcional): `bun run test:e2e` contra uma instância com o seed (ver `e2e/README.md`).
