'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { CategoryChart, MonthlyFlowChart } from '@/components/dashboard/Charts';

type FlowPoint = { month: string; income: number; expenses: number };
type CategoryPoint = { category: string; total: number; fill: string };

function hexToColor(hex: string, fallback: string) {
  try {
    return new THREE.Color(hex || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
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

export function Live3DFlowChart({ data }: { data: FlowPoint[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isBalanceVisible } = useData();
  const supported = useWebGLSupport();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !supported || data.length === 0) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0b0f, 12, 28);
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 100);
    camera.position.set(11, 8.5, 14);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff4d6, 0.55));
    const key = new THREE.DirectionalLight(0xffd56a, 1.35);
    key.position.set(6, 12, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x7ad3ff, 0.35);
    fill.position.set(-8, 4, -4);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshStandardMaterial({ color: 0x14141c, metalness: 0.35, roughness: 0.55 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const maxValue = Math.max(...data.flatMap((item) => [item.income, item.expenses, 1]));
    const group = new THREE.Group();
    scene.add(group);

    const bars: Array<{ mesh: THREE.Mesh; target: number; label: string; value: number }> = [];
    data.forEach((point, index) => {
      const x = index * 1.15 - ((data.length - 1) * 1.15) / 2;
      const incomeH = Math.max(0.18, (point.income / maxValue) * 5.8);
      const expenseH = Math.max(0.18, (point.expenses / maxValue) * 5.8);

      const incomeMat = new THREE.MeshStandardMaterial({
        color: 0xd4b15f,
        metalness: 0.72,
        roughness: 0.22,
        emissive: 0x3a2a08,
      });
      const expenseMat = new THREE.MeshStandardMaterial({
        color: 0xc45b5b,
        metalness: 0.55,
        roughness: 0.28,
        emissive: 0x2a0b0b,
      });

      const incomeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1, 0.42), incomeMat);
      incomeMesh.position.set(x - 0.28, 0.5, 0);
      incomeMesh.scale.y = 0.01;
      group.add(incomeMesh);
      bars.push({ mesh: incomeMesh, target: incomeH, label: `${point.month} · Receitas`, value: point.income });

      const expenseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1, 0.42), expenseMat);
      expenseMesh.position.set(x + 0.28, 0.5, 0);
      expenseMesh.scale.y = 0.01;
      group.add(expenseMesh);
      bars.push({ mesh: expenseMesh, target: expenseH, label: `${point.month} · Despesas`, value: point.expenses });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let lastX = 0;
    let rotY = 0.35;

    const onMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (dragging) {
        rotY += (event.clientX - lastX) * 0.006;
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
      bars.forEach((bar) => {
        bar.mesh.scale.y += (bar.target - bar.mesh.scale.y) * 0.08;
        bar.mesh.position.y = bar.mesh.scale.y / 2;
      });
      group.rotation.y = rotY + Math.sin(t * 0.35) * 0.12;
      group.position.y = Math.sin(t * 0.9) * 0.04;

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(bars.map((item) => item.mesh))[0];
      const tooltip = tooltipRef.current;
      if (tooltip) {
        if (hit) {
          const bar = bars.find((item) => item.mesh === hit.object);
          if (bar) {
            tooltip.style.opacity = '1';
            tooltip.textContent = isBalanceVisible
              ? `${bar.label}: ${formatCurrency(bar.value)}`
              : `${bar.label}: •••••`;
          }
        } else {
          tooltip.style.opacity = '0';
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
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
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((material) => material.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [data, isBalanceVisible, supported]);

  if (!supported) return <MonthlyFlowChart data={data} />;

  return (
    <Card className="luxury-card h-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-headline text-2xl">Fluxo 3D ao vivo</CardTitle>
          <CardDescription>Receitas vs. despesas dos últimos 12 meses</CardDescription>
        </div>
        <LiveBadge />
      </CardHeader>
      <CardContent className="relative">
        <div ref={mountRef} className="h-[340px] w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_top,_rgba(212,177,95,0.16),_transparent_55%)]" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute left-6 top-4 rounded-md border border-primary/20 bg-background/90 px-3 py-1 text-xs opacity-0 shadow-lg backdrop-blur"
        />
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[#d4b15f]" /> Receitas</span>
          <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[#c45b5b]" /> Despesas</span>
          <span>Arraste para girar</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Live3DCategoryChart({ data }: { data: CategoryPoint[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isBalanceVisible } = useData();
  const supported = useWebGLSupport();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !supported) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 7.2, 9.5);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff6df, 0.6));
    const light = new THREE.PointLight(0xffd978, 40, 30);
    light.position.set(2, 8, 4);
    scene.add(light);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.45, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.8, roughness: 0.25 })
    );
    scene.add(core);

    const group = new THREE.Group();
    scene.add(group);
    const total = data.reduce((sum, item) => sum + item.total, 0) || 1;
    const slices: Array<{ mesh: THREE.Mesh; label: string; value: number }> = [];
    let angle = 0;

    data.forEach((item) => {
      const slice = (item.total / total) * Math.PI * 2;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.absarc(0, 0, 3.1, angle, angle + Math.max(slice, 0.08), false);
      shape.lineTo(0, 0);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.72, bevelEnabled: false });
      const material = new THREE.MeshStandardMaterial({
        color: hexToColor(item.fill, '#d4b15f'),
        metalness: 0.45,
        roughness: 0.32,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.2;
      group.add(mesh);
      slices.push({ mesh, label: item.category, value: item.total });
      angle += slice;
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
      group.rotation.y += 0.006;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(slices.map((item) => item.mesh))[0];
      const tooltip = tooltipRef.current;
      if (tooltip) {
        if (hit) {
          const slice = slices.find((item) => item.mesh === hit.object);
          if (slice) {
            tooltip.style.opacity = '1';
            tooltip.textContent = isBalanceVisible
              ? `${slice.label}: ${formatCurrency(slice.value)}`
              : `${slice.label}: •••••`;
          }
        } else {
          tooltip.style.opacity = '0';
        }
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
  }, [data, isBalanceVisible, supported]);

  if (!supported) return <CategoryChart data={data} />;

  return (
    <Card className="luxury-card h-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-headline text-2xl">Categorias 3D</CardTitle>
          <CardDescription>Distribuição animada das despesas do mês</CardDescription>
        </div>
        <LiveBadge />
      </CardHeader>
      <CardContent className="relative">
        <div ref={mountRef} className="h-[340px] w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,_rgba(212,177,95,0.14),_transparent_58%)]" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute left-6 top-4 rounded-md border border-primary/20 bg-background/90 px-3 py-1 text-xs opacity-0 shadow-lg backdrop-blur"
        />
        {data.length === 0 && (
          <p className="absolute inset-x-0 top-1/2 text-center text-sm text-muted-foreground">Sem despesas no período.</p>
        )}
      </CardContent>
    </Card>
  );
}
