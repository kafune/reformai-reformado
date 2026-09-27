import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <CardContent className="text-muted-foreground">
          Esta tela entra na Fase {phase} do PLAN.md.
        </CardContent>
      </Card>
    </>
  );
}
