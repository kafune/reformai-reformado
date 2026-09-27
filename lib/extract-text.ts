// Texto de um documento: camada de texto do PDF (unpdf) e, se não houver, OCR (lib/ocr.ts).
// Síncrono no upload, com timeout; falha = sem texto (o documento é salvo do mesmo jeito).
import { extractText as unpdfExtractText } from "unpdf";

import { ocrFile } from "@/lib/ocr";

/** Tamanho máximo guardado no banco e enviado à Julia-1 (cabe no contexto dela). */
export const MAX_EXTRACTED_CHARS = 12_000;
/** Abaixo disso o PDF é tratado como escaneado (sem camada de texto útil). */
const MIN_TEXT_LAYER_CHARS = 40;

export type ExtractedText = { text: string; by: "pdf-text" | "ocr:pp-ocrv5" };

export async function extractDocumentText(bytes: Uint8Array, mimeType: string): Promise<ExtractedText | null> {
  if (mimeType === "application/pdf") {
    try {
      const { text } = await unpdfExtractText(bytes, { mergePages: true });
      const clean = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (clean.length >= MIN_TEXT_LAYER_CHARS) return { text: clean.slice(0, MAX_EXTRACTED_CHARS), by: "pdf-text" };
    } catch (error) {
      console.error("PDF: falha ao ler a camada de texto", error);
    }
  }
  const ocr = await ocrFile(bytes, mimeType);
  if (!ocr || ocr.text.trim().length === 0) return null;
  return { text: ocr.text.trim().slice(0, MAX_EXTRACTED_CHARS), by: "ocr:pp-ocrv5" };
}
