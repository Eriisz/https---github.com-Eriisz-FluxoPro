'use client';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { ImportExport } from '@/components/settings/ImportExport';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { User as UserProfile } from '@/lib/definitions';
import { Loader } from 'lucide-react';
import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher';

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );

  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ajustes" />
      <div className="grid gap-6">
        <Card>
            <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
                Gerencie as informações do seu perfil.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <ProfileForm userProfile={userProfile} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                    Customize a aparência do aplicativo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ThemeSwitcher />
            </CardContent>
        </Card>

        <ImportExport />
      </div>
      <footer className="text-center text-sm text-muted-foreground mt-8">
        © 2024 FluxoPro. Todos os direitos reservados para Eris dos Reis.
      </footer>
    </div>
  );
}
