import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Engine — cinematic loading state for AI generation.
 *
 * 8 orbital nodes (one per engine layer), tilted ring, central core, energy
 * arcs that draw between the currently-active range, postprocessed bloom,
 * kinetic-typography overlay. Replaces the linear step list previously
 * shown during the 10–60s engine run.
 *
 * The dashboard hands us a `step: 0–3` based on elapsed time. We expand
 * that to an active layer index (0–7) via our own ticker so the visual
 * progression is smooth even when the step prop doesn't change.
 *
 * Performance:
 *  - dpr capped at [1, 1.75] so 4K screens don't melt the GPU
 *  - 8 spheres + 2-3 line segments per frame — well under any budget
 *  - Bloom mipmapBlur off the active range only (luminanceThreshold gates)
 *  - Respects prefers-reduced-motion: returns a static still frame
 *
 * Bundle:
 *  - Whole module is lazy-imported by GenerateTab. The three.js + R3F +
 *    drei + postprocessing chunk (~280KB gz) only loads when the user
 *    generates, never on initial dashboard mount.
 */

interface EngineProps {
  /** 0–3 high-level step from GenerateTab's elapsed-time heuristic. */
  step: number;
  /** Optional cancel — present, the X button fires it. */
  onCancel?: () => void;
}

const LAYERS = [
  { id: 0, name: "Ingestion", detail: "Reading PR · commits · diffs" },
  { id: 1, name: "Static Metrics", detail: "Cyclomatic · churn · Halstead" },
  { id: 2, name: "Dependency Graph", detail: "PageRank · centrality · cycles" },
  { id: 3, name: "Impact Profile", detail: "Scoring 8 dimensions" },
  { id: 4, name: "Invisible Work", detail: "Refactor · perf · tech debt" },
  { id: 5, name: "Narrative", detail: "LinkedIn · resume · thread" },
  { id: 6, name: "Verification", detail: "Citation evidence" },
  { id: 7, name: "Continuous Learning", detail: "Voice memory · feedback" },
] as const;

const N = LAYERS.length;
const RING_RADIUS = 2.4;
const RING_TILT = Math.PI / 8;

function nodePosition(i: number): [number, number, number] {
  // Distribute on a tilted circle in XY, then rotate by RING_TILT around X
  // so the ring appears in perspective rather than flat to camera.
  const theta = (i / N) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(theta) * RING_RADIUS;
  const y0 = Math.sin(theta) * RING_RADIUS;
  // Apply tilt around X axis: (x, y, z) -> (x, y·cos − z·sin, y·sin + z·cos)
  const y = y0 * Math.cos(RING_TILT);
  const z = y0 * Math.sin(RING_TILT);
  return [x, y, z];
}

// Cubic-easing curve from the engine center to an orbital node, with a
// midpoint kicked outward so the line reads as a "energy arc" instead of a
// straight ray.
function arcPoints(
  end: [number, number, number],
  segments = 22,
): [number, number, number][] {
  const start: [number, number, number] = [0, 0, 0];
  const points: [number, number, number][] = [];
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    // Quadratic bezier with control point lifted away from origin so the
    // arc bows outward toward the node, not through it.
    const cx = end[0] * 0.5 + (end[1] / RING_RADIUS) * 0.4;
    const cy = end[1] * 0.5 - (end[0] / RING_RADIUS) * 0.4;
    const cz = end[2] * 0.5 + 0.3;
    const x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * cx + t ** 2 * end[0];
    const y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * cy + t ** 2 * end[1];
    const z = (1 - t) ** 2 * start[2] + 2 * (1 - t) * t * cz + t ** 2 * end[2];
    points.push([x, y, z]);
  }
  return points;
}

function Core({ active }: { active: number }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = meshRef.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    // Soft idle breathing + spikes when an active layer is "burning".
    const breathe = 0.94 + Math.sin(t * 1.8) * 0.05;
    const spike = active >= 0 ? 1 + Math.sin(t * 6 + active) * 0.04 : 1;
    const s = breathe * spike;
    m.scale.set(s, s, s);
  });
  return (
    <Float speed={2.4} rotationIntensity={0.4} floatIntensity={0.25}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.32, 48, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Halo shell — a slightly larger transparent sphere so bloom picks
          it up as a soft corona around the core. */}
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshBasicMaterial
          color="#6FA8FF"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </Float>
  );
}

function Node({
  index,
  active,
  reached,
}: {
  index: number;
  active: boolean;
  reached: boolean;
}) {
  const ref = React.useRef<THREE.Mesh>(null);
  const pos = React.useMemo(() => nodePosition(index), [index]);
  const baseColor = active ? "#FFFFFF" : reached ? "#7DD3FC" : "#1E3A8A";
  // Dormant nodes still emit a tiny bit so bloom paints a faint dot at every
  // ring position — sets the stage even when nothing's active there yet.
  const baseOpacity = active ? 1 : reached ? 0.85 : 0.45;

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    const phase = (index / N) * Math.PI * 2;
    const breathe = active
      ? 1 + Math.sin(t * 5 + phase) * 0.18
      : reached
        ? 0.95 + Math.sin(t * 1.6 + phase) * 0.04
        : 0.85;
    m.scale.set(breathe, breathe, breathe);
  });

  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[active ? 0.16 : 0.1, 24, 24]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={baseOpacity}
        />
      </mesh>
      {/* Outer glow ring — flat disc facing the camera, scaled when active.
          The bloom pass picks the bright pixels off this for the corona. */}
      {(active || reached) && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.18, 0.32, 32]} />
          <meshBasicMaterial
            color={active ? "#A5C9FF" : "#3B82F6"}
            transparent
            opacity={active ? 0.6 : 0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

function Arc({ toIndex, intensity }: { toIndex: number; intensity: number }) {
  const points = React.useMemo(
    () => arcPoints(nodePosition(toIndex)),
    [toIndex],
  );
  return (
    <Line
      points={points}
      color={"#A5C9FF"}
      lineWidth={1.5}
      transparent
      opacity={0.55 * intensity}
    />
  );
}

function Starfield() {
  const ref = React.useRef<THREE.Points>(null);
  const COUNT = 240;
  const positions = React.useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Spread on a sphere shell well behind the action so motion parallax
      // reads. Radius 8–14 keeps them visible at fov=50.
      const r = 8 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      // Bias z toward negative — stars behind the action, not surrounding it.
      arr[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 2;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    // Imperceptibly slow rotation gives the impression of subtle camera
    // drift without actually moving the camera (which would mess with the
    // parallax handler).
    p.rotation.y = clock.getElapsedTime() * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#5B7BBF"
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}

function CameraParallax() {
  // Cursor-reactive parallax — moves the camera a small amount toward the
  // mouse. Bounded so we never tilt off-axis enough to break the ring layout.
  const { camera, gl } = useThree();
  const target = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      target.current.x = nx * 0.6;
      target.current.y = ny * 0.4;
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [gl]);
  useFrame(() => {
    // Lerp toward target each frame — gives the camera weight.
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (-target.current.y - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ activeRange }: { activeRange: [number, number] }) {
  const [lo, hi] = activeRange;
  const activeIndices = React.useMemo(() => {
    const out: number[] = [];
    for (let i = lo; i <= hi; i++) out.push(i);
    return out;
  }, [lo, hi]);

  return (
    <>
      <color attach="background" args={["#040614"]} />
      <fog attach="fog" args={["#040614", 6, 16]} />
      <CameraParallax />
      <Starfield />
      <Core active={hi} />
      {Array.from({ length: N }).map((_, i) => (
        <Node key={i} index={i} active={i >= lo && i <= hi} reached={i < lo} />
      ))}
      {activeIndices.map((i, k) => (
        <Arc
          key={i}
          toIndex={i}
          intensity={0.6 + (k / Math.max(activeIndices.length - 1, 1)) * 0.4}
        />
      ))}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.42}
          luminanceSmoothing={0.28}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

// Map the dashboard's 0–3 high-level step to a band of active layers.
// Internal ticker drifts the active index inside that band so the
// visualization keeps moving even when `step` is stable for 10s+.
function useActiveRange(step: number): [number, number] {
  const bands: Array<[number, number]> = [
    [0, 1], // 0-3s
    [1, 3], // 3-9s
    [3, 5], // 9-18s
    [5, 7], // 18s+
  ];
  const band = bands[Math.min(step, bands.length - 1)];
  // Sub-tick drift inside the band — moves the trailing edge forward over
  // ~4s so the active arc keeps creeping rightward even at a stable step.
  const [drift, setDrift] = React.useState(0);
  React.useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - started) / 1000;
      setDrift(Math.min(1, t / 4));
    }, 100);
    return () => clearInterval(id);
  }, [step]);
  const span = band[1] - band[0];
  const hi = band[0] + Math.round(span * drift);
  return [band[0], Math.max(hi, band[0])];
}

export function Engine({ step, onCancel }: EngineProps) {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [lo, hi] = useActiveRange(step);
  const activeLayer = LAYERS[hi] ?? LAYERS[0];

  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative h-[640px] rounded-[2rem] border border-white/5 overflow-hidden bg-[#040614] isolate"
    >
      {/* Canvas — only mounted when motion is allowed; reduced-motion falls
          back to a static gradient with the same overlay so the section
          still has the cinematic UI but no GPU work. */}
      {!reduced ? (
        <Canvas
          className="absolute inset-0"
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 5.6], fov: 50 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
          }}
        >
          <Scene activeRange={[lo, hi]} />
        </Canvas>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 45%, rgba(120,160,255,0.18), transparent 70%), radial-gradient(40% 60% at 70% 70%, rgba(70,120,255,0.10), transparent 70%)",
          }}
        />
      )}

      {/* Ambient vignette — pulls focus to the center of the canvas and
          lets the typography overlay read against the brighter middle. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, transparent 50%, rgba(2,4,12,0.6) 100%)",
        }}
      />

      {/* DOM overlay */}
      <div className="absolute inset-0 flex flex-col p-8 md:p-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.06] backdrop-blur-xl"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-300" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200/90">
              Engine Live
            </span>
          </motion.div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/40 font-mono">
              <Sparkles className="h-3 w-3" />
              {formatElapsed(elapsed)}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 font-mono px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
              {String(hi + 1).padStart(2, "0")}{" "}
              <span className="text-white/30">
                / {String(N).padStart(2, "0")}
              </span>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                aria-label="Cancel generation"
                className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 grid place-items-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Centered kinetic typography */}
        <div className="flex-1 grid place-items-center">
          <div className="text-center pointer-events-none select-none">
            <motion.div
              key={`label-${hi}`}
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[10px] font-black tracking-[0.5em] text-blue-200/60 uppercase mb-4"
            >
              Layer {String(hi).padStart(2, "0")}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.h2
                key={`name-${hi}`}
                initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(10px)" }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl md:text-7xl font-black tracking-[-0.04em] leading-[0.9] text-balance text-white"
              >
                {activeLayer.name}
              </motion.h2>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={`detail-${hi}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 0.75, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="mt-5 text-sm md:text-base text-white/60 max-w-md mx-auto font-medium"
              >
                {activeLayer.detail}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom progress strip — 8 ticks, fills as layers complete. */}
        <div className="flex items-center gap-2">
          {LAYERS.map((l, i) => (
            <div
              key={l.id}
              className="flex-1 h-[2px] rounded-full overflow-hidden bg-white/5"
            >
              <motion.div
                className={cn(
                  "h-full rounded-full origin-left",
                  i < lo
                    ? "bg-gradient-to-r from-blue-400/80 to-blue-200/60"
                    : i >= lo && i <= hi
                      ? "bg-gradient-to-r from-blue-300 to-white"
                      : "bg-white/0",
                )}
                initial={{ scaleX: 0 }}
                animate={{
                  scaleX: i < lo ? 1 : i >= lo && i <= hi ? 0.6 : 0,
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default Engine;
