import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-stat-3-soft text-stat-3 border border-stat-3-soft hover:bg-stat-3-soft",
        warning: "border-transparent bg-warning-soft text-warning border border-warning-soft hover:bg-warning-soft",
        danger: "border-transparent bg-destructive-soft text-destructive border border-destructive-soft hover:bg-destructive-soft",
        info: "border-transparent bg-stat-6-soft text-stat-6 border border-stat-6-soft hover:bg-stat-6-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type BadgeVariantProps = typeof badgeVariants;
