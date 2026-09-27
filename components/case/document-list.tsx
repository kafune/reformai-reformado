import { DocStatusBadge } from "@/components/doc-status-badge";
import { DocumentReviewForm } from "@/components/case/document-review-form";
import { OriginTag } from "@/components/origin-tag";
import { UploadDocumentForm } from "@/components/case/upload-document-form";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatRelative } from "@/lib/format";
import { JuliaMark } from "@/components/case/julia-classification";
import { readDocumentVerdict } from "@/lib/decision";
import { readChecks } from "@/lib/julia";
import { DOCUMENT_LABEL, type DocumentType } from "@/lib/rules/checklist";
import type { DocStatus } from "@/lib/rules/status";
import { cn } from "@/lib/utils";

export type DocumentRow = {
  id: string;
  type: DocumentType;
  fileName: string;
  sizeBytes: number;
  status: DocStatus;
  reviewNote: string | null;
  createdAt: Date;
  extractedText?: string | null;
  extractedBy?: string | null;
  checks?: unknown;
  juliaVerdict?: unknown;
};

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Ícone redondo do checklist por situação do documento. */
const ROW_ICON: Record<"missing" | DocStatus, { icon: IconName; color: string; bg: string; label: string }> = {
  missing: { icon: "plus", color: "text-ochre-700", bg: "bg-ochre-100", label: "obrigatório — não enviado" },
  PENDING: { icon: "clock", color: "text-azulejo-700", bg: "bg-azulejo-100", label: "aguardando conferência" },
  APPROVED: { icon: "check", color: "text-green-800", bg: "bg-green-100", label: "aprovado" },
  REJECTED: { icon: "close", color: "text-iron-700", bg: "bg-iron-100", label: "reprovado — reenviar" },
};

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
  const allSent = requiredDocs.length > 0 && sent === requiredDocs.length;

  return (
    <div className="rounded-md bg-surface shadow-hair">
      <div className="flex items-center gap-2.5 border-b border-divider px-4 py-4 md:px-5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-bone-200">
          <Icon name="list" size={14} className="text-ink-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Documentos</p>
          <p className="font-mono text-[10px] tracking-caps text-ink-400 uppercase">
            {canReview ? "abra cada arquivo e confira" : requiredDocs.length === 0 ? "nenhum obrigatório" : `${sent} de ${requiredDocs.length} enviados`}
          </p>
        </div>
      </div>

      {requiredDocs.length === 0 && <p className="px-5 py-4 text-sm text-ink-500">Nenhum documento obrigatório para esta obra.</p>}

      <ul className="divide-y divide-divider">
        {requiredDocs.map((type) => {
          const doc = latest(type);
          const missing = !doc || doc.status === "REJECTED";
          const cfg = ROW_ICON[doc ? doc.status : "missing"];
          return (
            <li key={type} className={cn("flex flex-wrap items-center gap-3 px-4 py-3.5 md:px-5", doc?.status === "REJECTED" && "bg-iron-50")}>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", cfg.bg)} aria-hidden>
                <Icon name={cfg.icon} size={14} className={cfg.color} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink-900">{DOCUMENT_LABEL[type]}</span>
                  <OriginTag origin={docOrigins[type] ?? "rules"} />
                </div>
                <div className={cn("mt-0.5 font-mono text-[10px] tracking-caps uppercase", doc?.status === "REJECTED" ? "text-iron-600" : "text-ink-400")}>
                  {cfg.label}
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  {doc ? (
                    <>
                      <a
                        href={`/api/files/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-ink-800 underline-offset-2 hover:underline"
                        title="Abrir (link válido por 1h)"
                      >
                        <Icon name="doc" size={12} className="text-ink-400" />
                        {doc.fileName}
                      </a>{" "}
                      · {formatSize(doc.sizeBytes)} · enviado {formatRelative(doc.createdAt)}
                    </>
                  ) : (
                    "PDF, JPG ou PNG até 20 MB"
                  )}
                </div>
                {doc?.reviewNote && !canReview && (
                  <div className={cn("mt-1 text-xs", doc.status === "REJECTED" ? "text-iron-700" : "text-ink-500")}>
                    {doc.status === "REJECTED" ? "Motivo: " : "Nota: "}
                    {doc.reviewNote}
                  </div>
                )}
                {doc && canReview && <DocumentInsights doc={doc} />}
                {doc && canReview && (
                  <div className="mt-2.5">
                    <DocumentReviewForm
                      documentId={doc.id}
                      current={doc.status}
                      currentNote={doc.reviewNote}
                      suggested={doc.status === "PENDING" ? suggestedReview(doc) : null}
                    />
                  </div>
                )}
              </div>
              <div className="flex basis-full flex-row items-center justify-end gap-2 sm:basis-auto sm:flex-col sm:items-end">
                {doc && <DocStatusBadge status={doc.status} />}
                {canUpload && missing && <UploadDocumentForm caseId={caseId} type={type} label={doc ? "Reenviar" : "Anexar"} />}
              </div>
            </li>
          );
        })}
      </ul>

      {requiredDocs.length > 0 && !canReview && (
        <div className="border-t border-divider px-4 py-3 md:px-5">
          {allSent ? (
            <p className="text-xs font-medium text-green-700">Todos os documentos obrigatórios foram enviados.</p>
          ) : (
            <p className="text-xs text-ink-500">
              <strong className="text-ochre-700">{requiredDocs.length - sent}</strong> documento{requiredDocs.length - sent === 1 ? "" : "s"} obrigatório
              {requiredDocs.length - sent === 1 ? "" : "s"} pendente{requiredDocs.length - sent === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Pré-preenchimento da conferência: parecer da Julia-1 (se houver) e os problemas achados como nota. */
function suggestedReview(doc: DocumentRow): { status: "APPROVED" | "REJECTED"; note: string } | null {
  const verdict = readDocumentVerdict(doc.juliaVerdict);
  const problems = readChecks(doc.checks).filter((c) => c.ok === false).map((c) => c.message);
  if (!verdict) return null;
  return {
    status: verdict.verdict === "approve" ? "APPROVED" : "REJECTED",
    note: verdict.verdict === "reject" ? problems.join(" ") : "",
  };
}

/** Para o síndico: achados das checagens, parecer da Julia-1 e o texto extraído (recolhível). */
function DocumentInsights({ doc }: { doc: DocumentRow }) {
  const checks = readChecks(doc.checks);
  const verdict = readDocumentVerdict(doc.juliaVerdict);
  if (checks.length === 0 && !verdict && !doc.extractedText) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {verdict && (
        <div className="rounded-sm border border-julia-border bg-julia-bg px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-julia">
            <JuliaMark className="size-[18px]" />
            Sugere: {verdict.verdict === "approve" ? "aprovar" : "reprovar"} ({Math.round(verdict.confidence * 100)}%)
          </span>
        </div>
      )}
      {checks.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {checks.map((c) => (
            <li key={c.code} className={cn("flex items-start gap-1.5", c.ok === false ? "text-iron-700" : c.ok === null ? "text-ink-500" : "text-green-700")}>
              <Icon name={c.ok === false ? "close" : c.ok === null ? "minus" : "check"} size={12} className="mt-0.5" />
              {c.message}
            </li>
          ))}
        </ul>
      )}
      {doc.extractedText && (
        <details className="text-xs">
          <summary className="cursor-pointer text-ink-500 hover:text-ink-900">
            Texto extraído ({doc.extractedBy === "pdf-text" ? "camada de texto do PDF" : "OCR"})
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded-sm bg-bone-100 p-2 font-mono text-[11px] whitespace-pre-wrap text-ink-700">{doc.extractedText}</pre>
        </details>
      )}
    </div>
  );
}
