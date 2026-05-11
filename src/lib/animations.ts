import { Variants } from "framer-motion";

/**
 * Premium Animation System for DevBrand
 * High-quality springs, eases, and variants for cinematic UI transitions.
 */

// Spring Configurations
export const springs = {
  smooth: { type: "spring", stiffness: 300, damping: 30 },
  snappy: { type: "spring", stiffness: 400, damping: 25 },
  bouncy: { type: "spring", stiffness: 500, damping: 15 },
  molasses: { type: "spring", stiffness: 100, damping: 20 },
};

// Easing Functions
export const easings = {
  cubic: [0.25, 0.1, 0.25, 1],
  quad: [0.45, 0, 0.55, 1],
  easeOutQuart: [0.25, 1, 0.5, 1],
};

// Fade Animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

// Scale Animations
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Stagger Effects
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Layout Transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

// Hover Variants
export const hoverScale = {
  hover: { scale: 1.02, transition: springs.snappy },
  tap: { scale: 0.98 },
};

export const glowVariant: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
