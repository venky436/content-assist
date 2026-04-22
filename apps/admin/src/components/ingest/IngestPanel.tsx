"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowRight,
	ImagePlus,
	Loader2,
	RotateCcw,
	Sparkles,
	Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { INGEST_LIMITS, type IngestResponse } from "@content-assist/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
	useIngestImage,
	useIngestVideo,
} from "@/modules/ingest/hooks";

type Mode = "video" | "image";

type Props = {
	mode: Mode;
	/** Called with the user-confirmed context string. Caller fills its idea/content. */
	onApply: (context: string) => void;
	/** Copy shown on the primary button. Defaults to "Apply". */
	applyLabel?: string;
	disabled?: boolean;
};

const STATUS_STEPS: Record<Mode, string[]> = {
	video: [
		"Extracting audio…",
		"Transcribing with Whisper…",
		"Summarising with Gemini…",
	],
	image: ["Reading image…", "Running OCR…", "Summarising with Gemini…"],
};

/**
 * State machine:
 *   idle    → Dropzone accepts a file
 *   loading → spinner + rotating status copy
 *   detected → editable TextArea + Apply / Upload-another
 *   (error is surfaced via toast + returns to idle)
 *
 * Reuses existing primitives — no new UI atoms.
 */
export function IngestPanel({ mode, onApply, applyLabel = "Apply", disabled }: Props) {
	const toast = useToast();
	const videoMutation = useIngestVideo();
	const imageMutation = useIngestImage();
	const mutation = mode === "video" ? videoMutation : imageMutation;

	const [result, setResult] = useState<IngestResponse | null>(null);
	const [context, setContext] = useState("");
	const [statusIdx, setStatusIdx] = useState(0);

	// Cycle through the status steps while pending for personality.
	useEffect(() => {
		if (!mutation.isPending) return;
		setStatusIdx(0);
		const id = setInterval(() => {
			setStatusIdx((i) => Math.min(i + 1, STATUS_STEPS[mode].length - 1));
		}, 1500);
		return () => clearInterval(id);
	}, [mutation.isPending, mode]);

	function validateLocally(file: File): string | null {
		if (mode === "video") {
			const limits = INGEST_LIMITS.video;
			if (!file.type.startsWith(limits.mimePrefix)) {
				return "Upload a video file (MP4, MOV, WebM).";
			}
			if (file.size > limits.maxBytes) {
				return `Video is over ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`;
			}
			return null;
		}
		const limits = INGEST_LIMITS.image;
		if (!(limits.mime as readonly string[]).includes(file.type)) {
			return "Only JPG, PNG, or WebP images are supported.";
		}
		if (file.size > limits.maxBytes) {
			return `Image is over ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`;
		}
		return null;
	}

	async function handleFiles(files: File[]) {
		const file = files[0];
		if (!file) return;
		const err = validateLocally(file);
		if (err) {
			toast.error("Couldn't accept that", err);
			return;
		}
		try {
			const data = await mutation.mutateAsync(file);
			setResult(data);
			setContext(data.context ?? "");
			if (!data.context) {
				toast.info(
					mode === "video" ? "No speech detected" : "Couldn't read any text",
					"Type your idea manually and hit Apply.",
				);
			}
		} catch (e) {
			toast.error(
				mode === "video" ? "Video ingest failed" : "Image ingest failed",
				e instanceof Error ? e.message : undefined,
			);
			setResult(null);
		}
	}

	function reset() {
		setResult(null);
		setContext("");
		mutation.reset();
	}

	function handleApply() {
		const clean = context.trim();
		if (!clean) {
			toast.info("Type a few words first", "The context can't be empty.");
			return;
		}
		onApply(clean);
	}

	const kindLabel = mode === "video" ? "clip" : "image";
	const icon = mode === "video" ? Video : ImagePlus;

	return (
		<AnimatePresence mode="wait" initial={false}>
			{mutation.isPending ? (
				<motion.div
					key="loading"
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -6 }}
				>
					<LoadingCard
						label={STATUS_STEPS[mode][statusIdx] ?? "Processing…"}
					/>
				</motion.div>
			) : result ? (
				<motion.div
					key="detected"
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -6 }}
				>
					<DetectedCard
						mode={mode}
						context={context}
						onContextChange={setContext}
						raw={mode === "video" ? result.transcript : result.extractedText}
						onApply={handleApply}
						onReset={reset}
						applyLabel={applyLabel}
					/>
				</motion.div>
			) : (
				<motion.div
					key="idle"
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -6 }}
				>
					<Dropzone
						accept={mode === "video" ? "video/*" : "image/jpeg,image/png,image/webp"}
						icon={icon}
						disabled={disabled}
						onFiles={handleFiles}
						title={
							mode === "video"
								? "Drop a clip, or click to browse"
								: "Drop an image, or click to browse"
						}
						hint={
							mode === "video"
								? `Up to ${INGEST_LIMITS.video.maxDurationSec}s · MP4 / MOV / WebM · ${Math.round(
										INGEST_LIMITS.video.maxBytes / 1024 / 1024,
									)} MB max`
								: `JPG, PNG, WebP · ${Math.round(
										INGEST_LIMITS.image.maxBytes / 1024 / 1024,
									)} MB max`
						}
						className="min-h-[160px]"
					/>
					<p className="mt-3 text-center text-[12px] leading-relaxed text-text-muted">
						We'll read the {kindLabel} to extract your idea. Nothing is stored —
						the file is deleted after we summarise it.
					</p>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function LoadingCard({ label }: { label: string }) {
	return (
		<Card className="flex items-center gap-4 p-6">
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
				<Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
			</span>
			<div className="flex flex-1 flex-col gap-1">
				<SectionLabel accent>Analyzing</SectionLabel>
				<p className="text-[14px] font-medium text-text-primary">{label}</p>
			</div>
		</Card>
	);
}

function DetectedCard({
	mode,
	context,
	onContextChange,
	raw,
	onApply,
	onReset,
	applyLabel,
}: {
	mode: Mode;
	context: string;
	onContextChange: (v: string) => void;
	raw?: string;
	onApply: () => void;
	onReset: () => void;
	applyLabel: string;
}) {
	const [showRaw, setShowRaw] = useState(false);

	return (
		<Card variant="accent" className={cn("relative overflow-hidden p-5 sm:p-6")}>
			<div
				aria-hidden
				className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
			/>
			<div className="relative flex flex-col gap-4">
				<SectionLabel accent className="inline-flex items-center gap-1.5">
					<Sparkles className="h-3 w-3" strokeWidth={2.5} />
					Detected context
				</SectionLabel>

				<TextArea
					label={mode === "video" ? "Your idea (from the clip)" : "Your idea (from the image)"}
					value={context}
					onChange={(e) => onContextChange(e.target.value)}
					rows={3}
					maxLength={300}
					placeholder={
						mode === "video"
							? "Couldn't catch speech. Type your idea here."
							: "Couldn't read text. Type your idea here."
					}
					onKeyDown={(e) => {
						if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
							e.preventDefault();
							onApply();
						}
					}}
				/>

				{raw ? (
					<div className="flex flex-col gap-1.5">
						<button
							type="button"
							onClick={() => setShowRaw((v) => !v)}
							className="self-start text-[11px] font-semibold uppercase tracking-widest text-text-muted transition-colors hover:text-text-secondary"
						>
							{showRaw ? "Hide raw source" : "Show raw source"}
						</button>
						<AnimatePresence initial={false}>
							{showRaw ? (
								<motion.p
									key="raw"
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.18 }}
									className="whitespace-pre-wrap rounded-lg border border-border/60 bg-surface-alt/40 p-3 text-[12px] leading-relaxed text-text-muted"
								>
									{raw}
								</motion.p>
							) : null}
						</AnimatePresence>
					</div>
				) : null}

				<div className="flex items-center justify-end gap-2 pt-1">
					<Button
						type="button"
						variant="ghost"
						onClick={onReset}
						iconLeft={<RotateCcw className="h-4 w-4" strokeWidth={2.25} />}
					>
						Upload another
					</Button>
					<Button
						type="button"
						onClick={onApply}
						iconRight={<ArrowRight className="h-4 w-4" strokeWidth={2.25} />}
					>
						{applyLabel}
					</Button>
				</div>
			</div>
		</Card>
	);
}
