"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type Chip<V extends string> = {
	value: V;
	label: string;
	/** Optional emoji or short glyph rendered before the label. */
	icon?: string;
	/** Optional hover descriptor shown under the chip. */
	description?: string;
};

type Props<V extends string> = {
	label?: string;
	hint?: string;
	options: ReadonlyArray<Chip<V>>;
	value: V | null;
	onChange: (value: V | null) => void;
	/** Allow deselecting back to null by clicking the selected chip. */
	clearable?: boolean;
	disabled?: boolean;
	className?: string;
};

/**
 * Generic single-select chip cluster. Drop-in for niche, tone, BGM mood —
 * anywhere the user picks one from a small known set. Selected chip pulses
 * on change and shows a check glyph.
 */
export function ChipSelector<V extends string>({
	label,
	hint,
	options,
	value,
	onChange,
	clearable = true,
	disabled,
	className,
}: Props<V>) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{label ? (
				<span className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
					{label}
				</span>
			) : null}
			<div className="flex flex-wrap gap-2">
				{options.map((opt) => {
					const selected = opt.value === value;
					return (
						<motion.button
							key={opt.value}
							type="button"
							disabled={disabled}
							whileTap={{ scale: 0.96 }}
							onClick={() => {
								if (selected && clearable) onChange(null);
								else onChange(opt.value);
							}}
							className={cn(
								"group relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
								selected
									? "border-accent bg-accent text-white shadow-accent-sm"
									: "border-border bg-surface-alt text-text-secondary hover:border-border-strong hover:text-text-primary",
								disabled && "cursor-not-allowed opacity-60",
							)}
							title={opt.description}
						>
							{opt.icon ? (
								<span className="text-[14px] leading-none">{opt.icon}</span>
							) : null}
							<span>{opt.label}</span>
							{selected ? (
								<motion.span
									layoutId={`chip-check-${label ?? "unknown"}`}
									className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20"
									transition={{ type: "spring", stiffness: 500, damping: 30 }}
								>
									<Check className="h-2.5 w-2.5" strokeWidth={3} />
								</motion.span>
							) : null}
						</motion.button>
					);
				})}
			</div>
			{hint ? (
				<p className="text-[11px] leading-tight text-text-muted">{hint}</p>
			) : null}
		</div>
	);
}
