import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";

/**
 * Hero shader backdrop — fullscreen WebGL fragment shader driving an
 * animated mesh-gradient field with chromatic noise warping and a
 * cursor-reactive distortion lens. Replaces NeuralBackground (2D canvas
 * particles) on the landing hero. The existing ambient red/blue glow
 * blobs in Hero.tsx still layer on top — they're CSS-only and the
 * shader is z-index 0 below them.
 *
 * Bundle:
 *   Lazy-imported by Hero. The first paint of the landing falls back
 *   to a CSS-only Suspense gradient so the marketing page never waits
 *   on the three.js chunk. Three is already a shared chunk because
 *   the Engine cinematic uses it too — most users hitting / after
 *   visiting /dashboard get this for free.
 *
 * Performance:
 *   - One ScreenQuad. 4 octaves of value noise per fragment. fwidth-free.
 *   - dpr capped at [1, 1.5] — the shader is screen-space, higher dpr
 *     mostly burns GPU on identical-looking pixels.
 *   - prefers-reduced-motion: returns null so the static CSS fallback
 *     in Hero.tsx is what users see. No subscribers, no rAF.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// FBM-driven mesh-gradient field. Three octaves of value noise sampled at
// slightly offset phases per RGB channel gives the chromatic shimmer
// without a separate aberration pass. The mouse uniform warps the UV
// inside a falloff radius so the cursor feels like it's pulling the field
// toward it, not just lighting it.
const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.07 + 17.13;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 uv = (vUv * 2.0 - 1.0) * aspect;

    vec2 mouseUv = (uMouse / uResolution) * 2.0 - 1.0;
    mouseUv *= aspect;
    mouseUv.y = -mouseUv.y; // flip Y to match canvas coords

    float mDist = distance(uv, mouseUv);
    // Pull the UV toward the mouse inside ~0.6 NDC units. Falls off quickly
    // so the lens doesn't smear the whole field.
    vec2 warped = uv + (mouseUv - uv) * 0.18 * exp(-mDist * 3.0);

    float t = uTime * 0.06;
    float n1 = fbm(warped * 1.4 + vec2(t, t * 0.55));
    float n2 = fbm(warped * 1.4 + vec2(t + 1.7, t * 0.55));
    float n3 = fbm(warped * 1.4 + vec2(t + 3.1, t * 0.55));

    // Brand palette — deep space → vivid indigo → accent crimson. The
    // first pass was too conservative; users couldn't tell the shader was
    // alive. Bumped midtones and accents up ~2x so the mesh-gradient
    // sweeps are obvious without overwhelming the headline above.
    vec3 cVoid    = vec3(0.022, 0.034, 0.090);
    vec3 cIndigo  = vec3(0.260, 0.215, 0.560);
    vec3 cCyan    = vec3(0.190, 0.380, 0.720);
    vec3 cCrimson = vec3(0.820, 0.230, 0.420);

    // Three-stop blend — adds a cool-bright cyan midband between the
    // dark void and the warm crimson highlight. Reads as "intelligence
    // flowing through a dark space" instead of just "starry purple".
    vec3 col = mix(cVoid, cIndigo, smoothstep(0.20, 0.70, n1));
    col = mix(col, cCyan, smoothstep(0.55, 0.85, n1 * n3) * 0.75);
    col = mix(col, cCrimson, smoothstep(0.72, 0.93, n2) * 0.65);

    // Per-channel breathing — separates RGB slightly so highlights
    // chromatic shimmer in place. Stronger now to match the louder palette.
    col.r *= 1.0 + (n1 - 0.5) * 0.32;
    col.g *= 1.0 + (n2 - 0.5) * 0.18;
    col.b *= 1.0 + (n3 - 0.5) * 0.36;

    // Soft radial vignette — pulls eyes toward the headline's vertical
    // band. Tightened so the corners deepen and the center stays open.
    float v = 1.0 - smoothstep(0.45, 1.40, length(uv) * 0.82);
    col *= mix(0.28, 1.05, v);

    // Cursor halo — bright lift near the mouse. Stronger now that the
    // base palette is brighter; still falls off fast (exp(-4d)) so it
    // doesn't smear the whole field.
    col += vec3(0.55, 0.70, 1.10) * 0.28 * exp(-mDist * 3.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderField() {
  const matRef = React.useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  // Track mouse in pixels so the shader uniform matches uResolution units.
  const mouse = React.useRef<{ x: number; y: number }>({
    x: size.width / 2,
    y: size.height / 2,
  });

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Reuse the uniform object across re-renders — wiping it would force a
  // shader recompile on every parent re-render.
  const uniforms = React.useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector2(size.width / 2, size.height / 2) },
    }),
    // Init once; size updates flow through useFrame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value = clock.getElapsedTime();
    m.uniforms.uResolution.value.set(size.width, size.height);
    m.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
  });

  // viewport unused but kept in destructure to avoid the lint warning
  // about unread destructured values when the linter is strict.
  void viewport;

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </ScreenQuad>
  );
}

export function HeroBackdrop() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (reduced) return null;

  // R3F's Canvas wraps its renderer in a positioned div whose size is
  // driven by a ResizeObserver. Relying on className alone is fragile —
  // some hosts collapse the wrapper to its content (here: a 150px tall
  // strip). Wrapping in our own explicit absolute box guarantees Canvas
  // gets a 100%-of-section box to fill.
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          // alpha:false lets the renderer paint its own clear color so
          // dark areas of the shader still carry the cVoid tone instead
          // of bleeding through to the parent section's bg-background.
          alpha: false,
        }}
        // Orthographic camera at z=1 so the ScreenQuad fills NDC. We don't
        // need perspective — every fragment is screen-space.
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
      >
        <ShaderField />
      </Canvas>
    </div>
  );
}

export default HeroBackdrop;
