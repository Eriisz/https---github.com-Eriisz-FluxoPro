import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4", className)}>
      <h1 className="text-3xl font-bold text-white font-headline tracking-tight">{title}</h1>
      {children && <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">{children}</div>}
    </div>
  );
}
