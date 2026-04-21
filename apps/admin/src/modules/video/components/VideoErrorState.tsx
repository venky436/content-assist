"use client";

import { motion } from "framer-motion";
import { AlertCircle, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
	message: string;
	code?: string;
	onRetry: () => void;
};

export function VideoErrorState({ message, code, onRetry }: Props) {
	const isFfmpegMissing = code === "ffmpeg_not_installed";
	const isTTSMissing = code === "tts_not_configured";
	const isTimeout = code === "timeout";
	const hideRetry = isFfmpegMissing || isTTSMissing;

	const Icon = isTimeout
		? Clock
		: isFfmpegMissing || isTTSMissing
			? Settings
			: AlertCircle;

	const title = isTimeout
		? "Video took too long"
		: isFfmpegMissing
			? "FFmpeg not installed"
			: isTTSMissing
				? "Voiceover not configured"
				: "Couldn't generate video";

	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex items-start gap-4 rounded-2xl border border-danger/40 bg-danger-soft p-5"
		>
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
				<Icon className="h-4 w-4" strokeWidth={2.5} />
			</span>
			<div className="flex-1">
				<p className="text-[14px] font-semibold text-text-primary">{title}</p>
				<p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
					{message}
				</p>
			</div>
			{!hideRetry ? (
				<Button variant="danger" size="sm" onClick={onRetry}>
					Retry
				</Button>
			) : null}
		</motion.div>
	);
}
