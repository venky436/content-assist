"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type Props = {
	value: 2 | 3;
	onChange: (next: 2 | 3) => void;
	disabled?: boolean;
};

const OPTIONS: Array<{ value: 2 | 3; label: string; hint: string }> = [
	{ value: 2, label: "2 images", hint: "Struggle + Result" },
	{ value: 3, label: "3 images", hint: "Full arc" },
];

export function CountChips({ value, onChange, disabled }: Props) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
				How many?
			</span>
			<div className="flex gap-2">
				{OPTIONS.map((opt) => {
					const selected = opt.value === value;
					return (
						<motion.button
							key={opt.value}
							type="button"
							disabled={disabled}
							onClick={() => !disabled && onChange(opt.value)}
							whileTap={!disabled ? { scale: 0.97 } : undefined}
							className={cn(
								"flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
								selected
									? "border-accent bg-accent-soft shadow-accent-sm"
									: "border-border bg-surface-alt hover:border-border-strong",
							)}
							aria-pressed={selected}
						>
							<span
								className={cn(
									"text-[13px] font-semibold",
									selected ? "text-text-primary" : "text-text-secondary",
								)}
							>
								{opt.label}
							</span>
							<span className="text-[10px] text-text-muted">{opt.hint}</span>
						</motion.button>
					);
				})}
			</div>
		</div>
	);
}
