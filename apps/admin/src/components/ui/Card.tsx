import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
	variant?: "default" | "elevated" | "accent";
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
	{ className, variant = "default", ...props },
	ref,
) {
	return (
		<div
			ref={ref}
			className={cn(
				"rounded-2xl border transition-colors",
				variant === "default" && "border-border bg-surface",
				variant === "elevated" && "border-border bg-surface shadow-card",
				variant === "accent" &&
					"border-accent/40 bg-surface shadow-accent-sm",
				className,
			)}
			{...props}
		/>
	);
});
