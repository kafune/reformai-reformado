import { JuliaMark } from "@/components/case/julia-classification";
import { RELEASE_LABEL, type ReleaseOption, type ReleaseRecommendation } from "@/lib/decision";

/** Caixa roxa no card de decisão: recomendação da Julia-1 com as probabilidades. */
export function JuliaRecommendation({ rec }: { rec: ReleaseRecommendation }) {
  const order = (Object.keys(RELEASE_LABEL) as ReleaseOption[]).sort((a, b) => (rec.probabilities[b] ?? 0) - (rec.probabilities[a] ?? 0));
  return (
    <div className="rounded-lg border border-julia-border bg-[#faf8ff] px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-julia">
        <JuliaMark />
        Julia-1 recomenda: {RELEASE_LABEL[rec.recommendation].toLowerCase()}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-julia-text">
        {order.map((k) => (
          <li key={k} className={k === rec.recommendation ? "font-semibold" : ""}>
            {RELEASE_LABEL[k]} {Math.round((rec.probabilities[k] ?? 0) * 100)}%
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11.5px] text-muted-foreground">
        Só um ponto de partida: liberar, recusar ou pedir correção é decisão sua.
      </p>
    </div>
  );
}
