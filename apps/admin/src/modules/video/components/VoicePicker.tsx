"use client";

import { motion } from "framer-motion";
import type { VideoVoice } from "@content-assist/shared";
import { cn } from "@/lib/cn";

type Props = {
	value: VideoVoice;
	onChange: (next: VideoVoice) => void;
	disabled?: boolean;
};

const OPTIONS: Array<{
	value: VideoVoice;
	label: string;
	glyph: string;
	hint: string;
}> = [
	{ value: "female", label: "Female", glyph: "🎤", hint: "Bright, confident" },
	{ value: "male", label: "Male", glyph: "🎙️", hint: "Deep, grounded" },
];

export function VoicePicker({ value, onChange, disabled }: Props) {
	return (
		<div className="flex flex-col gap-2">
			<span className="px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">
				Voice
			</span>
			<div
				className={cn(
					"relative grid grid-cols-2 rounded-full border border-border bg-surface-alt p-1",
					disabled && "opacity-50",
				)}
			>
				<motion.div
					className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-accent shadow-accent-sm"
					animate={{ x: value === "female" ? 0 : "100%" }}
					transition={{ type: "spring", stiffness: 400, damping: 32 }}
					style={{ left: 4 }}
				/>
				{OPTIONS.map((opt) => {
					const selected = opt.value === value;
					return (
						<button
							key={opt.value}
							type="button"
							disabled={disabled}
							onClick={() => !disabled && onChange(opt.value)}
							className={cn(
								"relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed",
								selected ? "text-white" : "text-text-secondary",
							)}
							aria-pressed={selected}
							title={opt.hint}
						>
							<span className="text-[13px]" aria-hidden>
								{opt.glyph}
							</span>
							{opt.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
