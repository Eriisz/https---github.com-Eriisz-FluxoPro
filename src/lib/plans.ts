export type Plan = 'free' | 'premium' | 'lifetime';
export type PremiumFeature = 'categoryBudgets' | 'reminderSettings' | 'forecast90' | 'csvImport' | 'reports';
export const planNames: Record<Plan, string> = { free: 'Free', premium: 'Premium', lifetime: 'Vitalício' };
export const featureNames: Record<PremiumFeature, string> = {
  categoryBudgets: 'Orçamentos por categoria', reminderSettings: 'Lembretes configuráveis',
  forecast90: 'Previsão diária de 90 dias', csvImport: 'Importação e conciliação CSV', reports: 'Relatórios e exportação PDF',
};
export function isPlan(value: unknown): value is Plan { return value === 'free' || value === 'premium' || value === 'lifetime'; }
// Product simulation only. Real subscriptions must come from a trusted billing backend.
export function hasFeature(plan: Plan, feature: PremiumFeature) { return Object.hasOwn(featureNames, feature) && (plan === 'premium' || plan === 'lifetime'); }
