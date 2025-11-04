import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ajustes" />
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
          <CardDescription>
            A página de ajustes e configurações estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Aqui você poderá configurar suas preferências, exportar dados e gerenciar seu perfil.</p>
        </CardContent>
      </Card>
    </div>
  );
}
