"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  DollarSign,
  Landmark,
  LayoutDashboard,
  Wallet,
  Settings,
  Tags,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Painel', icon: LayoutDashboard },
  { href: '/history', label: 'Histórico', icon: Wallet },
  { href: '/accounts', label: 'Contas', icon: Landmark },
  { href: '/categories', label: 'Categorias', icon: Tags },
  { href: '/budgets', label: 'Orçamentos', icon: DollarSign },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
              <Link href={item.href} legacyBehavior passHref>
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
