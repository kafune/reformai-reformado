import { JuliaMark } from "@/components/case/julia-classification";
import { RELEASE_LABEL, type ReleaseOption, type ReleaseRecommendation } from "@/lib/decision";
import { cn } from "@/lib/utils";

/** Caixa violeta no card de decisão: recomendação da Julia-1 com as probabilidades. */
export function JuliaRecommendation({ rec }: { rec: ReleaseRecommendation }) {
  const order = (Object.keys(RELEASE_LABEL) as ReleaseOption[]).sort((a, b) => (rec.probabilities[b] ?? 0) - (rec.probabilities[a] ?? 0));
  return (
    <div className="rounded-md border border-julia-border bg-julia-bg px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-julia">
        <JuliaMark />
        Julia-1 recomenda: {RELEASE_LABEL[rec.recommendation].toLowerCase()}
      </div>
      <ul className="flex flex-col gap-1">
        {order.map((k) => {
          const pct = Math.round((rec.probabilities[k] ?? 0) * 100);
          const top = k === rec.recommendation;
          return (
            <li key={k} className="grid grid-cols-[minmax(0,1fr)_120px_36px] items-center gap-2 text-[11px]">
              <span className={cn("truncate", top ? "font-semibold text-julia-text" : "text-ink-500")}>{RELEASE_LABEL[k]}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-violet-100">
                <span className={cn("block h-full rounded-full", top ? "bg-violet-600" : "bg-violet-300")} style={{ width: `${pct}%` }} />
              </span>
              <span className={cn("text-right font-mono", top ? "font-semibold text-julia-text" : "text-ink-400")}>{pct}%</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-ink-500">Só um ponto de partida: liberar, recusar ou pedir correção é decisão sua.</p>
    </div>
  );
}
