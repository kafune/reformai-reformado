# Teste E2E (caminho feliz)

Um único teste (`happy-path.spec.ts`) percorre: morador cria a obra → responsável técnico → anexa
os documentos → envia → síndico confere e libera com condições → morador informa início e conclusão
→ síndico confirma → termo de liberação. Usa os usuários do seed.

```bash
bun run db:seed                              # dados demo
bun dev                                      # ou bun run build && bun run start
bun run test:e2e                             # em outro terminal
```

Precisa do storage no ar (MinIO do docker compose). Julia-1 e OCR são opcionais: o teste passa com ou sem.
Variáveis: `E2E_BASE_URL` (padrão http://localhost:3000), `E2E_CHROMIUM` (caminho do Chromium, se não
quiser `bunx playwright install chromium`).
