import * as React from "react";
import Lenis from "lenis";

/**
 * Site-wide buttery scroll. Mounted once in __root.tsx. Skips itself when
 * the user prefers reduced motion — native scroll is the accessible
 * default. Skipping for pointer:coarse too because Lenis's wheel-emulated
 * inertia on touch can fight the native momentum scroll on iOS.
 *
 * Lenis's RAF loop coexists with Framer Motion's — both run on the browser
 * rAF tick, neither blocks the other. We tear down on unmount so HMR in
 * dev doesn't leave a zombie loop running.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    const mq = window.matchMedia(
      "(prefers-reduced-motion: reduce), (pointer: coarse)",
    );
    if (mq.matches) return;

    const lenis = new Lenis({
      // Easing curve: aggressive at start, glides to a stop. Matches the
      // cinematic ease used elsewhere in the site (Reveal: 0.16, 1, 0.3, 1).
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Wheel inertia. Higher = more glide. 1.2 reads as "premium drift"
      // without feeling laggy when the user wants to jump fast.
      lerp: 0.1,
      duration: 1.2,
      // Don't hijack horizontal — overflow:auto containers should keep
      // their native behaviour (e.g. the admin command center chart row).
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
