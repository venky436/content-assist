"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SegmentOption<V extends string> = {
	value: V;
	label: string;
	hint?: string;
	icon?: LucideIcon;
};

type Props<V extends string> = {
	value: V;
	onChange: (next: V) => void;
	options: ReadonlyArray<SegmentOption<V>>;
	disabled?: boolean;
	layoutId?: string;
	className?: string;
	/**
	 * Icon-only, auto-width, tighter padding. Use when the segmented control
	 * is a secondary utility alongside a primary toggle (e.g. Generate's
	 * input-mode strip next to the big Faceless/On-Camera ModeToggle), so it
	 * doesn't visually compete.
	 */
	compact?: boolean;
};

/**
 * Generic segmented control. Dark-capsule base, accent-gradient active pill
 * that animates between slots via framer `layoutId`. Used for 2+ mutually
 * exclusive options where the user needs to see all choices at once.
 *
 * `compact` flips the layout to icon-only + auto-width — the label becomes
 * a native title tooltip for accessibility.
 *
 * For Faceless/On-Camera specifically, the dedicated `ModeToggle` uses the
 * same visual language — kept as its own component because its copy +
 * glyphs are product-specific.
 */
export function SegmentedTabs<V extends string>({
	value,
	onChange,
	options,
	disabled,
	layoutId = "segmented-tabs-pill",
	className,
	compact,
}: Props<V>) {
	return (
		<div
			className={cn(
				"relative rounded-2xl border border-border bg-surface shadow-card",
				compact ? "inline-flex p-1" : "flex p-1.5",
				disabled && "opacity-60",
				className,
			)}
			role="tablist"
		>
			{options.map((opt) => {
				const selected = opt.value === value;
				const Icon = opt.icon;
				return (
					<button
						key={opt.value}
						type="button"
						role="tab"
						aria-selected={selected}
						aria-label={opt.label}
						title={compact ? opt.label : undefined}
						disabled={disabled}
						onClick={() => !disabled && onChange(opt.value)}
						className={cn(
							"relative flex items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed",
							compact
								? "h-9 w-9"
								: "flex-1 gap-2 px-4 py-2.5 text-[13px]",
							selected
								? "text-white"
								: "text-text-secondary hover:text-text-primary",
						)}
					>
						{selected ? (
							<motion.span
								layoutId={layoutId}
								className="absolute inset-0 rounded-xl bg-gradient-accent shadow-accent-sm"
								transition={{ type: "spring", stiffness: 420, damping: 32 }}
							/>
						) : null}
						<span
							className={cn(
								"relative z-10 flex items-center",
								compact ? "" : "gap-2",
							)}
						>
							{Icon ? (
								<Icon
									className={compact ? "h-[18px] w-[18px]" : "h-4 w-4"}
									strokeWidth={2.25}
								/>
							) : null}
							{compact ? null : (
								<span className="flex flex-col items-start leading-tight">
									<span>{opt.label}</span>
									{opt.hint ? (
										<span
											className={cn(
												"text-[10px] font-medium",
												selected ? "text-white/80" : "text-text-muted",
											)}
										>
											{opt.hint}
										</span>
									) : null}
								</span>
							)}
						</span>
					</button>
				);
			})}
		</div>
	);
}
