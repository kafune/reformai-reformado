"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Icon name="print" />
      Imprimir / Salvar PDF
    </Button>
  );
}
