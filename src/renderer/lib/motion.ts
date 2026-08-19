import type { Transition, Variants } from 'framer-motion';

export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 28 },
  normal: { type: 'spring', stiffness: 300, damping: 30 },
  gentle: { type: 'spring', stiffness: 200, damping: 26 },
  bouncy: { type: 'spring', stiffness: 350, damping: 18 },
} as const;

export const easeEmphasized = [0.2, 0, 0, 1] as const;

export const defaultTransition: Transition = springs.normal;

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springs.normal },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springs.bouncy },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springs.normal },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const dialogOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
