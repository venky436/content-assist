import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Props = {
	className?: string;
	style?: CSSProperties;
};

export function Skeleton({ className, style }: Props) {
	return (
		<div
			className={cn("animate-shimmer rounded-md bg-surface-alt", className)}
			style={style}
		/>
	);
}
