# OCR dos documentos (PP-OCRv5, self-hosted)

Decidido na Fase 7 (revisada): em vez do Claude ler PDF/imagem, os documentos viram **texto** e o
texto entra no contexto da Julia-1 e nas checagens puras. Fluxo no upload (`lib/actions/documents.ts`):

1. PDF com camada de texto → `unpdf` lê direto (`lib/extract-text.ts`), sem OCR.
2. Imagem ou PDF escaneado → serviço de OCR por HTTP (`lib/ocr.ts`), síncrono, com timeout (`OCR_TIMEOUT_MS`, padrão 20 s).
3. Falhou ou sem `OCR_URL` → documento salvo sem texto; as checagens marcam "não foi possível ler".
4. `lib/rules/document-checks.ts` (puro, testado) confere nº da ART, registro e nome do profissional,
   serviços declarados, unidade/endereço e assinatura → `Document.checks`.
5. Julia-1 (Decisão 2, `lib/julia.ts#maybeJudgeDocument`) recebe o texto + os achados e sugere
   aprovar/reprovar → `Document.juliaVerdict`. Só pré-preenche a conferência do síndico/admin.

## Serviço

`docker/ocr/Dockerfile` empacota o serving oficial do PaddleOCR 3.x (PaddleX) com o pipeline `OCR`
e o reconhecedor **latin_PP-OCRv5_mobile_rec** (português). CPU, ~1–2 s por página.

```
docker compose --profile ocr up   # http://localhost:8080
OCR_URL="http://localhost:8080"    # no .env
```

Contrato (serving oficial do PaddleOCR 3.x):

```
POST /ocr   { "file": "<base64 do PDF ou imagem>", "fileType": 0 }   # 0 = PDF (até 10 páginas), 1 = imagem
→ { "errorCode": 0, "errorMsg": "Success",
    "result": { "ocrResults": [ { "prunedResult": { "rec_texts": ["…"], "rec_scores": [0.98] } } ] } }
```

> A imagem Docker não foi construída nem testada neste ambiente (sem acesso à internet para os
> modelos). O cliente (`lib/ocr.ts`) segue o contrato documentado e foi testado contra um serviço
> falso. Alternativas prontas se preferir não construir: `lukyanov/paddleocr-fastapi-docker`
> (endpoint `/api/v1/ocr/upload`, multipart) — exigiria trocar o cliente.

## Privacidade

Os documentos têm dados pessoais (morador, profissional). Por isso o OCR é self-hosted, na mesma rede
do app; nada vai para API externa. O texto extraído fica no banco (`Document.extractedText`, até
12.000 caracteres) e é apagado junto com o documento.
