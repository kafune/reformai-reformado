"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "@/lib/actions/signup";
import type { ActionState } from "@/lib/actions/state";

export function SignupForm({ signupCode, blocks }: { signupCode: string; blocks: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signup.bind(null, signupCode), {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" name="name" required autoComplete="name" />
        <FieldError messages={err("name")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
        <FieldError messages={err("email")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 98888-7777" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block">Bloco</Label>
        {blocks.length > 0 ? (
          <select
            id="block"
            name="block"
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30"
            defaultValue={blocks[0]}
          >
            {blocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        ) : (
          <Input id="block" name="block" placeholder="Se houver" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="number">Unidade</Label>
        <Input id="number" name="number" required placeholder="304" />
        <p className="text-xs text-muted-foreground">
          Se a unidade já tiver outro morador cadastrado, fale com o síndico.
        </p>
        <FieldError messages={err("number")} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        <FieldError messages={err("password")} />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 sm:col-span-2">
        <input type="checkbox" name="lgpd" required className="mt-0.5 accent-primary" />
        <span className="text-xs">
          Li e concordo com o aviso de privacidade. Autorizo o uso dos meus dados para análise e
          acompanhamento de reformas neste condomínio (LGPD).
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="sm:col-span-2" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta e entrar"}
      </Button>
    </form>
  );
}
