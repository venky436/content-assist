"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoVoice } from "@content-assist/shared";
import { cn } from "@/lib/cn";

type Props = {
	value: VideoVoice;
	onChange: (next: VideoVoice) => void;
	disabled?: boolean;
};

type VoiceOption = {
	value: VideoVoice;
	label: string;
	hint: string;
	gender: "Female" | "Male" | "Neutral";
};

const OPTIONS: ReadonlyArray<VoiceOption> = [
	{ value: "nova", label: "Nova", hint: "Bright, scroll-stopping", gender: "Female" },
	{ value: "shimmer", label: "Shimmer", hint: "Soft, friendly", gender: "Female" },
	{ value: "alloy", label: "Alloy", hint: "Neutral, crisp", gender: "Neutral" },
	{ value: "fable", label: "Fable", hint: "Narrator, storyteller", gender: "Neutral" },
	{ value: "onyx", label: "Onyx", hint: "Deep, confident", gender: "Male" },
	{ value: "echo", label: "Echo", hint: "Warm, grounded", gender: "Male" },
];

const PREVIEW_BASE = (
	process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:3000"
) + "/voice-previews";

export function VoicePicker({ value, onChange, disabled }: Props) {
	const [playing, setPlaying] = useState<VideoVoice | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	// One shared audio element; create lazily on first play.
	useEffect(() => {
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, []);

	const togglePreview = (voice: VideoVoice) => {
		if (!audioRef.current) {
			audioRef.current = new Audio();
			audioRef.current.preload = "none";
			audioRef.current.addEventListener("ended", () => setPlaying(null));
			audioRef.current.addEventListener("pause", () => {
				// Only clear `playing` if the pause wasn't caused by starting another clip.
				if (audioRef.current?.ended) setPlaying(null);
			});
		}
		const audio = audioRef.current;

		if (playing === voice) {
			audio.pause();
			setPlaying(null);
			return;
		}

		audio.pause();
		audio.src = `${PREVIEW_BASE}/${voice}.mp3`;
		audio.currentTime = 0;
		audio.play().catch(() => setPlaying(null));
		setPlaying(voice);
	};

	const sorted = useMemo(() => OPTIONS, []);

	return (
		<div className="flex flex-col gap-2">
			<span className="px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">
				Voice
			</span>
			<div
				className={cn(
					"grid grid-cols-2 gap-2 sm:grid-cols-3",
					disabled && "pointer-events-none opacity-50",
				)}
			>
				{sorted.map((opt) => {
					const selected = opt.value === value;
					const isPlaying = playing === opt.value;
					return (
						<button
							key={opt.value}
							type="button"
							role="radio"
							aria-checked={selected}
							disabled={disabled}
							onClick={() => onChange(opt.value)}
							className={cn(
								"group relative flex items-center gap-3 rounded-2xl border bg-surface px-3 py-3 text-left transition-colors",
								selected
									? "border-accent/70 bg-accent/5 shadow-accent-sm"
									: "border-border hover:border-border-strong hover:bg-surface-alt",
								disabled && "cursor-not-allowed",
							)}
						>
							{/* Play / Pause pill */}
							<span
								role="button"
								aria-label={isPlaying ? `Pause ${opt.label} preview` : `Play ${opt.label} preview`}
								onClick={(e) => {
									e.stopPropagation();
									if (!disabled) togglePreview(opt.value);
								}}
								className={cn(
									"flex h-9 w-9 flex-none items-center justify-center rounded-full border transition-colors",
									isPlaying
										? "border-accent bg-gradient-accent text-white shadow-accent-sm"
										: selected
											? "border-accent/60 bg-accent/10 text-accent"
											: "border-border bg-surface-alt text-text-secondary group-hover:text-text-primary",
								)}
							>
								{isPlaying ? (
									<Pause className="h-4 w-4" strokeWidth={2.5} />
								) : (
									<Play className="ml-0.5 h-4 w-4" strokeWidth={2.5} />
								)}
							</span>

							<span className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="flex items-center gap-1.5">
									<span className="truncate text-[13px] font-semibold text-text-primary">
										{opt.label}
									</span>
									<span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
										{opt.gender}
									</span>
								</span>
								<span className="truncate text-[11px] font-medium text-text-muted">
									{opt.hint}
								</span>
							</span>

							<AnimatePresence>
								{selected ? (
									<motion.span
										key="check"
										initial={{ scale: 0.6, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.6, opacity: 0 }}
										className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gradient-accent text-white shadow-accent-sm"
									>
										<Check className="h-3 w-3" strokeWidth={3} />
									</motion.span>
								) : null}
							</AnimatePresence>
						</button>
					);
				})}
			</div>
		</div>
	);
}
