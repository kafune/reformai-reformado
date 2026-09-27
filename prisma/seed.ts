// Seed de desenvolvimento (PLAN.md Fase 2): 2 condomínios, unidades, usuários demo
// (senha: senha123) e obras em status variados, com e sem ART/RRT.
// Rode com: bun run db:seed

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";
import { hashPassword } from "../lib/password";
import { requiredDocuments } from "../lib/rules/checklist";
import { calculateRisk } from "../lib/rules/risk";
import type { Flags, ServiceKey } from "../lib/rules/services";
import type { CaseStatus } from "../lib/rules/status";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PASSWORD = "senha123";

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  // Limpa tudo (banco de dev). Ordem: filhos antes dos pais.
  await db.caseEvent.deleteMany();
  await db.document.deleteMany();
  await db.case.deleteMany();
  await db.unit.deleteMany();
  await db.user.deleteMany();
  await db.condominium.deleteMany();

  const acacias = await db.condominium.create({
    data: {
      name: "Residencial Jardim das Acácias",
      address: "Rua das Acácias, 120",
      city: "São Paulo",
      state: "SP",
      signupCode: "ACACIAS-2026",
    },
  });
  const solar = await db.condominium.create({
    data: {
      name: "Edifício Solar das Palmeiras",
      address: "Av. Paulista, 2000",
      city: "São Paulo",
      state: "SP",
      signupCode: "SOLAR-2026",
    },
  });

  // Unidades: Acácias tem blocos A/B/C; Solar não tem bloco.
  for (const block of ["A", "B", "C"]) {
    for (const number of ["101", "102", "304", "701", "1203"]) {
      await db.unit.create({ data: { condominiumId: acacias.id, block, number } });
    }
  }
  for (const number of ["11", "12", "21", "22"]) {
    await db.unit.create({ data: { condominiumId: solar.id, number } });
  }

  const admin = await db.user.create({
    data: { name: "Lúcia Carvalho", email: "admin@demo.com", passwordHash, role: "ADMIN" },
  });
  const syndic = await db.user.create({
    data: {
      name: "Roberto Mendes",
      email: "sindico@demo.com",
      passwordHash,
      role: "SYNDIC",
      condominiumId: acacias.id,
    },
  });
  await db.user.create({
    data: {
      name: "Helena Prado",
      email: "sindico2@demo.com",
      passwordHash,
      role: "SYNDIC",
      condominiumId: solar.id,
    },
  });

  async function resident(name: string, email: string, condominiumId: string, block: string, number: string) {
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: "(11) 99999-0000",
        passwordHash,
        role: "RESIDENT",
        condominiumId,
        lgpdConsentAt: new Date(),
      },
    });
    const unit = await db.unit.update({
      where: { condominiumId_block_number: { condominiumId, block, number } },
      data: { residentId: user.id },
    });
    return { user, unit };
  }

  const ana = await resident("Ana Souza", "morador@demo.com", acacias.id, "B", "304");
  const marcos = await resident("Marcos Lima", "marcos@demo.com", acacias.id, "A", "102");
  const patricia = await resident("Patrícia Nunes", "patricia@demo.com", acacias.id, "C", "1203");
  const joao = await resident("João Ribeiro", "joao@demo.com", acacias.id, "B", "701");
  const carla = await resident("Carla Dias", "carla@demo.com", solar.id, "", "21");

  let seq = 80;
  type Doc = { type: Parameters<typeof db.document.create>[0]["data"]["type"]; status: "PENDING" | "APPROVED" | "REJECTED"; note?: string };

  async function createCase(opts: {
    who: { user: { id: string }; unit: { id: string; condominiumId: string } };
    services: ServiceKey[];
    flags?: Partial<Flags>;
    description: string;
    status: CaseStatus;
    contractorName?: string;
    professional?: { name: string; type: "ENGINEER" | "ARCHITECT"; reg: string; art: string };
    docs?: Doc[];
    approvalConditions?: string;
    startedAt?: Date;
    completedAt?: Date;
    daysAgo?: number;
  }) {
    const flags: Flags = { affectsCommonArea: false, affectsFacade: false, affectsStructure: false, ...opts.flags };
    const risk = calculateRisk(opts.services, flags);
    const requiredDocs = requiredDocuments(risk);
    const createdAt = new Date(Date.now() - (opts.daysAgo ?? 0) * 86_400_000);
    const protocol = `RF-2026-${String(++seq).padStart(6, "0")}`;

    const c = await db.case.create({
      data: {
        protocol,
        condominiumId: opts.who.unit.condominiumId,
        unitId: opts.who.unit.id,
        residentId: opts.who.user.id,
        status: opts.status,
        services: opts.services,
        ...flags,
        description: opts.description,
        plannedStart: new Date("2026-10-20"),
        plannedEnd: new Date("2026-11-30"),
        contractorName: opts.contractorName ?? null,
        riskScore: risk.score,
        riskLevel: risk.level,
        requiresArt: risk.requiresArt,
        requiredDocs,
        classifiedBy: "rules",
        professionalName: opts.professional?.name ?? null,
        professionalType: opts.professional?.type ?? null,
        professionalReg: opts.professional?.reg ?? null,
        artNumber: opts.professional?.art ?? null,
        approvalConditions: opts.approvalConditions ?? null,
        startedAt: opts.startedAt ?? null,
        completedAt: opts.completedAt ?? null,
        createdAt,
      },
    });

    const events: { type: string; userId?: string | null; from?: CaseStatus; to?: CaseStatus; message?: string; data?: object }[] = [
      { type: "status_changed", userId: opts.who.user.id, to: "DRAFT", message: "Obra criada" },
    ];

    for (const d of opts.docs ?? []) {
      await db.document.create({
        data: {
          caseId: c.id,
          type: d.type,
          fileName: `${d.type.toLowerCase()}.pdf`,
          storageKey: `seed/${c.id}/${d.type.toLowerCase()}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 210_000,
          status: d.status,
          reviewNote: d.note ?? null,
          uploadedById: opts.who.user.id,
        },
      });
      events.push({ type: "document_uploaded", userId: opts.who.user.id, data: { type: d.type } });
      if (d.status !== "PENDING") {
        events.push({ type: "document_reviewed", userId: syndic.id, data: { type: d.type, status: d.status }, message: d.note });
      }
    }
    if (opts.professional) {
      events.push({ type: "professional_updated", userId: opts.who.user.id, data: { artNumber: opts.professional.art } });
    }

    const paths: Record<CaseStatus, CaseStatus[]> = {
      DRAFT: [],
      UNDER_REVIEW: ["UNDER_REVIEW"],
      CHANGES_REQUESTED: ["UNDER_REVIEW", "CHANGES_REQUESTED"],
      APPROVED: ["UNDER_REVIEW", "APPROVED"],
      REJECTED: ["UNDER_REVIEW", "REJECTED"],
      IN_PROGRESS: ["UNDER_REVIEW", "APPROVED", "IN_PROGRESS"],
      COMPLETED: ["UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED"],
      CANCELLED: ["CANCELLED"],
    };
    const path = paths[opts.status];
    let from: CaseStatus = "DRAFT";
    for (const to of path) {
      const byResident = to === "UNDER_REVIEW" || to === "IN_PROGRESS" || to === "CANCELLED";
      events.push({
        type: "status_changed",
        userId: byResident ? opts.who.user.id : syndic.id,
        from,
        to,
        message: to === "APPROVED" ? opts.approvalConditions : undefined,
        data: to === "APPROVED" && risk.requiresArt ? { artConfirmed: true } : undefined,
      });
      from = to;
    }

    let t = createdAt.getTime();
    for (const e of events) {
      t += 15 * 60_000;
      await db.caseEvent.create({
        data: {
          caseId: c.id,
          userId: e.userId ?? null,
          type: e.type,
          fromStatus: e.from ?? null,
          toStatus: e.to ?? null,
          message: e.message ?? null,
          data: e.data,
          createdAt: new Date(t),
        },
      });
    }
    return c;
  }

  // Obras da Ana (morador@demo.com)
  await createCase({
    who: ana,
    services: ["PAINTING"],
    description: "Pintura da sala e dos quartos.",
    status: "COMPLETED",
    contractorName: "Pinturas Silva",
    startedAt: new Date("2026-03-02"),
    completedAt: new Date("2026-03-10"),
    daysAgo: 200,
  });
  await createCase({
    who: ana,
    services: ["ELECTRICAL", "MASONRY_DEMOLITION"],
    description:
      "Quero integrar a cozinha com a sala derrubando a parede entre elas e refazer toda a parte elétrica da cozinha, com novos pontos de tomada para cooktop e forno.",
    status: "DRAFT",
    contractorName: "Construtora Bom Lar",
    professional: { name: "Eng. Carla Nunes", type: "ENGINEER", reg: "CREA-SP 5069871234", art: "2620251234567" },
    docs: [
      { type: "RESPONSIBILITY_TERM", status: "PENDING" },
      { type: "ART_RRT", status: "PENDING" },
    ],
  });

  // Obras de outros moradores do Jd. das Acácias (o síndico vê todas)
  await createCase({
    who: marcos,
    services: ["PLUMBING", "WATERPROOFING"],
    description: "Reforma completa do banheiro da suíte, com troca da impermeabilização do box.",
    status: "UNDER_REVIEW",
    contractorName: "Hidro Reformas",
    professional: { name: "Arq. Bruno Teixeira", type: "ARCHITECT", reg: "CAU A123456-7", art: "SI9876543" },
    docs: [
      { type: "RESPONSIBILITY_TERM", status: "APPROVED" },
      { type: "ART_RRT", status: "PENDING" },
      { type: "DESCRIPTIVE_MEMORIAL", status: "PENDING" },
    ],
    daysAgo: 2,
  });
  await createCase({
    who: patricia,
    services: ["FLOORING_WITH_DEMOLITION"],
    description: "Troca do piso da sala, retirando o piso antigo.",
    status: "UNDER_REVIEW",
    professional: { name: "Eng. Paulo Freitas", type: "ENGINEER", reg: "CREA-SP 1234567890", art: "2620259876543" },
    docs: [
      { type: "RESPONSIBILITY_TERM", status: "PENDING" },
      { type: "ART_RRT", status: "PENDING" },
    ],
    daysAgo: 1,
  });
  await createCase({
    who: joao,
    services: ["GAS", "LAYOUT_CHANGE"],
    description: "Mudança do ponto de gás do fogão e nova divisória na área de serviço.",
    status: "CHANGES_REQUESTED",
    professional: { name: "Eng. Sérgio Alves", type: "ENGINEER", reg: "CREA-SP 2223334455", art: "2620255555555" },
    docs: [
      { type: "RESPONSIBILITY_TERM", status: "APPROVED" },
      { type: "ART_RRT", status: "REJECTED", note: "A ART não menciona o serviço de gás." },
      { type: "DESCRIPTIVE_MEMORIAL", status: "APPROVED" },
    ],
    daysAgo: 5,
  });
  await createCase({
    who: marcos,
    services: ["AIR_CONDITIONING"],
    description: "Instalação de split no quarto.",
    status: "APPROVED",
    daysAgo: 10,
  });
  await createCase({
    who: joao,
    services: ["FLOORING", "PAINTING"],
    description: "Troca do piso vinílico dos quartos e pintura.",
    status: "IN_PROGRESS",
    startedAt: new Date(Date.now() - 3 * 86_400_000),
    daysAgo: 12,
  });
  await createCase({
    who: patricia,
    services: ["STRUCTURAL"],
    flags: { affectsStructure: true },
    description: "Abertura de vão em viga para porta de correr.",
    status: "REJECTED",
    professional: { name: "Eng. Paulo Freitas", type: "ENGINEER", reg: "CREA-SP 1234567890", art: "2620250001111" },
    docs: [
      { type: "RESPONSIBILITY_TERM", status: "APPROVED" },
      { type: "ART_RRT", status: "APPROVED" },
      { type: "DESCRIPTIVE_MEMORIAL", status: "REJECTED", note: "Intervenção em viga estrutural não é permitida pela convenção." },
    ],
    daysAgo: 30,
  });

  // Obra no outro condomínio (só admin e o síndico de lá veem)
  await createCase({
    who: carla,
    services: ["FACADE"],
    description: "Fechamento da varanda com vidro.",
    status: "UNDER_REVIEW",
    professional: { name: "Arq. Lívia Rocha", type: "ARCHITECT", reg: "CAU A765432-1", art: "SI1122334" },
    docs: [
      { type: "RESPONSIBILITY_TERM", status: "PENDING" },
      { type: "ART_RRT", status: "PENDING" },
    ],
    daysAgo: 3,
  });

  console.log(`Seed ok. Usuários (senha ${PASSWORD}): admin@demo.com, sindico@demo.com, morador@demo.com`);
  console.log(`Admin: ${admin.email} · Síndico: ${syndic.email} (${acacias.name}) · Solar: ${solar.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
