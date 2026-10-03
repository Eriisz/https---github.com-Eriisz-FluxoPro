'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useUser } from '@/firebase';
import { hasFeature, isPlan, type Plan, type PremiumFeature } from '@/lib/plans';

type PlanState = { plan: Plan; selectPlan: (plan: Plan) => void; allows: (feature: PremiumFeature) => boolean };
const PlanContext = createContext<PlanState | null>(null);
export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const key = `fluxopro:plan-simulation:${user?.uid || 'demo'}`;
  const [selection, setSelection] = useState<{ key: string; plan: Plan }>({ key: '', plan: 'free' });
  useEffect(() => {
    let plan: Plan = 'free';
    try { const stored = localStorage.getItem(key); if (isPlan(stored)) plan = stored; } catch { /* In-memory simulation still works. */ }
    setSelection({ key, plan });
  }, [key]);
  const plan = selection.key === key ? selection.plan : 'free';
  function selectPlan(next: Plan) {
    if (!isPlan(next)) return;
    setSelection({ key, plan: next });
    try { localStorage.setItem(key, next); } catch { /* Optional persistence. */ }
  }
  return <PlanContext.Provider value={{ plan, selectPlan, allows: feature => hasFeature(plan, feature) }}>{children}</PlanContext.Provider>;
}
export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) throw new Error('PlanProvider ausente.');
  return context;
}
