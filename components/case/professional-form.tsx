"use client";

import { useActionState } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { updateProfessional } from "@/lib/actions/cases";
import type { ActionState } from "@/lib/actions/state";

export type ProfessionalValues = {
  professionalName: string | null;
  professionalType: string | null;
  professionalReg: string | null;
  artNumber: string | null;
};

export function ProfessionalForm({ caseId, initial }: { caseId: string; initial: ProfessionalValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfessional.bind(null, caseId), {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Responsável técnico</CardTitle>
          <CardDescription>Profissional habilitado (CREA/CAU) contratado por você. Quem emite a ART/RRT é ele.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3.5 pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="professionalName">Nome</Label>
            <Input id="professionalName" name="professionalName" defaultValue={initial.professionalName ?? ""} required />
            <FieldError messages={err("professionalName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="professionalType">Profissão</Label>
            <NativeSelect id="professionalType" name="professionalType" defaultValue={initial.professionalType ?? "ENGINEER"}>
              <option value="ENGINEER">Engenheiro(a) — CREA</option>
              <option value="ARCHITECT">Arquiteto(a) — CAU</option>
            </NativeSelect>
            <FieldError messages={err("professionalType")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="professionalReg">Registro CREA/CAU</Label>
            <Input id="professionalReg" name="professionalReg" defaultValue={initial.professionalReg ?? ""} required className="font-mono" />
            <FieldError messages={err("professionalReg")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artNumber">Nº da ART/RRT</Label>
            <Input id="artNumber" name="artNumber" defaultValue={initial.artNumber ?? ""} required className="font-mono" />
            <FieldError messages={err("artNumber")} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 border-t border-divider pt-4">
          {state.error && <p className="mr-auto text-sm text-iron-600">{state.error}</p>}
          {state.ok && <p className="mr-auto text-sm text-green-700">Responsável técnico salvo.</p>}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
