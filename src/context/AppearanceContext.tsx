'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorPalette = 'gold' | 'ocean' | 'forest' | 'ruby' | 'graphite';

type AppearanceState = {
  mode: ThemeMode;
  palette: ColorPalette;
  colorblind: boolean;
  compact: boolean;
};

type AppearanceContextValue = AppearanceState & {
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ColorPalette) => void;
  setColorblind: (value: boolean) => void;
  setCompact: (value: boolean) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

function applyAppearance(state: AppearanceState) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = state.mode === 'dark' || (state.mode === 'system' && systemDark);
  root.classList.toggle('dark', isDark);
  root.dataset.palette = state.palette;
  root.dataset.colorblind = state.colorblind ? 'on' : 'off';
  root.dataset.density = state.compact ? 'compact' : 'comfortable';
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppearanceState>({
    mode: 'system',
    palette: 'gold',
    colorblind: false,
    compact: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mode = (localStorage.getItem('theme') as ThemeMode) || 'system';
    const palette = (localStorage.getItem('palette') as ColorPalette) || 'gold';
    const colorblind = localStorage.getItem('colorblind') === '1';
    const compact = localStorage.getItem('compact') === '1';
    const next = { mode, palette, colorblind, compact };
    setState(next);
    applyAppearance(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyAppearance(state);
    if (state.mode === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', state.mode);
    localStorage.setItem('palette', state.palette);
    localStorage.setItem('colorblind', state.colorblind ? '1' : '0');
    localStorage.setItem('compact', state.compact ? '1' : '0');
  }, [state, ready]);

  const setMode = useCallback((mode: ThemeMode) => setState((prev) => ({ ...prev, mode })), []);
  const setPalette = useCallback((palette: ColorPalette) => setState((prev) => ({ ...prev, palette })), []);
  const setColorblind = useCallback((colorblind: boolean) => setState((prev) => ({ ...prev, colorblind })), []);
  const setCompact = useCallback((compact: boolean) => setState((prev) => ({ ...prev, compact })), []);

  const value = useMemo(
    () => ({ ...state, setMode, setPalette, setColorblind, setCompact }),
    [state, setMode, setPalette, setColorblind, setCompact]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return context;
}
