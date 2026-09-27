// Tabela de serviços (PLAN.md §8.1). Editar aqui muda o comportamento do app.
//
// ⚠️ Os pontos e os textos de orientação são valores iniciais — a administradora
// deve validar com um profissional antes de ir para produção.

export type ServiceKey =
  | "PAINTING"
  | "FLOORING"
  | "FLOORING_WITH_DEMOLITION"
  | "ELECTRICAL"
  | "PLUMBING"
  | "GAS"
  | "WATERPROOFING"
  | "AIR_CONDITIONING"
  | "LAYOUT_CHANGE"
  | "MASONRY_DEMOLITION"
  | "STRUCTURAL"
  | "FACADE"
  | "EXTERNAL_FRAMES"
  | "HEAVY_FIXED_EQUIPMENT";

export type Service = {
  key: ServiceKey;
  label: string;
  points: number;
  requiresArt: boolean;
  /** Qual profissional procurar (mostrado ao morador). Só quando exige ART/RRT. */
  guidance: string | null;
};

const CIVIL_OR_ARCHITECT = "Engenheiro civil (CREA) ou arquiteto (CAU)";

export const SERVICES: readonly Service[] = [
  { key: "PAINTING", label: "Pintura simples", points: 5, requiresArt: false, guidance: null },
  { key: "FLOORING", label: "Troca de piso sem demolição", points: 10, requiresArt: false, guidance: null },
  { key: "FLOORING_WITH_DEMOLITION", label: "Troca de piso com demolição", points: 25, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "ELECTRICAL", label: "Elétrica", points: 30, requiresArt: true, guidance: "Engenheiro eletricista/civil (CREA) ou arquiteto (CAU)" },
  { key: "PLUMBING", label: "Hidráulica", points: 30, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "GAS", label: "Gás", points: 40, requiresArt: true, guidance: "Engenheiro (CREA) com atribuição para instalações de gás" },
  { key: "WATERPROOFING", label: "Impermeabilização", points: 35, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "AIR_CONDITIONING", label: "Ar-condicionado (split)", points: 15, requiresArt: false, guidance: null },
  { key: "LAYOUT_CHANGE", label: "Mudança de layout", points: 20, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "MASONRY_DEMOLITION", label: "Demolição de alvenaria", points: 40, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "STRUCTURAL", label: "Impacto estrutural/prumadas", points: 60, requiresArt: true, guidance: "Engenheiro civil (CREA)" },
  { key: "FACADE", label: "Fachada", points: 45, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "EXTERNAL_FRAMES", label: "Esquadrias externas", points: 20, requiresArt: true, guidance: CIVIL_OR_ARCHITECT },
  { key: "HEAVY_FIXED_EQUIPMENT", label: "Equipamentos fixos pesados", points: 25, requiresArt: true, guidance: "Engenheiro civil (CREA)" },
];

export const SERVICE_KEYS: readonly ServiceKey[] = SERVICES.map((s) => s.key);

export const SERVICE_BY_KEY: Readonly<Record<ServiceKey, Service>> = Object.fromEntries(
  SERVICES.map((s) => [s.key, s]),
) as Record<ServiceKey, Service>;

export function isServiceKey(value: string): value is ServiceKey {
  return value in SERVICE_BY_KEY;
}

// Flags extras do formulário (PLAN.md §8.1): somam pontos; estrutura e fachada forçam ART/RRT.
export type Flags = {
  affectsCommonArea: boolean;
  affectsFacade: boolean;
  affectsStructure: boolean;
};

export type FlagKey = keyof Flags;

export const FLAGS: readonly { key: FlagKey; label: string; points: number; requiresArt: boolean }[] = [
  { key: "affectsCommonArea", label: "Afeta área comum", points: 10, requiresArt: false },
  { key: "affectsFacade", label: "Afeta a fachada", points: 20, requiresArt: true },
  { key: "affectsStructure", label: "Afeta a estrutura (vigas, pilares, lajes)", points: 30, requiresArt: true },
];

export const NO_FLAGS: Flags = {
  affectsCommonArea: false,
  affectsFacade: false,
  affectsStructure: false,
};
