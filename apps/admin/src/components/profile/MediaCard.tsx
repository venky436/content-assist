"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ImageIcon,
	MoreHorizontal,
	Pause,
	Play,
	Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import type { MediaAsset } from "@content-assist/shared";
import { cn } from "@/lib/cn";

type Props = {
	asset: MediaAsset;
	onDelete?: (asset: MediaAsset) => void;
	onRename?: (asset: MediaAsset, name: string) => void;
};

function formatBytes(n: number): string {
	if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
	if (n >= 1024) return `${Math.round(n / 1024)} KB`;
	return `${n} B`;
}

function formatDuration(sec?: number): string | null {
	if (!sec) return null;
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Unified media card — discriminates on `asset.kind` to render an audio
 * player or an image thumbnail. One component, two surfaces.
 */
export function MediaCard({ asset, onDelete, onRename }: Props) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [renaming, setRenaming] = useState(false);
	const [name, setName] = useState(asset.name);

	function commitRename() {
		setRenaming(false);
		const trimmed = name.trim();
		if (trimmed && trimmed !== asset.name) onRename?.(asset, trimmed);
		else setName(asset.name);
	}

	return (
		<div className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-surface-alt/50 transition-all hover:border-border-strong hover:shadow-card">
			{asset.kind === "image" ? (
				<ImagePreview asset={asset} />
			) : (
				<AudioPreview asset={asset} />
			)}
			<div className="flex items-start justify-between gap-2 px-3 pb-3 pt-1">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					{renaming ? (
						<input
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							onBlur={commitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitRename();
								if (e.key === "Escape") {
									setName(asset.name);
									setRenaming(false);
								}
							}}
							className="w-full rounded-md border border-accent/60 bg-surface-pressed px-1.5 py-0.5 text-[13px] font-semibold text-text-primary focus:outline-none"
						/>
					) : (
						<button
							type="button"
							onClick={() => onRename && setRenaming(true)}
							className="truncate text-left text-[13px] font-semibold text-text-primary hover:text-accent"
							title={asset.name}
						>
							{asset.name}
						</button>
					)}
					<p className="truncate text-[11px] text-text-muted">
						{asset.kind === "audio"
							? [formatDuration(asset.metadata.durationSec), formatBytes(asset.sizeBytes)]
									.filter(Boolean)
									.join(" · ")
							: [
									asset.metadata.width && asset.metadata.height
										? `${asset.metadata.width}×${asset.metadata.height}`
										: null,
									formatBytes(asset.sizeBytes),
								]
									.filter(Boolean)
									.join(" · ")}
					</p>
				</div>
				<KebabMenu
					open={menuOpen}
					onToggle={() => setMenuOpen((v) => !v)}
					onClose={() => setMenuOpen(false)}
					onRename={() => {
						setMenuOpen(false);
						setRenaming(true);
					}}
					onDelete={
						onDelete
							? () => {
									setMenuOpen(false);
									onDelete(asset);
								}
							: undefined
					}
				/>
			</div>
		</div>
	);
}

function ImagePreview({ asset }: { asset: MediaAsset }) {
	return (
		<div className="relative aspect-[4/5] w-full overflow-hidden bg-bg">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={asset.url}
				alt={asset.name}
				className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
				loading="lazy"
			/>
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2 pt-6 text-white opacity-0 transition-opacity group-hover:opacity-100">
				<ImageIcon className="h-3.5 w-3.5" strokeWidth={2} />
				<span className="text-[11px] font-medium uppercase tracking-wider">
					Image
				</span>
			</div>
		</div>
	);
}

function AudioPreview({ asset }: { asset: MediaAsset }) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);

	function toggle() {
		const a = audioRef.current;
		if (!a) return;
		if (a.paused) {
			a.play();
			setPlaying(true);
		} else {
			a.pause();
			setPlaying(false);
		}
	}

	// Cheap deterministic waveform heights from the id string — so the card
	// feels "alive" until a real waveform worker lands.
	const bars = Array.from({ length: 28 }, (_, i) => {
		const seed = asset.id.charCodeAt(i % asset.id.length) + i;
		const h = 20 + (seed % 60);
		return h;
	});

	return (
		<div className="relative flex h-36 items-center gap-3 bg-gradient-to-br from-accent/10 via-surface-alt to-bg px-4">
			<button
				type="button"
				onClick={toggle}
				className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-accent-sm transition-transform hover:scale-105 active:scale-95"
				aria-label={playing ? "Pause" : "Play"}
			>
				{playing ? (
					<Pause className="h-4 w-4" strokeWidth={2.5} fill="currentColor" />
				) : (
					<Play
						className="ml-0.5 h-4 w-4"
						strokeWidth={2.5}
						fill="currentColor"
					/>
				)}
			</button>
			<div className="flex h-16 flex-1 items-center gap-[2px]">
				{bars.map((h, i) => (
					<span
						key={i}
						className={cn(
							"w-[3px] rounded-full transition-colors",
							playing ? "bg-accent" : "bg-accent/40",
						)}
						style={{ height: `${h}%` }}
					/>
				))}
			</div>
			<audio
				ref={audioRef}
				src={asset.url}
				preload="none"
				onEnded={() => setPlaying(false)}
				onPause={() => setPlaying(false)}
				onPlay={() => setPlaying(true)}
			/>
		</div>
	);
}

function KebabMenu({
	open,
	onToggle,
	onClose,
	onRename,
	onDelete,
}: {
	open: boolean;
	onToggle: () => void;
	onClose: () => void;
	onRename?: () => void;
	onDelete?: () => void;
}) {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={onToggle}
				onBlur={() => setTimeout(onClose, 120)}
				aria-label="Asset menu"
				className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-pressed hover:text-text-primary"
			>
				<MoreHorizontal className="h-4 w-4" />
			</button>
			<AnimatePresence>
				{open ? (
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.14 }}
						className="absolute right-0 top-full z-10 mt-1 flex w-36 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card"
					>
						{onRename ? (
							<button
								type="button"
								onMouseDown={(e) => {
									e.preventDefault();
									onRename();
								}}
								className="flex items-center gap-2 px-3 py-2 text-left text-[12px] text-text-secondary hover:bg-surface-alt hover:text-text-primary"
							>
								Rename
							</button>
						) : null}
						{onDelete ? (
							<button
								type="button"
								onMouseDown={(e) => {
									e.preventDefault();
									onDelete();
								}}
								className="flex items-center gap-2 px-3 py-2 text-left text-[12px] text-danger hover:bg-danger-soft"
							>
								<Trash2 className="h-3.5 w-3.5" />
								Delete
							</button>
						) : null}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
