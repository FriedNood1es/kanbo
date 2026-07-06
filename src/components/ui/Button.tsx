import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink font-semibold shadow-sm hover:brightness-105 active:brightness-95",
  secondary: "border border-line text-ink-dim hover:bg-ground hover:text-ink",
  ghost: "text-ink-dim hover:text-ink hover:bg-ground",
  danger: "text-stage-rejected hover:bg-stage-rejected/10",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-[0.95rem]",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    />
  );
}
