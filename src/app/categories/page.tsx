'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader, PlusCircle } from 'lucide-react';
import type { Category } from '@/lib/definitions';
import { CategoriesTable } from '@/components/categories/CategoriesTable';
import { CategoryDialog } from '@/components/categories/CategoryDialog';
import { useData } from '@/context/DataContext';

export default function CategoriesPage() {
  const { categories, isLoading } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Categorias">
        <Button onClick={handleAddCategory}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Categoria
        </Button>
      </PageHeader>

      <CategoriesTable categories={categories || []} onEdit={handleEditCategory} />

      <CategoryDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
      />
    </div>
  );
}
