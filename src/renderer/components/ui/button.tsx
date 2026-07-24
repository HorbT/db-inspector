import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@renderer/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

// HTMLMotionProps<'button'> preserves all DOM button attrs (onClick, disabled,
// type, aria-*, form, autoFocus, etc.) plus framer-motion extras. We narrow
// `children` and `style` to their plain React types because framer-motion's
// MotionValue variants are not assignable to Radix Slot when asChild=true.
// Slot also cannot accept motion-only event handlers (onDrag,
// onAnimationStart, etc.) which have different signatures than React DOM
// handlers; these are never used with asChild since whileTap is stripped, so
// casting Comp to a unified type is safe.
export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children' | 'style'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

type ButtonComponent = React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = (asChild ? Slot : motion.button) as ButtonComponent;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        whileTap={asChild ? undefined : { scale: 0.96 }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
