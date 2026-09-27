# Julia-1 — como a API funciona (levantamento da Fase 6)

Levantado em 27/09/2026. A página oficial (<https://supersoniclabs.ia.br/julia-1/>) e o
model card no Hugging Face (`SupersonicLabs/Julia-1`) estavam bloqueados pela rede da
sessão; as fontes abaixo foram lidas na íntegra:

- `ViniciuszXL/julia-1-api` — wrapper REST comunitário (FastAPI) do runtime oficial em
  Python: `README.md`, `app/main.py`, `Dockerfile`, `.env.example`.
- `zm2231/julia-mlx` — port para Apple silicon com paridade verificada contra o runtime
  oficial: `README.md`, `julia_mlx/engine.py`, `julia_mlx/encoding.py`, `tests/test_parity.py`.
- Resumo de busca (notícias de lançamento, 26/09/2026).

## O que é

- Modelo de **decisão**, não de chat: 144M parâmetros (encoder mmBERT-small, multilíngue —
  português funciona), pesos Apache-2.0, roda em CPU (~34 ms por chamada, ~700 MiB de RAM).
- Dado um `state` (contexto em texto ou JSON) e perguntas tipadas, **escolhe uma opção
  entre 2 e 20 e devolve a probabilidade de cada uma**. Não gera texto. Não lê arquivos.
- API hospedada da Supersonic Labs: anunciada, **ainda não aberta ao público**. Sem
  endpoint, autenticação ou preço publicados. Custo hoje = só a infraestrutura de quem
  hospeda (2–4 CPUs, 2–4 GB).

## Como se usa (runtime oficial em Python, exposto pelo wrapper REST)

```
POST /v1/decide            Content-Type: application/json      (sem autenticação)
GET  /health               → {"status":"ok","model_loaded":true,"device":"cpu"}
```

Requisição:

```json
{
  "state": "texto ou objeto JSON com o contexto",
  "questions": {
    "risk_level":   { "type": "score",  "instructions": "Qual o nível de risco?", "criteria": ["LOW","MEDIUM","HIGH","CRITICAL"] },
    "requires_art": { "type": "noul",   "instructions": "A obra exige ART/RRT?", "criteria": { "false": "não exige", "true": "exige" } },
    "release":      { "type": "choice", "instructions": "O que fazer com a obra?",
                      "criteria": { "approve": "liberar", "approve_with_conditions": "liberar com condições", "request_changes": "pedir correção", "reject": "recusar" } }
  }
}
```

| Tipo | `criteria` | Resposta |
|---|---|---|
| `choice` | objeto `chave → descrição`, 2 a 20 | `choice`: chave vencedora |
| `score` | lista ordenada, 2 a 20 | `score`: nível esperado (índice ponderado, ex.: 2.3) |
| `noul` | opcional `{ "false": "…", "true": "…" }` | `noul`: probabilidade de `true` |

Resposta:

```json
{ "answers": {
    "risk_level":   { "type": "score",  "probabilities": [0.02, 0.10, 0.70, 0.18], "score": 2.04, "max_probability": 0.70 },
    "requires_art": { "type": "noul",   "probabilities": [0.09, 0.91], "noul": 0.91 },
    "release":      { "type": "choice", "probabilities": { "approve": 0.12, "approve_with_conditions": 0.61, "request_changes": 0.22, "reject": 0.05 }, "choice": "approve_with_conditions", "max_probability": 0.61 }
} }
```

## Limites

- 2 a 20 opções por pergunta; até 64 perguntas por requisição (wrapper).
- Contexto: `max_length` 8192 tokens no wrapper (a Supersonic avaliou com 1024); a
  "cabeça" da pergunta (instruções + opções) cabe em 512 tokens, cada opção em até 48.
  Com `strict_encoding=True` (padrão do wrapper), estourar o limite dá **erro**, não
  truncamento. Corpo da requisição ≤ 256 KB; `state` ≤ 100.000 caracteres.
- Wrapper: 60 requisições/min por IP, 2 inferências simultâneas; sem autenticação
  (colocar atrás de rede privada ou proxy com chave).
- Não aceita PDF/imagem. Só texto.

## Variáveis de ambiente do wrapper (lado servidor)

`MODEL_PROVIDER=julia`, `MODEL_ID=SupersonicLabs/Julia-1`, `MODEL_PATH`, `MODEL_DEVICE=cpu`,
`MODEL_CPU_THREADS`, `MODEL_MAX_CONCURRENCY`, `MODEL_RATE_LIMIT_RPM`, `MODEL_MAX_BODY_BYTES`.
Não existe doc de cliente; os nomes usados pelo app (`JULIA_URL`, `JULIA_TIMEOUT_MS`,
`JULIA_MIN_CONFIDENCE`) são nossos. Se a API hospedada abrir com chave, entra `JULIA_API_KEY`.

## Consequências para o PLAN.md §10.2

- A Julia **não escreve justificativa**: a "justificativa" gravada é a pergunta feita, a
  opção escolhida e as probabilidades (ex.: "nível ALTO, 70%"). Texto livre continua humano.
- A Julia **não lê documentos**: a decisão 2 (parecer do documento) só poderia olhar
  metadados (tipo, nome, tamanho, nº da ART informado). Ler o PDF fica com o Claude (Fase 7).
- Orientação extra de profissional (texto) e texto de condições: fora do alcance dela.
