"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Option = {
	value: string;
	label: string;
	hint: string;
};

const PRESETS: Option[] = [
	{ value: "more dramatic", label: "More dramatic", hint: "Bolder lighting, stronger emotion" },
	{ value: "minimal", label: "Minimal", hint: "Clean, spare composition" },
	{ value: "vibrant", label: "Vibrant", hint: "Rich colors, punchy contrast" },
	{ value: "moody", label: "Moody", hint: "Low-key, intimate feel" },
];

type Props = {
	onPick: (modifier: string) => void;
	disabled?: boolean;
};

export function ModifierMenu({ onPick, disabled }: Props) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handle = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", handle);
		document.addEventListener("keydown", esc);
		return () => {
			document.removeEventListener("mousedown", handle);
			document.removeEventListener("keydown", esc);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<motion.button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				whileTap={!disabled ? { scale: 0.97 } : undefined}
				className={cn(
					"inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-2.5 text-[13px] font-semibold text-text-primary transition-colors hover:border-border-strong hover:bg-surface-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
					open && "border-border-strong bg-surface-pressed",
				)}
			>
				<Wand2 className="h-3.5 w-3.5" strokeWidth={2.25} />
				Regenerate as…
				<ChevronDown
					className={cn(
						"h-3.5 w-3.5 transition-transform",
						open && "rotate-180",
					)}
					strokeWidth={2.5}
				/>
			</motion.button>
			<AnimatePresence>
				{open ? (
					<motion.div
						initial={{ opacity: 0, y: -6, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.98 }}
						transition={{ duration: 0.15 }}
						className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-card"
					>
						<div className="border-b border-border/60 px-3 py-2.5">
							<span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
								Style modifier
							</span>
						</div>
						<div className="flex flex-col p-1">
							{PRESETS.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => {
										setOpen(false);
										onPick(opt.value);
									}}
									className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:bg-surface-alt"
								>
									<span className="text-[13px] font-semibold text-text-primary">
										{opt.label}
									</span>
									<span className="text-[11px] text-text-muted">{opt.hint}</span>
								</button>
							))}
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
