import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Histórico de Transações" />
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
          <CardDescription>
            A funcionalidade de histórico completo com filtros, busca e agrupamento de transações estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Aqui você poderá visualizar todas as suas movimentações financeiras de forma detalhada.</p>
        </CardContent>
      </Card>
    </div>
  );
}
