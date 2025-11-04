import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Contas" />
       <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
          <CardDescription>
            A funcionalidade de gerenciamento de contas (corrente, crédito, investimentos) estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Aqui você poderá adicionar, editar e remover suas contas e cartões de crédito.</p>
        </CardContent>
      </Card>
    </div>
  );
}
