import { defineConfig } from "prisma/config";

// Os scripts db:* rodam o CLI sob o runtime do Bun (`bunx --bun prisma`), que carrega o .env
// sozinho — por isso não precisamos de dotenv aqui.
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
