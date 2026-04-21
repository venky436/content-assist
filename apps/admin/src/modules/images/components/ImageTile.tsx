"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, ImageOff, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GeneratedImage, SceneType } from "@content-assist/shared";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/modules/saved/format";

type Props = {
	image: GeneratedImage;
	selected: boolean;
	readOnly?: boolean;
	onToggle?: () => void;
	onRegenerate?: () => void;
	regenerating?: boolean;
};

const SCENE_COLORS: Record<
	SceneType,
	{ pill: string; bar: string; text: string; label: string }
> = {
	struggle: {
		pill: "bg-danger-soft border-danger/60 text-danger",
		bar: "bg-danger",
		text: "text-danger",
		label: "The problem",
	},
	decision: {
		pill: "bg-[hsl(38_92%_50%/0.18)] border-[hsl(38_92%_50%/0.5)] text-[hsl(38_92%_62%)]",
		bar: "bg-[hsl(38_92%_55%)]",
		text: "text-[hsl(38_92%_62%)]",
		label: "The turn",
	},
	result: {
		pill: "bg-success-soft border-success/60 text-success",
		bar: "bg-success",
		text: "text-success",
		label: "The outcome",
	},
};

export function ImageTile({
	image,
	selected,
	readOnly,
	onToggle,
	onRegenerate,
	regenerating,
}: Props) {
	const [imageError, setImageError] = useState(false);
	const [downloadState, setDownloadState] = useState<
		"idle" | "downloading" | "saved" | "error"
	>("idle");

	useEffect(() => {
		if (!regenerating) setImageError(false);
	}, [regenerating, image.url]);

	const handleDownload = useCallback(async () => {
		if (downloadState !== "idle") return;
		setDownloadState("downloading");
		try {
			const res = await fetch(image.url);
			if (!res.ok) throw new Error("fetch failed");
			const blob = await res.blob();
			const ext = image.url.toLowerCase().includes(".webp")
				? "webp"
				: image.url.toLowerCase().includes(".png")
					? "png"
					: "jpg";
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `contentassist-${Date.now()}.${ext}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			setDownloadState("saved");
			setTimeout(() => setDownloadState("idle"), 1600);
		} catch {
			setDownloadState("error");
			setTimeout(() => setDownloadState("idle"), 1600);
		}
	}, [downloadState, image.url]);

	const sceneStyle = image.sceneType ? SCENE_COLORS[image.sceneType] : null;
	const displayLabel = image.label ?? sceneStyle?.label ?? image.type;

	const handleToggle = useCallback(() => {
		if (readOnly || regenerating) return;
		onToggle?.();
	}, [onToggle, readOnly, regenerating]);

	const handleRegenerate = useCallback(() => {
		if (regenerating || !onRegenerate) return;
		onRegenerate();
	}, [onRegenerate, regenerating]);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, type: "spring", damping: 20 }}
			className="group flex flex-col gap-2"
		>
			<div
				className={cn(
					"relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-200",
					selected && !regenerating
						? "border-accent shadow-accent-sm"
						: "border-border hover:border-border-strong",
				)}
			>
				{/* Scene-type accent bar across the top when the image is visible */}
				{sceneStyle && !regenerating && !imageError ? (
					<div
						className={cn(
							"absolute left-0 right-0 top-0 z-10 h-[3px]",
							sceneStyle.bar,
						)}
					/>
				) : null}

				<AnimatePresence mode="wait" initial={false}>
					{regenerating ? (
						<motion.div
							key="skeleton"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="flex h-full w-full animate-shimmer flex-col items-center justify-center gap-2 bg-surface-alt"
						>
							<Loader2 className="h-5 w-5 animate-spin text-text-muted" />
							<span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
								Regenerating…
							</span>
						</motion.div>
					) : imageError ? (
						<motion.div
							key="error"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface-alt p-4 text-center"
						>
							<ImageOff className="h-6 w-6 text-text-muted" strokeWidth={1.8} />
							<p className="text-[12px] font-semibold text-text-primary">
								Image unavailable
							</p>
							<p className="text-[10px] text-text-muted">Regenerate to refresh</p>
						</motion.div>
					) : (
						<motion.button
							key="image"
							type="button"
							onClick={handleToggle}
							initial={{ opacity: 0, scale: 1.02 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0 }}
							whileHover={!readOnly ? { scale: 1.015 } : undefined}
							whileTap={!readOnly ? { scale: 0.99 } : undefined}
							transition={{ duration: 0.25 }}
							className="h-full w-full cursor-pointer"
							aria-label={`${selected ? "Deselect" : "Select"} ${displayLabel ?? "image"}`}
						>
							<img
								src={image.url}
								alt={displayLabel ?? "Generated scene"}
								loading="lazy"
								onError={() => setImageError(true)}
								className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
							/>
							{/* Gradient overlay for readability of bottom label */}
							<div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
						</motion.button>
					)}
				</AnimatePresence>

				{/* Scene label pill — bottom-left */}
				{displayLabel && !regenerating && !imageError ? (
					<div
						className={cn(
							"pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-64px)] rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm",
							sceneStyle
								? sceneStyle.pill
								: "border-accent/50 bg-accent-soft text-accent",
						)}
					>
						<span className="line-clamp-1">{displayLabel}</span>
					</div>
				) : null}

				{/* Selected checkmark — top-left */}
				{!readOnly && !regenerating && !imageError ? (
					<motion.div
						initial={false}
						animate={{
							scale: selected ? 1 : 0.85,
							opacity: selected ? 1 : 0,
						}}
						transition={{ type: "spring", damping: 18, stiffness: 400 }}
						className="pointer-events-none absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-accent-sm"
					>
						<Check className="h-4 w-4" strokeWidth={3} />
					</motion.div>
				) : null}

				{/* Action column — top-right */}
				{!regenerating && !imageError ? (
					<div className="absolute right-2 top-2 flex flex-col gap-1.5">
						{onRegenerate ? (
							<motion.button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleRegenerate();
								}}
								whileTap={{ scale: 0.9, rotate: -90 }}
								transition={{ type: "spring", damping: 14 }}
								className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
								aria-label="Regenerate this scene"
								title="Regenerate this scene"
							>
								<RefreshCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
							</motion.button>
						) : null}
						<motion.button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleDownload();
							}}
							whileTap={{ scale: 0.9 }}
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition-colors",
								downloadState === "saved"
									? "border-success/60 bg-success text-white"
									: downloadState === "error"
										? "border-danger/60 bg-danger text-white"
										: "border-white/10 bg-black/60 text-white hover:bg-black/80",
							)}
							aria-label="Download image"
							title="Download image"
						>
							{downloadState === "downloading" ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : downloadState === "saved" ? (
								<Check className="h-3.5 w-3.5" strokeWidth={3} />
							) : downloadState === "error" ? (
								<span className="text-[14px] font-black leading-none">!</span>
							) : (
								<Download className="h-3.5 w-3.5" strokeWidth={2.25} />
							)}
						</motion.button>
					</div>
				) : null}
			</div>

			<p
				className={cn(
					"px-0.5 text-[11px]",
					regenerating ? "text-accent" : "text-text-muted",
				)}
			>
				{regenerating
					? "Regenerating this scene…"
					: imageError
						? "Unavailable"
						: `Updated ${formatRelative(image.generatedAt)}`}
			</p>
		</motion.div>
	);
}
