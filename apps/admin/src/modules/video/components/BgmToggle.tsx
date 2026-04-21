"use client";

import { motion } from "framer-motion";
import { Music } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
	value: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
};

export function BgmToggle({ value, onChange, disabled }: Props) {
	return (
		<motion.button
			type="button"
			disabled={disabled}
			onClick={() => !disabled && onChange(!value)}
			whileTap={!disabled ? { scale: 0.995 } : undefined}
			className={cn(
				"flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
				value
					? "border-accent bg-accent-soft"
					: "border-border bg-surface-alt hover:border-border-strong",
			)}
			aria-pressed={value}
		>
			<span
				className={cn(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
					value ? "bg-accent text-white" : "bg-surface-pressed text-text-muted",
				)}
			>
				<Music className="h-4 w-4" strokeWidth={2.25} />
			</span>
			<div className="flex-1">
				<p className="text-[13px] font-semibold text-text-primary">
					Add background music
				</p>
				<p className="text-[11px] leading-tight text-text-muted">
					Low-volume track behind the voiceover
				</p>
			</div>
			<span
				className={cn(
					"relative h-6 w-10 shrink-0 rounded-full transition-colors",
					value ? "bg-accent" : "bg-surface-pressed",
				)}
			>
				<motion.span
					animate={{ x: value ? 18 : 2 }}
					transition={{ type: "spring", stiffness: 500, damping: 30 }}
					className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
				/>
			</span>
		</motion.button>
	);
}
