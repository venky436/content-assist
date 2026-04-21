"use client";

import { motion } from "framer-motion";
import type { AnalyzeResponse, HookVerdict } from "@content-assist/shared";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/cn";

type Props = {
	score: number;
	verdict: HookVerdict;
	explanation: string;
	priorityFix: AnalyzeResponse["priorityFix"];
	confidence: AnalyzeResponse["confidence"];
};

const VERDICT_COLORS: Record<HookVerdict, { bg: string; border: string; text: string; glow: string }> = {
	Weak: {
		bg: "bg-danger-soft",
		border: "border-danger/50",
		text: "text-danger",
		glow: "from-danger/20",
	},
	Average: {
		bg: "bg-[hsl(38_92%_50%/0.14)]",
		border: "border-[hsl(38_92%_50%/0.5)]",
		text: "text-[hsl(38_92%_60%)]",
		glow: "from-[hsl(38_92%_50%/0.18)]",
	},
	Strong: {
		bg: "bg-accent-soft",
		border: "border-accent/50",
		text: "text-accent",
		glow: "from-accent/20",
	},
	"Very Strong": {
		bg: "bg-success-soft",
		border: "border-success/50",
		text: "text-success",
		glow: "from-success/20",
	},
};

export function ScoreCard({ score, verdict, explanation, priorityFix, confidence }: Props) {
	const palette = VERDICT_COLORS[verdict];
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35 }}
		>
			<Card
				className={cn(
					"relative overflow-hidden p-7",
					palette.bg,
					palette.border,
				)}
			>
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-gradient-radial blur-3xl",
						palette.glow,
						"to-transparent",
					)}
				/>
				<div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
					{/* Score ring */}
					<div className="flex items-center gap-5">
						<div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center">
							<svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
								<circle
									cx="60"
									cy="60"
									r="52"
									fill="none"
									stroke="hsl(var(--border))"
									strokeWidth="6"
								/>
								<motion.circle
									cx="60"
									cy="60"
									r="52"
									fill="none"
									strokeLinecap="round"
									strokeWidth="6"
									className={palette.text}
									stroke="currentColor"
									initial={{ strokeDasharray: "0 326.7" }}
									animate={{
										strokeDasharray: `${(score / 100) * 326.7} 326.7`,
									}}
									transition={{ duration: 1, ease: "easeOut" }}
								/>
							</svg>
							<div className="relative flex flex-col items-center leading-none">
								<span className="text-4xl font-bold tabular-nums">{score}</span>
								<span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
									/100
								</span>
							</div>
						</div>
						<div className="flex flex-col gap-1.5">
							<SectionLabel>Hook score</SectionLabel>
							<span
								className={cn(
									"w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest",
									palette.bg,
									palette.border,
									palette.text,
								)}
							>
								{verdict}
							</span>
						</div>
					</div>
					{/* Explanation + priority */}
					<div className="flex-1">
						<p className="text-[15px] leading-relaxed text-text-primary">
							{explanation}
						</p>
						<div className="mt-4 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
								🎯 Priority:{" "}
								<span className="text-text-primary capitalize">{priorityFix}</span>
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-text-secondary capitalize">
								Confidence: {confidence}
							</span>
						</div>
					</div>
				</div>
			</Card>
		</motion.div>
	);
}
