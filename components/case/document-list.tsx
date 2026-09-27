import { DocStatusBadge } from "@/components/doc-status-badge";
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
  viewHref,
}: {
  caseId: string;
  requiredDocs: DocumentType[];
  docOrigins: Partial<Record<DocumentType, "rules" | "julia">>;
  documents: DocumentRow[];
  canUpload: boolean;
  /** Link para ver o arquivo (URL assinada), quando o usuário pode. */
  viewHref?: (doc: DocumentRow) => string;
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
          {requiredDocs.length === 0 ? "nenhum obrigatório" : `${sent} de ${requiredDocs.length} enviados`}
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
                      {viewHref ? (
                        <a href={viewHref(doc)} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                          {doc.fileName}
                        </a>
                      ) : (
                        doc.fileName
                      )}{" "}
                      · {formatSize(doc.sizeBytes)} · enviado {formatRelative(doc.createdAt)}{" "}
                    </>
                  ) : (
                    "PDF, JPG ou PNG até 20 MB "
                  )}
                  <OriginTag origin={docOrigins[type] ?? "rules"} />
                </div>
                {doc?.status === "REJECTED" && doc.reviewNote && (
                  <div className="mt-0.5 text-xs text-danger">Motivo: {doc.reviewNote}</div>
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
