import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Categorias" />
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
          <CardDescription>
            A funcionalidade para personalizar suas categorias de despesas e receitas estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Aqui você poderá criar novas categorias, definir cores personalizadas para os gráficos e organizar suas finanças.</p>
        </CardContent>
      </Card>
    </div>
  );
}
