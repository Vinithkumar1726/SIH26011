/**
 * SIH26011 - Shared Animation Variants
 * Framer-motion variants for consistent animations across the app
 */

import { Variants } from 'framer-motion';

// Page/screen transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransition = {
  initial: 'initial',
  animate: 'enter',
  exit: 'exit',
  variants: pageVariants,
};

// Stagger container for lists/grids
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// Card hover/press animations
export const cardHover: Variants = {
  rest: { 
    y: 0, 
    boxShadow: '4px 4px 0 #000000',
    scale: 1,
  },
  hover: { 
    y: -4, 
    boxShadow: '8px 8px 0 #000000',
    scale: 1.01,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  press: { 
    y: 2, 
    boxShadow: '2px 2px 0 #000000',
    scale: 0.99,
    transition: { duration: 0.05 },
  },
};

// Button press animation
export const buttonPress: Variants = {
  rest: { scale: 1, boxShadow: '4px 4px 0 #000000' },
  hover: { scale: 1.02, boxShadow: '6px 6px 0 #000000', transition: { duration: 0.1 } },
  press: { scale: 0.98, boxShadow: '2px 2px 0 #000000', transition: { duration: 0.05 } },
};

// Fade in/out
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 15, stiffness: 200 } },
};

// Modal/drawer animations
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

export const drawerVariants: Variants = {
  hidden: { x: -300 },
  visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } },
  exit: { x: -300, transition: { duration: 0.25 } },
};

export const drawerOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Toast/slide animations
export const slideInRight: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { x: 400, opacity: 0, transition: { duration: 0.25 } },
};

export const slideInLeft: Variants = {
  hidden: { x: -400, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { x: -400, opacity: 0, transition: { duration: 0.25 } },
};

export const slideInBottom: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { y: 100, opacity: 0, transition: { duration: 0.25 } },
};

export const slideInTop: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { y: -100, opacity: 0, transition: { duration: 0.25 } },
};

// Accordion/collapse
export const collapseVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
};

// Loading spinner rotation
export const spinVariants: Variants = {
  animate: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: 'linear' } },
};

// Pulse animation for status indicators
export const pulseVariants: Variants = {
  animate: { 
    opacity: [1, 0.5, 1], 
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } 
  },
};

// Number count-up animation
export const countUpVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: number) => ({
    opacity: 1,
    transition: { duration: 1.5, ease: 'easeOut' },
  }),
};

// List item slide
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

// Tab/content switch
export const tabVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// Progress bar
export const progressVariants: Variants = {
  hidden: { width: '0%', opacity: 0 },
  visible: (custom: number) => ({ 
    width: `${custom}%`, 
    opacity: 1, 
    transition: { duration: 0.8, ease: 'easeOut' } 
  }),
};

// Glow pulse for active elements
export const glowPulseVariants: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 #000',
      '0 0 20px rgba(0, 229, 255, 0.4)',
      '0 0 0 #000',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Shimmer for skeletons
export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['-200% 0', '200% 0'],
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
};

// Spring configs for common use
export const springConfigs = {
  gentle: { type: 'spring', damping: 25, stiffness: 120 },
  bouncy: { type: 'spring', damping: 15, stiffness: 300 },
  snappy: { type: 'spring', damping: 20, stiffness: 400 },
  stiff: { type: 'spring', damping: 30, stiffness: 500 },
};

// Transition presets
export const transitions = {
  fast: { duration: 0.15, ease: 'easeOut' },
  normal: { duration: 0.25, ease: 'easeOut' },
  slow: { duration: 0.4, ease: 'easeOut' },
  spring: springConfigs.gentle,
  springBouncy: springConfigs.bouncy,
};