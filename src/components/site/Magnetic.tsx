import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: React.ReactNode;
  /**
   * 0–1. How far the element drifts toward the cursor relative to its own
   * bounding box. 0.25 = subtle, 0.6 = playful, 1.0 = follows the cursor
   * outside the element. Defaults to 0.35 which reads as intentional pull
   * without becoming a toy.
   */
  strength?: number;
  /**
   * Pixel radius around the element where the pull engages. Outside this
   * radius the element snaps back to rest. Default 80px past the bbox.
   */
  proximity?: number;
  className?: string;
  /** Pass a tag to render as instead of div. */
  as?: "div" | "span" | "a" | "button";
}

/**
 * Magnetic hover wrapper. Drifts its child toward the cursor inside a
 * proximity bubble, using a spring so the motion has weight. Disables
 * itself for users with prefers-reduced-motion or pointer:coarse (touch
 * devices) — the effect is gestural and meaningless without a mouse.
 *
 * Wrap any single-child element that should feel attracted to the cursor —
 * primary CTAs, icon-only buttons, headline glyphs. Stacks cleanly inside
 * other motion contexts because the transform is local.
 */
export function Magnetic({
  children,
  strength = 0.35,
  proximity = 80,
  className,
  as = "div",
}: MagneticProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  const [enabled, setEnabled] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia(
      "(prefers-reduced-motion: reduce), (pointer: coarse)",
    );
    setEnabled(!mq.matches);
    const onChange = () => setEnabled(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const outerRadius = Math.max(rect.width, rect.height) / 2 + proximity;
      if (dist > outerRadius) {
        x.set(0);
        y.set(0);
        return;
      }
      x.set(dx * strength);
      y.set(dy * strength);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, strength, proximity, x, y]);

  // Without the spring being read, useSpring would never run. Bind to style.
  const Component = motion[as] as any;
  return (
    <Component
      ref={ref as React.Ref<any>}
      style={enabled ? { x: sx, y: sy } : undefined}
      className={cn("inline-block will-change-transform", className)}
    >
      {children}
    </Component>
  );
}
