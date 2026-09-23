'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Computer, Eye, Moon, Sun } from 'lucide-react';
import { useAppearance, type ColorPalette } from '@/context/AppearanceContext';

const PALETTES: Array<{ id: ColorPalette; label: string; swatch: string }> = [
  { id: 'gold', label: 'Ouro', swatch: '#c9a227' },
  { id: 'ocean', label: 'Oceano', swatch: '#1d7ea8' },
  { id: 'forest', label: 'Floresta', swatch: '#2f6b4f' },
  { id: 'ruby', label: 'Rubi', swatch: '#a33b4a' },
  { id: 'graphite', label: 'Grafite', swatch: '#5c6570' },
];

export function ThemeSwitcher() {
  const { mode, palette, colorblind, setMode, setPalette, setColorblind } = useAppearance();

  return (
    <div className="space-y-8">
      <div>
        <Label className="mb-3 block">Tema</Label>
        <RadioGroup value={mode} onValueChange={(value) => setMode(value as typeof mode)} className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
              <Sun className="h-4 w-4" /> Claro
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
              <Moon className="h-4 w-4" /> Escuro
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
              <Computer className="h-4 w-4" /> Sistema
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="mb-3 block">Cores do aplicativo</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PALETTES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPalette(item.id)}
              className={`rounded-xl border p-3 text-left transition ${
                palette === item.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="mb-2 block h-8 w-full rounded-md" style={{ background: item.swatch }} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
        <div>
          <Label htmlFor="colorblind" className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Modo daltônico
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Troca vermelho/verde por azul e laranja, paleta segura para daltonismo.
          </p>
        </div>
        <Switch id="colorblind" checked={colorblind} onCheckedChange={setColorblind} />
      </div>
    </div>
  );
}
