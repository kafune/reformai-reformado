// OCR self-hosted: serviço HTTP do PaddleOCR 3.x (pipeline OCR, modelos PP-OCRv5) — ver docs/ocr.md.
// Só fetch + Zod. Sem OCR_URL, nada é chamado. Nunca lança: falha vira null.
import { z } from "zod";

export function ocrConfig() {
  const url = process.env.OCR_URL?.replace(/\/+$/, "");
  return { enabled: !!url, url: url ?? "", timeoutMs: Number(process.env.OCR_TIMEOUT_MS ?? 20000) };
}

// Contrato do serving oficial: POST /ocr { file: base64, fileType: 0 (PDF) | 1 (imagem) }
// → { errorCode, errorMsg, result: { ocrResults: [{ prunedResult: { rec_texts, rec_scores } }] } }
const OcrResponseSchema = z.object({
  errorCode: z.number(),
  errorMsg: z.string().optional(),
  result: z
    .object({
      ocrResults: z.array(
        z.object({
          prunedResult: z.object({
            rec_texts: z.array(z.string()),
            rec_scores: z.array(z.number()).optional(),
          }),
        }),
      ),
    })
    .optional(),
});

export type OcrResult = { text: string; pages: number; meanScore: number | null; elapsedMs: number };

export async function ocrFile(bytes: Uint8Array, mimeType: string): Promise<OcrResult | null> {
  const cfg = ocrConfig();
  if (!cfg.enabled) return null;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.url}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: Buffer.from(bytes).toString("base64"), fileType: mimeType === "application/pdf" ? 0 : 1 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("OCR: HTTP", res.status);
      return null;
    }
    const parsed = OcrResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success || parsed.data.errorCode !== 0 || !parsed.data.result) {
      console.error("OCR: resposta inválida", parsed.success ? parsed.data.errorMsg : parsed.error.issues[0]?.message);
      return null;
    }
    const pages = parsed.data.result.ocrResults;
    const scores = pages.flatMap((p) => p.prunedResult.rec_scores ?? []);
    return {
      text: pages.map((p) => p.prunedResult.rec_texts.join("\n")).join("\n\n"),
      pages: pages.length,
      meanScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    console.error("OCR: falha", error instanceof Error && error.name === "AbortError" ? `timeout após ${cfg.timeoutMs} ms` : error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
