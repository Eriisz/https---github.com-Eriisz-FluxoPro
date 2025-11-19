
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { Goal } from "@/lib/definitions";
import { PlusCircle, Target } from "lucide-react";
import { GoalDialog } from '../goals/GoalDialog';

interface GoalsCarouselProps {
  goals: Goal[];
}

export function GoalsCarousel({ goals }: GoalsCarouselProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!goals || goals.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed">
            <Target className="w-12 h-12 text-muted-foreground mb-4"/>
            <h2 className="text-xl font-semibold">Comece a Sonhar!</h2>
            <p className="text-muted-foreground mt-2 mb-4 max-w-sm">Crie sua primeira meta financeira e acompanhe seu progresso para transformar seus sonhos em realidade.</p>
            <Button onClick={() => setDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeira Meta
            </Button>
            <GoalDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} />
        </Card>
    );
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: goals.length > 2,
      }}
      className="w-full"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Minhas Metas</h2>
        <div className="flex items-center gap-2">
            <Link href="/goals">
                <Button variant="outline" size="sm">Ver Todas</Button>
            </Link>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Nova Meta
            </Button>
        </div>
      </div>
      <CarouselContent>
        {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            return (
                <CarouselItem key={goal.id} className="md:basis-1/2">
                    <div className="p-1">
                    <Card>
                        <CardHeader>
                        <CardTitle>{goal.name}</CardTitle>
                        <CardDescription>
                            Alvo: {formatCurrency(goal.targetAmount)}
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <div className="flex justify-between text-sm">
                            <span className="font-medium text-primary">
                                {formatCurrency(goal.currentAmount)}
                            </span>
                            <span className="text-muted-foreground">
                                {progress.toFixed(0)}%
                            </span>
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                    </div>
                </CarouselItem>
            )
        })}
      </CarouselContent>
      {goals.length > 2 && (
        <>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
        </>
      )}
       <GoalDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} />
    </Carousel>
  );
}
