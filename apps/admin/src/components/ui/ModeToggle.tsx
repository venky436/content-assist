"use client";

import { motion } from "framer-motion";
import type { GenerateMode } from "@content-assist/shared";
import { cn } from "@/lib/cn";

type Option = {
	value: GenerateMode;
	label: string;
	glyph: string;
	hint: string;
};

const OPTIONS: Option[] = [
	{
		value: "on_camera",
		label: "On Camera",
		glyph: "🎤",
		hint: "Spoken script",
	},
	{
		value: "faceless",
		label: "Faceless",
		glyph: "🎬",
		hint: "Post + visuals",
	},
];

type Props = {
	value: GenerateMode;
	onChange: (next: GenerateMode) => void;
	disabled?: boolean;
};

export function ModeToggle({ value, onChange, disabled }: Props) {
	return (
		<div
			className={cn(
				"relative grid grid-cols-2 rounded-2xl border border-border bg-surface p-1.5 shadow-card",
				disabled && "opacity-60",
			)}
			role="tablist"
		>
			<motion.div
				className="absolute inset-y-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-accent shadow-accent-sm"
				animate={{ x: value === "on_camera" ? 0 : "100%" }}
				transition={{ type: "spring", stiffness: 400, damping: 32 }}
				style={{ left: 6 }}
			/>
			{OPTIONS.map((opt) => {
				const selected = opt.value === value;
				return (
					<button
						key={opt.value}
						type="button"
						role="tab"
						aria-selected={selected}
						disabled={disabled}
						onClick={() => !disabled && onChange(opt.value)}
						className={cn(
							"relative z-10 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed",
							selected ? "text-white" : "text-text-secondary hover:text-text-primary",
						)}
					>
						<span className="text-[15px]" aria-hidden>
							{opt.glyph}
						</span>
						<span className="flex flex-col items-start leading-tight">
							<span>{opt.label}</span>
							<span
								className={cn(
									"text-[10px] font-medium",
									selected ? "text-white/80" : "text-text-muted",
								)}
							>
								{opt.hint}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}
