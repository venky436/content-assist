"use client";

import { cn } from "@/lib/cn";

type Props = {
	/** 0–100 */
	progress: number;
	size?: number;
	strokeWidth?: number;
	className?: string;
	/** Whether to render a trailing indeterminate spin when progress is 0. */
	indeterminate?: boolean;
};

/**
 * Minimal SVG progress ring. Accent-coloured, reversible transition on the
 * stroke offset. Good for avatar/cover upload progress.
 */
export function ProgressRing({
	progress,
	size = 128,
	strokeWidth = 4,
	className,
	indeterminate,
}: Props) {
	const clamped = Math.max(0, Math.min(100, progress));
	const r = (size - strokeWidth) / 2;
	const c = 2 * Math.PI * r;
	const offset = c * (1 - clamped / 100);

	return (
		<svg
			width={size}
			height={size}
			className={cn(
				"pointer-events-none block -rotate-90",
				indeterminate && clamped === 0 && "animate-spin",
				className,
			)}
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke="currentColor"
				strokeOpacity={0.15}
				strokeWidth={strokeWidth}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke="currentColor"
				strokeWidth={strokeWidth}
				strokeDasharray={c}
				strokeDashoffset={offset}
				strokeLinecap="round"
				style={{ transition: "stroke-dashoffset 200ms ease-out" }}
			/>
		</svg>
	);
}
