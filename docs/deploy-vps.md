# Deploy numa VPS (Ubuntu + Docker)

Guia para colocar o ReformAI no ar numa VPS comum (Hetzner, DigitalOcean, Contabo, AWS Lightsail…)
com **um domínio**, TLS automático e tudo em containers. Tempo: ~30 min.

Tamanho: 2 vCPU / 4 GB / 40 GB atendem uma administradora. Com Julia-1 e OCR (ambos em CPU),
prefira 4 vCPU / 8 GB.

## 1. Pré-requisitos

- VPS com Ubuntu 22.04 ou 24.04 e acesso SSH como root (ou sudo).
- Um domínio ou subdomínio apontando para o IP da VPS (registro **A**, ex.: `reformai.suaempresa.com.br`).
  Espere o DNS propagar antes do passo 5 (o TLS depende disso).
- Portas 80 e 443 liberadas no firewall do provedor.

## 2. Preparar a máquina

```bash
# como root
apt update && apt upgrade -y
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copia sua chave SSH

# firewall
apt install -y ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw --force enable

# docker (script oficial)
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Saia e entre de novo como `deploy` (`ssh deploy@SEU_IP`). Confira: `docker compose version`.

## 3. Baixar o código

```bash
git clone https://github.com/kafune/reformai-reformado.git ~/reformai
cd ~/reformai
```

Atualizações futuras: `git pull` e o passo 7.

## 4. Configurar o `.env`

```bash
cp .env.example .env
nano .env
```

Preencha assim (o `docker-compose.prod.yml` sobrescreve `DATABASE_URL` e `S3_ENDPOINT` para
apontar aos containers; os demais valores vêm daqui):

```bash
DOMAIN="reformai.suaempresa.com.br"          # usado pelo Caddy
AUTH_URL="https://reformai.suaempresa.com.br" # links de e-mail e QR
AUTH_SECRET="$(openssl rand -base64 32)"      # cole o resultado do comando
POSTGRES_PASSWORD="senha-forte-do-banco"

S3_BUCKET="reformai"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="reformai"
S3_SECRET_ACCESS_KEY="senha-forte-do-minio"
S3_FORCE_PATH_STYLE="true"

# opcionais
SMTP_URL="smtp://usuario:senha@smtp.seuprovedor.com:587"
MAIL_FROM="ReformAI <no-reply@suaempresa.com.br>"
JULIA_URL="http://julia:8000"     # só se subir com --profile julia
OCR_URL="http://ocr:8080"         # só se subir com --profile ocr
```

`chmod 600 .env`. Nunca commite esse arquivo.

## 5. Subir

```bash
docker compose -f docker-compose.prod.yml up -d --build
# com Julia-1 e OCR (a primeira subida baixa os modelos; leva alguns minutos):
# docker compose -f docker-compose.prod.yml --profile julia --profile ocr up -d --build
```

Acompanhe: `docker compose -f docker-compose.prod.yml logs -f app caddy`. O Caddy emite o
certificado sozinho quando o DNS já aponta para a VPS.

## 6. Banco e primeiro acesso

```bash
# migrations (repita a cada atualização)
docker compose -f docker-compose.prod.yml exec app ./node_modules/.bin/prisma migrate deploy

# primeira conta da administradora
docker compose -f docker-compose.prod.yml exec app node -e '
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("./lib/generated/prisma/client");
const { scryptSync, randomBytes } = require("node:crypto");
const [name, email, password] = process.argv.slice(1);
const salt = randomBytes(16).toString("hex");
const hash = "scrypt$" + salt + "$" + scryptSync(password, salt, 64).toString("hex");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
db.user.create({ data: { name, email, passwordHash: hash, role: "ADMIN" } }).then(() => { console.log("ok"); process.exit(0); });
' "Seu Nome" "voce@suaempresa.com.br" "uma-senha-forte"
```

Abra `https://SEU_DOMINIO`, entre, troque a senha em **Minha conta** e siga:
**Condomínios → Novo condomínio → unidades (ou importar) → Novo síndico → Imprimir cartaz**.

Checagem rápida: `curl -fsS https://SEU_DOMINIO/api/health` → `{"status":"ok"}`.

## 7. Atualizar

```bash
cd ~/reformai && git pull
docker compose -f docker-compose.prod.yml up -d --build app
docker compose -f docker-compose.prod.yml exec app ./node_modules/.bin/prisma migrate deploy
```

## 8. Backup

Dois dados importam: o banco e os arquivos.

```bash
# banco (diário, guarde 14 dias) — crontab -e:
0 3 * * * cd ~/reformai && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U reformai reformai | gzip > ~/backups/db-$(date +\%F).sql.gz && find ~/backups -name 'db-*.gz' -mtime +14 -delete

# arquivos: o volume minio-data (copie com rsync/rclone para fora da VPS)
docker run --rm -v reformai_minio-data:/data -v ~/backups:/backup alpine tar czf /backup/minio-$(date +%F).tgz /data
```

Restaurar o banco: `gunzip -c db-AAAA-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U reformai reformai`.

## 9. Operação e problemas comuns

| Sintoma | O que ver |
|---|---|
| Site não abre / certificado inválido | DNS ainda não aponta para a VPS; `docker compose … logs caddy` |
| `/api/health` devolve `db_unreachable` | `docker compose … logs postgres`; senha em `.env` diferente da do volume já criado |
| Upload falha ("Não foi possível salvar o arquivo") | `docker compose … logs app minio`; bucket não criado → suba o `minio-init` de novo |
| Documento sem texto extraído | `OCR_URL` vazio ou serviço `ocr` fora; PDF com camada de texto não precisa de OCR |
| Sem caixa roxa da Julia-1 | `JULIA_URL` vazio ou serviço `julia` ainda carregando (`/health` dele) |
| E-mail não chega | `SMTP_URL` errado; veja `docker compose … logs app` ("E-mail: falha ao enviar") |

Console do MinIO (se precisar olhar os arquivos): `ssh -L 9001:localhost:9001 deploy@SEU_IP` depois de
publicar a porta 9001 do serviço `minio` apenas em `127.0.0.1:9001:9001`. Nunca exponha o bucket
publicamente: o app só serve arquivos por URL assinada de 1 hora.

Segurança básica: mantenha `apt upgrade` em dia, use chave SSH (desabilite senha em
`/etc/ssh/sshd_config`), e guarde o `.env` fora do repositório.
