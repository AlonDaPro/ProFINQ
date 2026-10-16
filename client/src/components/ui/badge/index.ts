import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Badge } from './Badge.vue';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'text-foreground',
        // Profinq additions.
        brand: 'border-transparent bg-(--color-lavender-200) text-(--color-brand)',
        success: 'border-transparent bg-(--color-success-soft) text-(--color-success) text-sm py-1 ps-1 pe-3 gap-2',
        /** An outlined label naming where content comes from (finqai.co.il's section tags). */
        tag: 'rounded-sm border-[1.5px] border-foreground px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
export type BadgeVariants = VariantProps<typeof badgeVariants>;
