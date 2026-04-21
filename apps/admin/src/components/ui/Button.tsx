"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const buttonStyles = cva(
	"inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
	{
		variants: {
			variant: {
				primary:
					"bg-gradient-accent text-white shadow-accent hover:brightness-110 active:brightness-95",
				secondary:
					"bg-surface-alt text-text-primary border border-border hover:bg-surface-pressed hover:border-border-strong",
				ghost: "bg-transparent text-text-primary hover:bg-surface-alt/80",
				danger:
					"bg-danger-soft text-danger border border-danger hover:bg-danger/20",
			},
			size: {
				sm: "h-9 px-4 text-[13px]",
				md: "h-11 px-5 text-[14px]",
				lg: "h-[52px] px-7 text-[15px]",
			},
			fullWidth: {
				true: "w-full",
				false: "",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
			fullWidth: false,
		},
	},
);

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
	VariantProps<typeof buttonStyles> & {
		loading?: boolean;
		iconLeft?: ReactNode;
		iconRight?: ReactNode;
		children: ReactNode;
	};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		className,
		variant,
		size,
		fullWidth,
		loading,
		iconLeft,
		iconRight,
		disabled,
		children,
		...props
	},
	ref,
) {
	return (
		<motion.button
			ref={ref}
			whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
			whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
			transition={{ type: "spring", stiffness: 500, damping: 30 }}
			disabled={disabled || loading}
			className={cn(buttonStyles({ variant, size, fullWidth }), className)}
			{...props}
		>
			{loading ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : iconLeft ? (
				<span className="flex h-4 w-4 items-center justify-center">{iconLeft}</span>
			) : null}
			<span>{children}</span>
			{iconRight && !loading ? (
				<span className="flex h-4 w-4 items-center justify-center">{iconRight}</span>
			) : null}
		</motion.button>
	);
});
