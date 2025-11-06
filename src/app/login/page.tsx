'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';
import { FirebaseError } from 'firebase/app';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // We are using a dummy domain since we are using phone number as the identifier
      await initiateEmailSignIn(auth, `${email}@fluxopro.com`, password);
      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para o painel...',
      });
      router.push('/');
    } catch (error: any) {
        let description = 'Ocorreu um erro desconhecido.';
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                description = 'Telefone ou senha inválidos.';
            }
        }
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: description,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <DollarSign className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Login FluxoPro</CardTitle>
          <CardDescription>
            Digite seu celular e senha para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Seu número de celular"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{' '}
            <Link href="/signup" className="underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
