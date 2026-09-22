'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { useAppearance } from '@/context/AppearanceContext';
import { CategoryChart, MonthlyFlowChart } from '@/components/dashboard/Charts';

type FlowPoint = { month: string; income: number; expenses: number };
type CategoryPoint = { category: string; total: number; fill: string };

const COLORBLIND = ['#0072B2', '#E69F00', '#56B4E9', '#F0E442', '#CC79A7', '#009E73', '#D55E00', '#000000'];

function hslToColor(raw: string, fallback: string) {
  try {
    return new THREE.Color(`hsl(${raw.trim()})`);
  } catch {
    return new THREE.Color(fallback);
  }
}

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    income: hslToColor(style.getPropertyValue('--income') || style.getPropertyValue('--primary'), '#d4b15f'),
    expense: hslToColor(style.getPropertyValue('--expense') || style.getPropertyValue('--destructive'), '#e69f00'),
    primary: hslToColor(style.getPropertyValue('--primary'), '#d4b15f'),
  };
}

function useWebGLSupport() {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      setSupported(Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-primary">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      AO VIVO
    </span>
  );
}

function makeParticles(count: number, color: THREE.Color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 0.045, transparent: true, opacity: 0.55 });
  return new THREE.Points(geometry, material);
}

export function Live3DFlowChart({ data }: { data: FlowPoint[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isBalanceVisible } = useData();
  const { palette, colorblind, compact } = useAppearance();
  const supported = useWebGLSupport();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !supported || data.length === 0) return;
    const colors = themeColors();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070c, 0.045);
    const camera = new THREE.PerspectiveCamera(36, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 80);
    camera.position.set(10.5, 7.2, 13.5);
    camera.lookAt(0, 1.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff1cc, 0x12121a, 0.85));
    const key = new THREE.SpotLight(colors.primary, 18, 28, 0.55, 0.4, 1);
    key.position.set(6, 12, 8);
    scene.add(key);
    const fill = new THREE.PointLight(0x7ad3ff, 8, 22);
    fill.position.set(-7, 5, -3);
    scene.add(fill);
    const sweep = new THREE.PointLight(colors.income, 10, 16);
    scene.add(sweep);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 72),
      new THREE.MeshStandardMaterial({ color: 0x101018, metalness: 0.82, roughness: 0.22 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.035, 12, 80),
      new THREE.MeshBasicMaterial({ color: colors.primary })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
    const grid = new THREE.GridHelper(16, 24, 0x3a3424, 0x1b1b22);
    grid.position.y = 0.01;
    scene.add(grid);
    const particles = makeParticles(compact ? 80 : 160, colors.primary);
    scene.add(particles);

    const maxValue = Math.max(...data.flatMap((item) => [item.income, item.expenses, 1]));
    const group = new THREE.Group();
    scene.add(group);
    const bars: Array<{ mesh: THREE.Mesh; glow: THREE.Mesh; target: number; label: string; value: number }> = [];

    data.forEach((point, index) => {
      const x = index * 1.05 - ((data.length - 1) * 1.05) / 2;
      const pairs = [
        { value: point.income, x: x - 0.26, color: colors.income, label: `${point.month} · Receitas` },
        { value: point.expenses, x: x + 0.26, color: colors.expense, label: `${point.month} · Despesas` },
      ];
      pairs.forEach((item) => {
        const height = Math.max(0.25, (item.value / maxValue) * 5.6);
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 1, 20),
          new THREE.MeshStandardMaterial({
            color: item.color,
            metalness: 0.78,
            roughness: 0.18,
            emissive: item.color,
            emissiveIntensity: 0.18,
          })
        );
        mesh.position.set(item.x, 0.5, 0);
        mesh.scale.y = 0.02;
        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.3, 1, 16),
          new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.12 })
        );
        glow.position.copy(mesh.position);
        glow.scale.y = 0.02;
        group.add(mesh, glow);
        bars.push({ mesh, glow, target: height, label: item.label, value: item.value });
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let lastX = 0;
    let rotY = 0.42;
    const onMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (dragging) {
        rotY += (event.clientX - lastX) * 0.007;
        lastX = event.clientX;
      }
    };
    const onDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      bars.forEach((bar, index) => {
        bar.mesh.scale.y += (bar.target - bar.mesh.scale.y) * 0.09;
        bar.glow.scale.y = bar.mesh.scale.y * 1.04;
        bar.mesh.position.y = bar.mesh.scale.y / 2;
        bar.glow.position.y = bar.mesh.position.y;
        bar.mesh.rotation.y = t * 0.3 + index * 0.04;
      });
      group.rotation.y = rotY + Math.sin(t * 0.28) * 0.08;
      particles.rotation.y = t * 0.05;
      sweep.position.set(Math.cos(t * 0.7) * 6, 4.5 + Math.sin(t) * 0.6, Math.sin(t * 0.7) * 6);
      ring.rotation.z = t * 0.15;
      raycaster.setFromCamera(pointer, camera);
      const found = raycaster.intersectObjects(bars.map((item) => item.mesh))[0];
      const tooltip = tooltipRef.current;
      if (tooltip) {
        if (found) {
          const bar = bars.find((item) => item.mesh === found.object);
          if (bar) {
            tooltip.style.opacity = '1';
            tooltip.textContent = isBalanceVisible ? `${bar.label}: ${formatCurrency(bar.value)}` : `${bar.label}: •••••`;
          }
        } else tooltip.style.opacity = '0';
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data, isBalanceVisible, supported, palette, colorblind, compact]);

  if (!supported) return <MonthlyFlowChart data={data} />;

  return (
    <Card className="luxury-card h-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-headline text-2xl">Fluxo 3D ao vivo</CardTitle>
          <CardDescription className="compact-hide">Cilindros metálicos, iluminação dinâmica e partículas</CardDescription>
        </div>
        <LiveBadge />
      </CardHeader>
      <CardContent className="relative">
        <div ref={mountRef} className="chart-stage h-[380px] w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/.22),_transparent_58%)]" />
        <div ref={tooltipRef} className="pointer-events-none absolute left-4 top-3 rounded-md border border-primary/20 bg-background/90 px-3 py-1 text-xs opacity-0 shadow-lg backdrop-blur" />
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[hsl(var(--income))]" /> Receitas</span>
          <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[hsl(var(--expense))]" /> Despesas</span>
          <span className="compact-hide">Arraste para orbitar</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Live3DCategoryChart({ data }: { data: CategoryPoint[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isBalanceVisible } = useData();
  const { palette, colorblind, compact } = useAppearance();
  const supported = useWebGLSupport();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !supported) return;
    const colors = themeColors();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070c, 0.05);
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 80);
    camera.position.set(0, 8.4, 10.2);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff6df, 0x101018, 0.9));
    const lamp = new THREE.PointLight(colors.primary, 22, 24);
    lamp.position.set(0, 7, 2);
    scene.add(lamp);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      new THREE.MeshStandardMaterial({ color: 0x101018, metalness: 0.8, roughness: 0.25 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const core = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.16, 18, 48),
      new THREE.MeshStandardMaterial({ color: colors.primary, metalness: 0.9, roughness: 0.15, emissive: colors.primary, emissiveIntensity: 0.45 })
    );
    core.rotation.x = Math.PI / 2;
    core.position.y = 0.9;
    scene.add(core);
    scene.add(makeParticles(compact ? 60 : 120, colors.primary));

    const group = new THREE.Group();
    scene.add(group);
    const max = Math.max(...data.map((item) => item.total), 1);
    const towers: Array<{ mesh: THREE.Mesh; label: string; value: number }> = [];

    data.forEach((item, index) => {
      const angle = (index / Math.max(data.length, 1)) * Math.PI * 2;
      const radius = 3.15;
      const height = Math.max(0.5, (item.total / max) * 4.8);
      const color = new THREE.Color(colorblind ? COLORBLIND[index % COLORBLIND.length] : item.fill || '#d4b15f');
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 1, 18),
        new THREE.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.2, emissive: color, emissiveIntensity: 0.16 })
      );
      mesh.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      mesh.scale.y = height;
      group.add(mesh);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12),
        new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.12, emissive: color, emissiveIntensity: 0.35 })
      );
      cap.position.set(mesh.position.x, height + 0.12, mesh.position.z);
      group.add(cap);
      towers.push({ mesh, label: item.category, value: item.total });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    renderer.domElement.addEventListener('pointermove', onMove);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      group.rotation.y += 0.007;
      core.rotation.z = t * 0.6;
      lamp.intensity = 18 + Math.sin(t * 2.2) * 4;
      raycaster.setFromCamera(pointer, camera);
      const found = raycaster.intersectObjects(towers.map((item) => item.mesh))[0];
      const tooltip = tooltipRef.current;
      if (tooltip) {
        if (found) {
          const tower = towers.find((item) => item.mesh === found.object);
          if (tower) {
            tooltip.style.opacity = '1';
            tooltip.textContent = isBalanceVisible ? `${tower.label}: ${formatCurrency(tower.value)}` : `${tower.label}: •••••`;
          }
        } else tooltip.style.opacity = '0';
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onMove);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data, isBalanceVisible, supported, palette, colorblind, compact]);

  if (!supported) return <CategoryChart data={data} />;

  return (
    <Card className="luxury-card h-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-headline text-2xl">Torres de categoria</CardTitle>
          <CardDescription className="compact-hide">Altura = valor. Gire com o olhar sobre cada torre.</CardDescription>
        </div>
        <LiveBadge />
      </CardHeader>
      <CardContent className="relative">
        <div ref={mountRef} className="chart-stage h-[380px] w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/.2),_transparent_60%)]" />
        <div ref={tooltipRef} className="pointer-events-none absolute left-4 top-3 rounded-md border border-primary/20 bg-background/90 px-3 py-1 text-xs opacity-0 shadow-lg backdrop-blur" />
        {data.length === 0 && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-muted-foreground">Sem despesas no período.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.slice(0, compact ? 4 : 8).map((item, index) => (
            <span key={item.category} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
              <i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: colorblind ? COLORBLIND[index % COLORBLIND.length] : item.fill }} />
              {item.category}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
