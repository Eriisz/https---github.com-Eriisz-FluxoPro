'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader, PlusCircle } from 'lucide-react';
import type { Goal } from '@/lib/definitions';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalDialog } from '@/components/goals/GoalDialog';
import { useData } from '@/context/DataContext';

export default function GoalsPage() {
  const { goals, isLoading } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);

  const handleAddGoal = () => {
    setSelectedGoal(undefined);
    setDialogOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedGoal(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const sortedGoals = (goals || []).sort((a,b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Minhas Metas">
        <Button onClick={handleAddGoal}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Meta
        </Button>
      </PageHeader>
      
      {sortedGoals && sortedGoals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">Nenhuma meta encontrada</h2>
            <p className="text-muted-foreground mt-2 mb-4">Comece a planejar seu futuro financeiro adicionando uma nova meta.</p>
            <Button onClick={handleAddGoal}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeira Meta
            </Button>
        </div>
      )}

      <GoalDialog
        isOpen={dialogOpen}
        onOpenChange={handleDialogClose}
        goal={selectedGoal}
      />
    </div>
  );
}
