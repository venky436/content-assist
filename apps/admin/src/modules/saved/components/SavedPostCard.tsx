"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ImageIcon, Mic, PlaySquare, Search, Sparkles } from "lucide-react";
import type { SavedPost } from "@content-assist/shared";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/modules/saved/format";

type Props = {
	post: SavedPost;
	index: number;
};

const VERDICT_TEXT: Record<NonNullable<SavedPost["verdict"]>, string> = {
	Weak: "text-danger",
	Average: "text-[hsl(38_92%_60%)]",
	Strong: "text-accent",
	"Very Strong": "text-success",
};

/**
 * Mode-driven palette so each card reads its type from 3 feet away:
 *   Analyzed  → hot pink     (accent)
 *   Script    → violet
 *   Faceless  → emerald (success)
 */
function palette(source: "accent" | "violet" | "success") {
	if (source === "accent") {
		return {
			ring: "from-accent/25",
			glow: "group-hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.5),0_20px_40px_-20px_hsl(var(--accent)/0.4)]",
			stripe: "from-accent via-accent to-accent/50",
			icon: "bg-accent-soft text-accent border-accent/40",
			text: "text-accent",
			quoteBar: "bg-accent/60",
		};
	}
	if (source === "violet") {
		return {
			ring: "from-[hsl(270_80%_65%/0.3)]",
			glow: "group-hover:shadow-[0_0_0_1px_hsl(270_80%_65%/0.5),0_20px_40px_-20px_hsl(270_80%_65%/0.4)]",
			stripe:
				"from-[hsl(270_80%_65%)] via-[hsl(270_80%_65%)] to-[hsl(270_80%_65%/0.5)]",
			icon: "bg-[hsl(270_80%_65%/0.16)] text-[hsl(270_80%_78%)] border-[hsl(270_80%_65%/0.4)]",
			text: "text-[hsl(270_80%_78%)]",
			quoteBar: "bg-[hsl(270_80%_65%/0.6)]",
		};
	}
	return {
		ring: "from-success/25",
		glow: "group-hover:shadow-[0_0_0_1px_hsl(var(--success)/0.5),0_20px_40px_-20px_hsl(var(--success)/0.4)]",
		stripe: "from-success via-success to-success/50",
		icon: "bg-success-soft text-success border-success/40",
		text: "text-success",
		quoteBar: "bg-success/60",
	};
}

export function SavedPostCard({ post, index }: Props) {
	const isAnalyzed = post.source === "analyze";
	const isScript = !isAnalyzed && post.mode === "on_camera";

	const SourceIcon = isAnalyzed ? Search : isScript ? Mic : Sparkles;
	const sourceLabel = isAnalyzed ? "Analyzed" : isScript ? "Script" : "Post";
	const p = palette(isAnalyzed ? "accent" : isScript ? "violet" : "success");

	const preview = isAnalyzed
		? post.improvedPost ?? post.betterHook ?? post.originalContent
		: isScript
			? post.scriptHook ?? post.scriptLines?.[0]
			: post.recommendedHook ?? post.hooks?.[0];

	const hasImages = Boolean(post.images && post.images.length > 0);
	const hasVideo = Boolean(post.video);

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: 0.04 * index, ease: "easeOut" }}
			whileHover={{ y: -3 }}
		>
			<Link href={`/saved/${post.id}`} className="block">
				<article
					className={cn(
						"group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-gradient-surface transition-all duration-300",
						p.glow,
					)}
				>
					{/* Left accent stripe — subtly fades out bottom for premium feel */}
					<div
						className={cn(
							"pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b",
							p.stripe,
						)}
					/>

					{/* Top-right ambient glow — mode-colored, softens the surface */}
					<div
						aria-hidden
						className={cn(
							"pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-radial to-transparent blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-100",
							p.ring,
						)}
					/>

					{/* Very subtle inner highlight line for a lifted feel */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
					/>

					<div className="relative flex flex-1 flex-col gap-4 p-5">
						{/* Header — icon + label + date */}
						<header className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<span
									className={cn(
										"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
										p.icon,
									)}
								>
									<SourceIcon className="h-4 w-4" strokeWidth={2.25} />
								</span>
								<div className="flex flex-col leading-tight">
									<span
										className={cn(
											"text-[10px] font-bold uppercase tracking-[0.14em]",
											p.text,
										)}
									>
										{sourceLabel}
									</span>
									<span className="text-[11px] text-text-muted">
										{formatRelative(post.updatedAt)}
									</span>
								</div>
							</div>

							{/* Score ring for analyzed posts, format pill otherwise */}
							{isAnalyzed && typeof post.score === "number" ? (
								<div
									className={cn(
										"relative flex h-11 w-11 shrink-0 items-center justify-center",
									)}
								>
									<svg
										viewBox="0 0 44 44"
										className="absolute inset-0 h-full w-full -rotate-90"
									>
										<circle
											cx="22"
											cy="22"
											r="18"
											fill="none"
											stroke="hsl(var(--border))"
											strokeWidth="3"
										/>
										<circle
											cx="22"
											cy="22"
											r="18"
											fill="none"
											strokeLinecap="round"
											strokeWidth="3"
											stroke="currentColor"
											strokeDasharray={`${
												(Math.max(0, Math.min(100, post.score)) / 100) * 113.1
											} 113.1`}
											className={post.verdict ? VERDICT_TEXT[post.verdict] : p.text}
										/>
									</svg>
									<span
										className={cn(
											"relative text-[13px] font-bold tabular-nums",
											post.verdict ? VERDICT_TEXT[post.verdict] : "",
										)}
									>
										{post.score}
									</span>
								</div>
							) : (
								<span className="shrink-0 rounded-full border border-border bg-bg-elevated/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
									{post.contentType}
								</span>
							)}
						</header>

						{/* Idea headline */}
						<h3 className="line-clamp-2 text-balance text-[17px] font-semibold leading-[1.3] tracking-tight text-text-primary">
							{post.idea}
						</h3>

						{/* Preview — quote-style with subtle left bar */}
						{preview ? (
							<div className="flex items-start gap-3">
								<span
									className={cn(
										"mt-1 h-[38px] w-[2px] shrink-0 rounded-full",
										p.quoteBar,
									)}
								/>
								<p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
									{preview.split("\n")[0]}
								</p>
							</div>
						) : null}

						{/* Footer — media indicators + arrow */}
						<footer className="mt-auto flex items-center justify-between pt-2">
							<div className="flex items-center gap-1.5">
								{hasImages ? (
									<span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-alt/60 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
										<ImageIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
										{post.images?.length ?? 0}
									</span>
								) : null}
								{hasVideo ? (
									<span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
										<PlaySquare className="h-2.5 w-2.5" strokeWidth={2.5} />
										Video
									</span>
								) : null}
								{!hasImages && !hasVideo ? (
									<span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
										Open →
									</span>
								) : null}
							</div>
							<motion.span
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-alt/70 transition-all group-hover:border-border-strong",
									p.text,
								)}
								whileHover={{ x: 2 }}
							>
								<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
							</motion.span>
						</footer>
					</div>
				</article>
			</Link>
		</motion.div>
	);
}
