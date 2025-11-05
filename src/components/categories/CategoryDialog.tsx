'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Category } from '@/lib/definitions';
import { CategoryForm } from './CategoryForm';

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Partial<Category>;
}

export function CategoryDialog({ isOpen, onOpenChange, category }: CategoryDialogProps) {
  const handleFormSubmit = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{category && category.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</DialogTitle>
          <DialogDescription>
            {category && category.id ? 'Atualize os detalhes da sua categoria.' : 'Preencha os detalhes da nova categoria.'}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm existingCategory={category} onFormSubmit={handleFormSubmit} />
      </DialogContent>
    </Dialog>
  );
}
