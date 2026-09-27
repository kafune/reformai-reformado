import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OriginTag } from "@/components/origin-tag";
import { SERVICE_BY_KEY, isServiceKey } from "@/lib/rules/services";

/** Bloco de destaque: "Esta obra exige ART/RRT" (ou não) com a orientação por serviço. */
export function ArtRequirement({
  requiresArt,
  services,
  artByJulia = false,
  juliaReason,
}: {
  requiresArt: boolean;
  services: string[];
  /** A tabela não exigia ART; a Julia-1 exigiu. */
  artByJulia?: boolean;
  juliaReason?: string;
}) {
  if (!requiresArt) {
    return (
      <Alert variant="ok">
        <span aria-hidden>✓</span>
        <AlertTitle>Esta obra não exige ART/RRT</AlertTitle>
        <AlertDescription>
          Pelos serviços informados, não é preciso contratar responsável técnico. Se o escopo mudar, edite a obra:
          o cálculo é refeito.
        </AlertDescription>
      </Alert>
    );
  }

  const withGuidance = services.filter(isServiceKey).map((k) => SERVICE_BY_KEY[k]).filter((s) => s.guidance);

  return (
    <Alert variant="warn">
      <span aria-hidden>⚠</span>
      <AlertTitle>
        Esta obra exige ART/RRT {artByJulia && <OriginTag origin="julia" reason={juliaReason} />}
      </AlertTitle>
      <AlertDescription className="text-foreground">
        {artByJulia && <p>Pela tabela não seria exigida; a Julia-1 exigiu{juliaReason ? `: ${juliaReason}` : ""}.</p>}
        <p>Contrate um profissional habilitado. Para os serviços informados, procure:</p>
        <ul className="list-disc pl-4">
          {withGuidance.map((s) => (
            <li key={s.key}>
              <strong>{s.label}:</strong> {s.guidance} <OriginTag origin="rules" />
            </li>
          ))}
          {withGuidance.length === 0 && (
            <li>
              Engenheiro civil (CREA) ou arquiteto (CAU), pela intervenção em fachada/estrutura <OriginTag origin="rules" />
            </li>
          )}
        </ul>
        <p>
          A ART/RRT deve cobrir <strong>todos</strong> os serviços acima e citar o endereço da unidade.
        </p>
      </AlertDescription>
    </Alert>
  );
}
