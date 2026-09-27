import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import type { CaseStatus } from "@/lib/rules/status";

/** Avisos de contexto no topo da obra: correção pedida, recusa, liberação com condições, execução. */
export function CaseNotices({
  status,
  changesMessage,
  rejectionReason,
  approvalConditions,
  startedAt,
  completedAt,
  isResident,
}: {
  status: CaseStatus;
  changesMessage: string | null;
  rejectionReason: string | null;
  approvalConditions: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  isResident: boolean;
}) {
  if (status === "CHANGES_REQUESTED") {
    return (
      <Alert variant="warn">
        <span aria-hidden>✎</span>
        <AlertTitle>Correção solicitada</AlertTitle>
        <AlertDescription className="text-foreground">
          <p className="whitespace-pre-line">{changesMessage ?? "Veja as notas nos documentos reprovados."}</p>
          {isResident && <p className="text-muted-foreground">Corrija o que foi pedido, reenvie os documentos reprovados e envie de novo para análise.</p>}
        </AlertDescription>
      </Alert>
    );
  }
  if (status === "REJECTED") {
    return (
      <Alert variant="danger">
        <span aria-hidden>✕</span>
        <AlertTitle>Obra recusada</AlertTitle>
        <AlertDescription className="text-foreground">
          <p className="whitespace-pre-line">{rejectionReason ?? "—"}</p>
        </AlertDescription>
      </Alert>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Alert>
        <AlertTitle>Obra cancelada</AlertTitle>
      </Alert>
    );
  }
  if (status === "APPROVED" || status === "IN_PROGRESS" || status === "COMPLETED") {
    return (
      <Alert variant="ok">
        <span aria-hidden>✓</span>
        <AlertTitle>
          {status === "APPROVED" && "Obra liberada"}
          {status === "IN_PROGRESS" && `Em execução desde ${formatDate(startedAt)}`}
          {status === "COMPLETED" && `Concluída em ${formatDate(completedAt)}`}
        </AlertTitle>
        <AlertDescription className="text-foreground">
          {approvalConditions ? (
            <p className="whitespace-pre-line">
              <strong>Condições:</strong> {approvalConditions}
            </p>
          ) : (
            <p>Liberada sem condições.</p>
          )}
          {status === "IN_PROGRESS" && completedAt && (
            <p className="text-muted-foreground">Conclusão informada pelo morador em {formatDate(completedAt)}, aguardando confirmação.</p>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
