"use client";

import { motion } from "framer-motion";
import { Music, Pause, Play, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaAsset } from "@content-assist/shared";
import { MediaPickerModal } from "@/components/profile/MediaPickerModal";
import { cn } from "@/lib/cn";

export type BgmMode = "preset" | "custom" | "off";

export type BgmSelection = {
	mode: BgmMode;
	/** Populated only when mode === "custom". */
	asset?: MediaAsset;
};

type Props = {
	value: BgmSelection;
	onChange: (next: BgmSelection) => void;
	disabled?: boolean;
};

const MODES: Array<{
	value: BgmMode;
	label: string;
	hint: string;
}> = [
	{ value: "preset", label: "Preset", hint: "Auto-pick by tone" },
	{ value: "custom", label: "My track", hint: "Use your own audio" },
	{ value: "off", label: "Off", hint: "No background music" },
];

/**
 * Three-way BGM picker: preset / custom / off. Replaces the old on/off toggle.
 * In "custom" mode, opens MediaPickerModal(kind="audio") and shows the picked
 * asset with a preview play button + short advisory if the track is shorter
 * than the target video (loops).
 */
export function BgmPicker({ value, onChange, disabled }: Props) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [previewing, setPreviewing] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	// Stop preview when switching away from custom / picking a different asset.
	useEffect(() => {
		if (value.mode !== "custom") {
			audioRef.current?.pause();
			setPreviewing(false);
		}
	}, [value.mode, value.asset?.id]);

	// Cleanup on unmount.
	useEffect(() => {
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, []);

	const setMode = (mode: BgmMode) => {
		if (disabled) return;
		if (mode === "custom") {
			// If we already have an asset, just flip the mode — don't reopen picker.
			if (value.asset) {
				onChange({ mode: "custom", asset: value.asset });
				return;
			}
			setPickerOpen(true);
			return;
		}
		onChange({ mode });
	};

	const togglePreview = () => {
		if (!value.asset) return;
		if (!audioRef.current) {
			audioRef.current = new Audio(value.asset.url);
			audioRef.current.preload = "none";
			audioRef.current.addEventListener("ended", () => setPreviewing(false));
			audioRef.current.addEventListener("pause", () => {
				if (audioRef.current?.ended) setPreviewing(false);
			});
		}
		const a = audioRef.current;
		if (previewing) {
			a.pause();
			setPreviewing(false);
		} else {
			a.src = value.asset.url;
			a.currentTime = 0;
			a.play().catch(() => setPreviewing(false));
			setPreviewing(true);
		}
	};

	const durationSec = value.asset?.metadata.durationSec;

	return (
		<div className="flex flex-col gap-2">
			<span className="px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">
				Background music
			</span>
			<div
				className={cn(
					"grid grid-cols-3 gap-2",
					disabled && "pointer-events-none opacity-50",
				)}
			>
				{MODES.map((opt) => {
					const selected = opt.value === value.mode;
					return (
						<button
							key={opt.value}
							type="button"
							role="radio"
							aria-checked={selected}
							onClick={() => setMode(opt.value)}
							className={cn(
								"relative flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
								selected
									? "border-accent/70 bg-accent/5 shadow-accent-sm"
									: "border-border bg-surface hover:border-border-strong hover:bg-surface-alt",
							)}
						>
							<span className="flex items-center gap-1.5">
								{opt.value === "off" ? (
									<VolumeX
										className={cn(
											"h-3.5 w-3.5",
											selected ? "text-accent" : "text-text-muted",
										)}
										strokeWidth={2.25}
									/>
								) : (
									<Music
										className={cn(
											"h-3.5 w-3.5",
											selected ? "text-accent" : "text-text-muted",
										)}
										strokeWidth={2.25}
									/>
								)}
								<span className="text-[13px] font-semibold text-text-primary">
									{opt.label}
								</span>
							</span>
							<span className="text-[11px] font-medium text-text-muted">
								{opt.hint}
							</span>
						</button>
					);
				})}
			</div>

			{value.mode === "custom" ? (
				<motion.div
					initial={{ opacity: 0, y: -4 }}
					animate={{ opacity: 1, y: 0 }}
					className="flex items-center gap-3 rounded-2xl border border-border bg-surface-alt/60 px-3 py-2.5"
				>
					{value.asset ? (
						<>
							<button
								type="button"
								onClick={togglePreview}
								aria-label={previewing ? "Pause preview" : "Play preview"}
								className={cn(
									"flex h-9 w-9 flex-none items-center justify-center rounded-full border transition-colors",
									previewing
										? "border-accent bg-gradient-accent text-white shadow-accent-sm"
										: "border-border bg-surface text-text-secondary hover:text-text-primary",
								)}
							>
								{previewing ? (
									<Pause className="h-4 w-4" strokeWidth={2.5} />
								) : (
									<Play className="ml-0.5 h-4 w-4" strokeWidth={2.5} />
								)}
							</button>
							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="truncate text-[13px] font-semibold text-text-primary">
									{value.asset.name}
								</span>
								<span className="text-[11px] font-medium text-text-muted">
									{durationSec
										? `${formatDuration(durationSec)}${durationSec < 30 ? " — loops to fill" : ""}`
										: "Audio track"}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setPickerOpen(true)}
								className="text-[12px] font-semibold text-accent hover:underline"
							>
								Change
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={() => setPickerOpen(true)}
							className="flex w-full items-center justify-center rounded-xl border border-dashed border-border-strong px-3 py-2 text-[13px] font-semibold text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary"
						>
							Pick from your library
						</button>
					)}
				</motion.div>
			) : null}

			<MediaPickerModal
				open={pickerOpen}
				onClose={() => setPickerOpen(false)}
				kind="audio"
				multi={false}
				initialSelectedIds={value.asset ? [value.asset.id] : undefined}
				onPick={(items) => {
					const [first] = items;
					if (!first) return;
					onChange({ mode: "custom", asset: first });
				}}
				title="Pick a track"
			/>
		</div>
	);
}

function formatDuration(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}
