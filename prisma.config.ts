import { defineConfig } from "prisma/config";

// `bun run db:*` carrega o .env sozinho (Bun lê .env ao rodar scripts), sem dotenv.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
