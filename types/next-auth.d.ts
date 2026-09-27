import type { DefaultSession } from "next-auth";

import type { Role } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      condominiumId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    condominiumId: string | null;
  }
}

// O JWT vem de @auth/core (next-auth/jwt só reexporta), então a extensão é lá.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    condominiumId: string | null;
  }
}
