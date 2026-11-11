import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-signal text-white hover:bg-signal-hover",
        outline: "border border-white/10 text-white hover:bg-white/10",
        outlineLight: "border border-black/10 text-ink hover:bg-black/5",
        ghost: "text-white/80 hover:text-white",
      },
      size: { md: "h-11 px-5 text-sm", lg: "h-14 px-8 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;
export const Button = ({ className, variant, size, ...p }: ButtonProps) => <button className={cn(button({ variant, size }), className)} {...p} />;
export const buttonClass = (o: VariantProps<typeof button>, extra?: string) => cn(button(o), extra);
