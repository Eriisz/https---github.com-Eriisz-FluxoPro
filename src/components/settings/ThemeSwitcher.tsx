
'use client';

import { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Moon, Sun, Computer } from 'lucide-react';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'system';
    setTheme(storedTheme);
  }, []);
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
      localStorage.removeItem('theme');
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  return (
    <div>
        <Label className="mb-3 block">Tema</Label>
        <RadioGroup value={theme} onValueChange={handleThemeChange} className="flex flex-col sm:flex-row gap-4">
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
  );
}
