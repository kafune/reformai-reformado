// Cálculo de risco (PLAN.md §8.2). Puro: sem Prisma, sem Next.

import { FLAGS, SERVICE_BY_KEY, type Flags, type ServiceKey } from "./services";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_LEVELS: readonly RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const RISK_LABEL: Readonly<Record<RiskLevel, string>> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

export const MAX_SCORE = 100;

export type Risk = {
  /** Soma dos pontos, teto 100. */
  score: number;
  level: RiskLevel;
  /** Algum serviço exige ART/RRT, ou flag de estrutura/fachada marcada. */
  requiresArt: boolean;
  /** Orientações de profissional dos serviços selecionados, sem repetição. */
  guidance: string[];
};

export function riskLevelForScore(score: number): RiskLevel {
  if (score <= 20) return "LOW";
  if (score <= 45) return "MEDIUM";
  if (score <= 70) return "HIGH";
  return "CRITICAL";
}

/** Ordem dos níveis, para comparar (LOW < MEDIUM < HIGH < CRITICAL). */
export function riskRank(level: RiskLevel): number {
  return RISK_LEVELS.indexOf(level);
}

export function calculateRisk(services: readonly ServiceKey[], flags: Flags): Risk {
  const selected = [...new Set(services)].map((key) => SERVICE_BY_KEY[key]);
  const activeFlags = FLAGS.filter((f) => flags[f.key]);

  const points =
    selected.reduce((sum, s) => sum + s.points, 0) +
    activeFlags.reduce((sum, f) => sum + f.points, 0);
  const score = Math.min(points, MAX_SCORE);

  const requiresArt = selected.some((s) => s.requiresArt) || activeFlags.some((f) => f.requiresArt);

  const guidance = [
    ...new Set(selected.map((s) => s.guidance).filter((g): g is string => g !== null)),
  ];

  return { score, level: riskLevelForScore(score), requiresArt, guidance };
}
