import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2.5 font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              R
            </span>
            ReformAI
          </div>
          <CardTitle>Controle de reformas nas unidades</CardTitle>
          <CardDescription>
            Saiba quais obras exigem ART/RRT, oriente o morador e confira os
            documentos antes de liberar a obra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Entrar</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
