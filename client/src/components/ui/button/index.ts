import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

// shadcn's Button, re-themed for Profinq: pill shapes and ink fills like finqai.co.il.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-(--color-brand)',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        'destructive-outline':
          'border-[1.5px] border-destructive bg-background text-destructive hover:bg-(--color-danger-soft)',
        outline: 'border-[1.5px] border-foreground bg-background hover:bg-accent',
        'outline-inverse': 'border-[1.5px] border-white text-white hover:bg-white/10',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4',
        lg: 'h-13 px-8 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
