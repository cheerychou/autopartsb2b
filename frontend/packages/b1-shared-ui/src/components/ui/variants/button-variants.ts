import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0 [&_[data-icon]:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]",
        default: "bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/60",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3 has-[_[data-icon]]:px-3",
        sm: "h-9 rounded-md px-3 has-[>svg]:px-2.5 has-[_[data-icon]]:px-2.5",
        lg: "h-11 rounded-md px-8 has-[>svg]:px-4 has-[_[data-icon]]:px-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariantProps = typeof buttonVariants;
