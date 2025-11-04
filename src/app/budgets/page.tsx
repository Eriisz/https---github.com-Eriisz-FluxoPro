import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BudgetsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Orçamentos" />
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
          <CardDescription>
            A funcionalidade para criar e acompanhar orçamentos mensais por categoria estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Aqui você poderá definir limites de gastos para categorias como "Alimentação" e "Lazer" e receber alertas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
