
"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  DollarSign,
  Landmark,
  LayoutDashboard,
  Wallet,
  Settings,
  Tags,
  Menu,
  LogOut,
  Loader,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import type { User as UserProfile } from '@/lib/definitions';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


const navItems = [
  { href: '/', label: 'Painel', icon: LayoutDashboard },
  { href: '/history', label: 'Histórico', icon: Wallet },
  { href: '/accounts', label: 'Contas', icon: Landmark },
  { href: '/categories', label: 'Categorias', icon: Tags },
  { href: '/budgets', label: 'Orçamentos', icon: DollarSign },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);


  React.useEffect(() => {
    // Redirect to login if user is not loaded and not on an auth page
    if (!isUserLoading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [isUserLoading, user, isAuthPage, router]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isUserLoading || (!user && !isAuthPage)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }
  
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  }


  const sidebarContent = (
    <>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-white font-headline">FluxoPro</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  className="text-base"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
             <SidebarMenuItem>
                <Link href="/settings">
                    <SidebarMenuButton isActive={pathname === '/settings'} className="text-base">
                        <Settings className="w-5 h-5" />
                        <span>Ajustes</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-base">
                    <LogOut className="w-5 h-5" />
                    <span>Sair</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="p-4 border-t border-border mt-2">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>
                        {isProfileLoading ? <Loader className="w-4 h-4 animate-spin"/> : getInitials(userProfile?.name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-semibold">{isProfileLoading ? 'Carregando...' : userProfile?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{userProfile?.phoneNumber}</p>
                </div>
            </div>
        </div>
      </SidebarFooter>
    </>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <div className="hidden md:block">
          <Sidebar>{sidebarContent}</Sidebar>
        </div>
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-10 flex items-center h-16 px-4 border-b bg-background/80 backdrop-blur-sm md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-card border-r-0">
                <Sidebar variant="sidebar">{sidebarContent}</Sidebar>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2 ml-4">
              <DollarSign className="w-7 h-7 text-primary" />
              <h1 className="text-xl font-bold text-white font-headline">FluxoPro</h1>
            </Link>
          </header>
          <SidebarInset>
            <main className="flex-1 p-4 md:p-8">{children}</main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
