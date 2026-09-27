import { DocStatusBadge } from "@/components/doc-status-badge";
import { DocumentReviewForm } from "@/components/case/document-review-form";
import { OriginTag } from "@/components/origin-tag";
import { UploadDocumentForm } from "@/components/case/upload-document-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { DOCUMENT_LABEL, type DocumentType } from "@/lib/rules/checklist";
import type { DocStatus } from "@/lib/rules/status";

export type DocumentRow = {
  id: string;
  type: DocumentType;
  fileName: string;
  sizeBytes: number;
  status: DocStatus;
  reviewNote: string | null;
  createdAt: Date;
};

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Checklist de documentos: para cada tipo exigido, o último enviado (ou o botão de anexar). */
export function DocumentList({
  caseId,
  requiredDocs,
  docOrigins,
  documents,
  canUpload,
  canReview = false,
}: {
  caseId: string;
  requiredDocs: DocumentType[];
  docOrigins: Partial<Record<DocumentType, "rules" | "julia">>;
  documents: DocumentRow[];
  canUpload: boolean;
  /** Síndico/admin com a obra em análise: aprovar/reprovar cada documento. */
  canReview?: boolean;
}) {
  const latest = (type: DocumentType) => documents.find((d) => d.type === type) ?? null; // documents já vem do mais novo para o mais antigo
  const sent = requiredDocs.filter((t) => {
    const d = latest(t);
    return d && d.status !== "REJECTED";
  }).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Documentos</CardTitle>
        <span className="text-xs text-muted-foreground">
          {canReview
            ? "Abra cada arquivo e confira."
            : requiredDocs.length === 0
              ? "nenhum obrigatório"
              : `${sent} de ${requiredDocs.length} enviados`}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {requiredDocs.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum documento obrigatório para esta obra.</p>
        )}
        {requiredDocs.map((type) => {
          const doc = latest(type);
          const missing = !doc || doc.status === "REJECTED";
          return (
            <div key={type} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div
                className={`grid size-[34px] shrink-0 place-items-center rounded-lg text-[15px] ${missing ? "bg-warn-soft" : "bg-muted"}`}
                aria-hidden
              >
                {missing ? "＋" : "📄"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{DOCUMENT_LABEL[type]}</div>
                <div className="text-xs text-muted-foreground">
                  {doc ? (
                    <>
                      <a
                        href={`/api/files/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                        title="Abrir (link válido por 1h)"
                      >
                        {doc.fileName}
                      </a>{" "}
                      · {formatSize(doc.sizeBytes)} · enviado {formatRelative(doc.createdAt)}{" "}
                    </>
                  ) : (
                    "PDF, JPG ou PNG até 20 MB "
                  )}
                  <OriginTag origin={docOrigins[type] ?? "rules"} />
                </div>
                {doc?.reviewNote && !canReview && (
                  <div className={`mt-0.5 text-xs ${doc.status === "REJECTED" ? "text-danger" : "text-muted-foreground"}`}>
                    {doc.status === "REJECTED" ? "Motivo: " : "Nota: "}
                    {doc.reviewNote}
                  </div>
                )}
                {doc && canReview && (
                  <div className="mt-2">
                    <DocumentReviewForm documentId={doc.id} current={doc.status} currentNote={doc.reviewNote} />
                  </div>
                )}
              </div>
              <div className="flex basis-full flex-row items-center justify-end gap-2 sm:basis-auto sm:flex-col sm:items-end">
                {doc && <DocStatusBadge status={doc.status} />}
                {canUpload && missing && (
                  <UploadDocumentForm caseId={caseId} type={type} label={doc ? "Reenviar" : "Anexar"} />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
