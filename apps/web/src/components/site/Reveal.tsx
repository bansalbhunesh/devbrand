"use client";

import { motion, type MotionProps, type Variants } from "framer-motion";
import * as React from "react";

/**
 * Reveal is the shared scroll-driven entrance primitive for the marketing site.
 * It standardizes the "section appears as user scrolls" motion so the page feels
 * intentional rather than ad-hoc — sections that used to each declare their own
 * `initial / whileInView / transition` props now compose via this.
 *
 * Why a single curve: the cubic-bezier `[0.16, 1, 0.3, 1]` (a.k.a. "ease-out
 * cubic snappy") is the in-house feel. It starts fast, settles softly — reads
 * as confidence rather than bounce.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type RevealDirection = "up" | "down" | "left" | "right" | "none";

export interface RevealProps extends Omit<MotionProps, "variants"> {
  /** Distance the element travels into place (px). Default 24. */
  distance?: number;
  /** Direction of entry. Default "up" (rises from below). */
  direction?: RevealDirection;
  /** Delay before this element animates in (s). */
  delay?: number;
  /** Total duration (s). Default 0.8 — matches the in-house pace. */
  duration?: number;
  /** Stagger children of the same Reveal — pass `stagger` and the children
   *  use the `Reveal.Item` API below. */
  stagger?: number;
  /** When true (default), only animate the first time the element enters view. */
  once?: boolean;
  /** Margin around the viewport that triggers entry; negative pulls trigger earlier. */
  rootMargin?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  children?: React.ReactNode;
}

function offset(direction: RevealDirection, distance: number) {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

export function Reveal({
  distance = 24,
  direction = "up",
  delay = 0,
  duration = 0.8,
  stagger,
  once = true,
  rootMargin = "-10% 0px -10% 0px",
  as = "div",
  className,
  children,
  ...rest
}: RevealProps) {
  const off = offset(direction, distance);
  const containerVariants: Variants = {
    hidden: { opacity: 0, ...off },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: EASE,
        when: stagger ? "beforeChildren" : undefined,
        staggerChildren: stagger,
      },
    },
  };

  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: rootMargin }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Use inside a `Reveal stagger={…}` parent to animate children in sequence.
 * The child inherits the parent's ease + duration.
 */
export function RevealItem({
  distance = 16,
  direction = "up",
  className,
  children,
}: {
  distance?: number;
  direction?: RevealDirection;
  className?: string;
  children?: React.ReactNode;
}) {
  const off = offset(direction, distance);
  const itemVariants: Variants = {
    hidden: { opacity: 0, ...off },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.6, ease: EASE },
    },
  };
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export const REVEAL_EASE = EASE;
