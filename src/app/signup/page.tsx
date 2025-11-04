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
import { useAuth } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { FirebaseError } from 'firebase/app';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro de Cadastro',
        description: 'As senhas não coincidem.',
      });
      return;
    }
    try {
        // We are using a dummy domain since we are using phone number as the identifier
        const email = `${phone}@fluxopro.com`;
        const userCredential = await initiateEmailSignUp(auth, email, password);

        // The user object is available in the credential post-signup.
        if (userCredential && userCredential.user) {
            const user = userCredential.user;
            const userRef = doc(firestore, 'users', user.uid);
            setDocumentNonBlocking(userRef, {
                id: user.uid,
                name: name,
                phoneNumber: phone,
                createdAt: new Date().toISOString(),
            }, { merge: true });
        }
        

        toast({
            title: 'Cadastro realizado com sucesso!',
            description: 'Redirecionando para o login...',
        });
        router.push('/login');
    } catch (error: any) {
        let description = 'Ocorreu um erro desconhecido. Tente novamente.';
        if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
            description = 'Este número de celular já está em uso. Tente fazer login.';
        } else if (error instanceof FirebaseError && error.code === 'auth/weak-password') {
            description = 'A senha é muito fraca. Ela deve ter pelo menos 6 caracteres.';
        }
        else if (error.message) {
            description = error.message;
        }
        
        toast({
            variant: 'destructive',
            title: 'Erro de Cadastro',
            description: description,
        });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <DollarSign className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Criar Conta FluxoPro</CardTitle>
          <CardDescription>
            Preencha seus dados para começar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Seu número de celular"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full">
              Criar Conta
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
