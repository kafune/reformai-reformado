import { PageBody, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <Card>
          <CardContent className="text-ink-500">Esta tela entra na Fase {phase} do PLAN.md.</CardContent>
        </Card>
      </PageBody>
    </>
  );
}
