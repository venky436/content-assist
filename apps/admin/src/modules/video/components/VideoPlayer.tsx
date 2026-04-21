"use client";

import { motion } from "framer-motion";
import { Check, Download, Loader2, Music, Pause, Play, RefreshCcw, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/cn";

type Props = {
	videoUrl: string;
	voiceover: string;
	durationMs: number;
	bgmUsed: boolean;
	onRegenerate?: () => void;
	regenerating?: boolean;
};

export function VideoPlayer({
	videoUrl,
	voiceover,
	durationMs,
	bgmUsed,
	onRegenerate,
	regenerating,
}: Props) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [downloadState, setDownloadState] = useState<
		"idle" | "downloading" | "saved" | "error"
	>("idle");

	// Autoplay muted-first (browser policies), then unmute on user interaction.
	useEffect(() => {
		const v = videoRef.current;
		if (!v) return;
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		v.addEventListener("play", onPlay);
		v.addEventListener("pause", onPause);
		v.addEventListener("ended", onPause);
		return () => {
			v.removeEventListener("play", onPlay);
			v.removeEventListener("pause", onPause);
			v.removeEventListener("ended", onPause);
		};
	}, []);

	const togglePlay = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		if (v.paused) {
			// If muted by browser autoplay policy, unmute on first real user tap.
			v.muted = false;
			v.play().catch(() => {
				/* ignored */
			});
		} else {
			v.pause();
		}
	}, []);

	const handleUnmute = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		v.muted = false;
		v.play().catch(() => {});
	}, []);

	const handleDownload = useCallback(async () => {
		if (downloadState !== "idle") return;
		setDownloadState("downloading");
		try {
			const res = await fetch(videoUrl);
			if (!res.ok) throw new Error("fetch failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `contentassist-${Date.now()}.mp4`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			setDownloadState("saved");
			setTimeout(() => setDownloadState("idle"), 1800);
		} catch {
			setDownloadState("error");
			setTimeout(() => setDownloadState("idle"), 1800);
		}
	}, [downloadState, videoUrl]);

	const seconds = (durationMs / 1000).toFixed(1);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35 }}
		>
			<Card className="overflow-hidden p-6">
				<div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
					{/* Player */}
					<div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] shrink-0 overflow-hidden rounded-xl bg-black shadow-card">
						<video
							ref={videoRef}
							src={videoUrl}
							className="h-full w-full object-cover"
							playsInline
							loop
							autoPlay
							muted
							preload="auto"
						/>
						{/* Click-to-play overlay */}
						<button
							type="button"
							onClick={togglePlay}
							className="group absolute inset-0 flex items-center justify-center bg-transparent transition-colors hover:bg-black/10"
							aria-label={isPlaying ? "Pause" : "Play"}
						>
							<motion.span
								animate={{
									scale: isPlaying ? 0.9 : 1,
									opacity: isPlaying ? 0 : 1,
								}}
								transition={{ type: "spring", damping: 18, stiffness: 320 }}
								className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/90 bg-black/55 backdrop-blur-sm"
							>
								<Play className="h-6 w-6 text-white" fill="white" strokeWidth={0} />
							</motion.span>
						</button>
						{/* Pause indicator when hovered during playback */}
						{isPlaying ? (
							<div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
								<Pause className="h-3 w-3 text-white" strokeWidth={2.5} />
							</div>
						) : null}
						{/* Bottom meta pill */}
						<div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
							{seconds}s
							<span className="mx-0.5 h-0.5 w-0.5 rounded-full bg-white/60" />
							{bgmUsed ? (
								<>
									<Music className="h-3 w-3" strokeWidth={2.5} />
									BGM
								</>
							) : (
								"voice only"
							)}
						</div>
						{/* Unmute nudge — shown when the video is autoplaying muted */}
						<button
							type="button"
							onClick={handleUnmute}
							className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-colors hover:bg-black/90"
							aria-label="Tap to unmute"
						>
							<VolumeX className="h-3 w-3" strokeWidth={2.5} />
							Tap to unmute
						</button>
					</div>

					{/* Details + actions */}
					<div className="flex flex-1 flex-col gap-5">
						<div className="rounded-xl border border-border bg-surface-alt p-4">
							<SectionLabel className="mb-2">Voiceover</SectionLabel>
							<p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-primary">
								{voiceover}
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<motion.button
								type="button"
								onClick={handleDownload}
								disabled={downloadState !== "idle"}
								whileTap={{ scale: 0.97 }}
								className={cn(
									"inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
									downloadState === "saved"
										? "border-success bg-success-soft text-success"
										: downloadState === "error"
											? "border-danger bg-danger-soft text-danger"
											: "border-border bg-surface-alt text-text-primary hover:border-border-strong hover:bg-surface-pressed",
								)}
							>
								{downloadState === "downloading" ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : downloadState === "saved" ? (
									<Check className="h-4 w-4" strokeWidth={3} />
								) : downloadState === "error" ? (
									<span className="font-black">!</span>
								) : (
									<Download className="h-4 w-4" strokeWidth={2.25} />
								)}
								{downloadState === "downloading"
									? "Downloading…"
									: downloadState === "saved"
										? "Downloaded"
										: downloadState === "error"
											? "Couldn't download"
											: "Download MP4"}
							</motion.button>
							{onRegenerate ? (
								<motion.button
									type="button"
									onClick={onRegenerate}
									disabled={regenerating}
									whileTap={!regenerating ? { scale: 0.97 } : undefined}
									className={cn(
										"inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface-alt px-5 text-[13px] font-semibold text-text-primary transition-colors hover:border-border-strong hover:bg-surface-pressed disabled:cursor-not-allowed disabled:opacity-60",
									)}
								>
									{regenerating ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<RefreshCcw className="h-4 w-4" strokeWidth={2.25} />
									)}
									{regenerating ? "Composing…" : "Regenerate"}
								</motion.button>
							) : null}
						</div>

						<p className="text-[11px] leading-relaxed text-text-muted">
							Videos live on the server for ~1 hour. Download to keep permanently.
						</p>
					</div>
				</div>
			</Card>
		</motion.div>
	);
}
