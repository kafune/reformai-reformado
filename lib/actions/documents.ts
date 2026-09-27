"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { assertCan, getCaseForUser } from "@/lib/permissions";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/rules/checklist";
import { ALLOWED_MIME_TYPES, MAX_FILE_BYTES, safeFileName, uploadFile } from "@/lib/storage";
import type { ActionState } from "@/lib/actions/state";

const UploadSchema = z.object({
  type: z.enum(DOCUMENT_TYPES as [DocumentType, ...DocumentType[]]),
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "Escolha um arquivo.")
    .refine((f) => f.size <= MAX_FILE_BYTES, "O arquivo deve ter no máximo 20 MB.")
    .refine(
      (f) => (ALLOWED_MIME_TYPES as readonly string[]).includes(f.type),
      "Envie um PDF, JPG ou PNG.",
    ),
});

/** Morador anexa um documento: storage → Document PENDING → CaseEvent. */
export async function uploadDocument(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const c = await getCaseForUser(user, caseId);
  assertCan(user, "upload", c);

  const parsed = UploadSchema.safeParse({ type: formData.get("type"), file: formData.get("file") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Arquivo inválido." };
  const { type, file } = parsed.data;

  const storageKey = `cases/${caseId}/${type.toLowerCase()}/${Date.now()}-${safeFileName(file.name)}`;
  try {
    await uploadFile(storageKey, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (error) {
    console.error("Falha ao gravar no storage", { storageKey, error });
    return { error: "Não foi possível salvar o arquivo. Tente de novo em instantes." };
  }

  await db.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        caseId,
        type,
        fileName: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedById: user.id,
      },
    });
    await logEvent(tx, {
      caseId,
      userId: user.id,
      type: "document_uploaded",
      data: { documentId: doc.id, type, fileName: file.name },
    });
  });

  revalidatePath(`/obras/${caseId}`);
  return { ok: true };
}
