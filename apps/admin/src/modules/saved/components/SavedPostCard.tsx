"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
	Bookmark,
	Hash,
	ImageIcon,
	Mic,
	PlaySquare,
	Search,
	Sparkles,
	type LucideIcon,
} from "lucide-react";
import type { SavedPost } from "@content-assist/shared";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/modules/saved/format";

type Props = {
	post: SavedPost;
	index: number;
};

type Variant = "generate" | "script" | "analyze";

/**
 * Visual language per source. Pink = default brand; violet for Script posts;
 * success green + verdict colours for Analyze. Matches the detail page.
 */
const VARIANT_STYLES: Record<
	Variant,
	{
		icon: LucideIcon;
		label: string;
		chip: string;
		iconTextClass: string;
		hoverGlow: string;
		coverFallback: string;
	}
> = {
	generate: {
		icon: Sparkles,
		label: "Post",
		chip: "border-accent/40 bg-accent-soft text-accent",
		iconTextClass: "text-accent",
		hoverGlow:
			"group-hover:shadow-[0_18px_50px_-18px_hsl(var(--accent)/0.45),0_0_0_1px_hsl(var(--accent)/0.45)]",
		coverFallback:
			"bg-gradient-to-br from-accent/30 via-accent/10 to-transparent",
	},
	script: {
		icon: Mic,
		label: "Script",
		chip: "border-[hsl(270_80%_65%/0.4)] bg-[hsl(270_80%_65%/0.14)] text-[hsl(270_80%_78%)]",
		iconTextClass: "text-[hsl(270_80%_78%)]",
		hoverGlow:
			"group-hover:shadow-[0_18px_50px_-18px_hsl(270_80%_65%/0.45),0_0_0_1px_hsl(270_80%_65%/0.45)]",
		coverFallback:
			"bg-gradient-to-br from-[hsl(270_80%_65%/0.3)] via-[hsl(270_80%_65%/0.1)] to-transparent",
	},
	analyze: {
		icon: Search,
		label: "Analyzed",
		chip: "border-success/40 bg-success-soft text-success",
		iconTextClass: "text-success",
		hoverGlow:
			"group-hover:shadow-[0_18px_50px_-18px_hsl(var(--success)/0.45),0_0_0_1px_hsl(var(--success)/0.45)]",
		coverFallback:
			"bg-gradient-to-br from-success/30 via-success/10 to-transparent",
	},
};

const VERDICT_COLORS: Record<NonNullable<SavedPost["verdict"]>, string> = {
	Weak: "text-danger",
	Average: "text-[hsl(38_92%_60%)]",
	Strong: "text-accent",
	"Very Strong": "text-success",
};

function pickVariant(post: SavedPost): Variant {
	if (post.source === "analyze") return "analyze";
	if (post.mode === "on_camera") return "script";
	return "generate";
}

function getPreview(post: SavedPost, variant: Variant): string | null {
	if (variant === "analyze") {
		return post.improvedPost ?? post.betterHook ?? post.originalContent ?? null;
	}
	if (variant === "script") {
		return post.scriptHook ?? post.scriptLines?.[0] ?? null;
	}
	return post.recommendedHook ?? post.hooks?.[0] ?? post.caption ?? null;
}

export function SavedPostCard({ post, index }: Props) {
	const variant = pickVariant(post);
	const styles = VARIANT_STYLES[variant];
	const VariantIcon = styles.icon;

	const images = post.images ?? [];
	const heroImage = images[0];
	const hasImages = images.length > 0;
	const hasVideo = Boolean(post.video);
	const extraImages = Math.max(0, images.length - 1);
	const hashtagCount = post.hashtags?.length ?? 0;

	const preview = getPreview(post, variant);
	const verdict = post.verdict;
	const verdictColor = verdict ? VERDICT_COLORS[verdict] : null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: 0.04 * index, ease: "easeOut" }}
			whileHover={{ y: -4 }}
		>
			<Link href={`/saved/${post.id}`} className="block">
				<article
					className={cn(
						"group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-border-strong",
						styles.hoverGlow,
					)}
				>
					{/* --- Thumbnail (IG-feed-tile style: image-first) --- */}
					<div className="relative aspect-[4/5] w-full overflow-hidden">
						{heroImage ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={heroImage.url}
								alt=""
								loading="lazy"
								className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
							/>
						) : (
							<div
								className={cn(
									"absolute inset-0 flex items-center justify-center",
									styles.coverFallback,
								)}
							>
								<VariantIcon
									className={cn("h-12 w-12 opacity-70", styles.iconTextClass)}
									strokeWidth={1.5}
								/>
							</div>
						)}

						{/* Bottom gradient — keeps badges legible over photos */}
						<div
							aria-hidden
							className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
						/>

						{/* Top-left: source + content type chips */}
						<div className="absolute left-3 top-3 flex items-center gap-1.5">
							<span
								className={cn(
									"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur",
									styles.chip,
								)}
							>
								<VariantIcon className="h-2.5 w-2.5" strokeWidth={2.75} />
								{styles.label}
							</span>
							<span className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur">
								{post.contentType}
							</span>
						</div>

						{/* Top-right: score ring for analyzed posts */}
						{variant === "analyze" &&
						typeof post.score === "number" &&
						verdictColor ? (
							<div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 backdrop-blur">
								<svg
									viewBox="0 0 44 44"
									className="absolute inset-0 h-full w-full -rotate-90"
								>
									<circle
										cx="22"
										cy="22"
										r="18"
										fill="none"
										stroke="rgba(255,255,255,0.15)"
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
										strokeDasharray={`${(Math.max(0, Math.min(100, post.score)) / 100) * 113.1} 113.1`}
										className={verdictColor}
									/>
								</svg>
								<span
									className={cn(
										"relative text-[12px] font-bold tabular-nums",
										verdictColor,
									)}
								>
									{post.score}
								</span>
							</div>
						) : null}

						{/* Bottom-left: media badges */}
						<div className="absolute bottom-3 left-3 flex items-center gap-1.5">
							{hasImages ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
									<ImageIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
									{images.length}
								</span>
							) : null}
							{hasVideo ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
									<PlaySquare className="h-2.5 w-2.5" strokeWidth={2.5} />
									Reel
								</span>
							) : null}
							{hashtagCount > 0 ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
									<Hash className="h-2.5 w-2.5" strokeWidth={2.5} />
									{hashtagCount}
								</span>
							) : null}
							{!hasImages && !hasVideo && hashtagCount === 0 ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/85 backdrop-blur">
									<Bookmark className="h-2.5 w-2.5" strokeWidth={2.5} />
									Saved
								</span>
							) : null}
						</div>

						{/* Bottom-right: +N for extra images */}
						{extraImages > 0 ? (
							<span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur">
								+{extraImages}
							</span>
						) : null}

						{/* Center play pulse for videos */}
						{hasVideo ? (
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
								<motion.span
									initial={{ scale: 0.9, opacity: 0.85 }}
									animate={{ scale: 1, opacity: 0.95 }}
									transition={{
										duration: 1.8,
										repeat: Infinity,
										repeatType: "reverse",
										ease: "easeInOut",
									}}
									className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-bg shadow-2xl"
								>
									<PlaySquare className="ml-0.5 h-6 w-6 fill-current" strokeWidth={0} />
								</motion.span>
							</div>
						) : null}
					</div>

					{/* --- Body --- */}
					<div className="relative flex flex-1 flex-col gap-2 p-4">
						<div className="flex items-center justify-between gap-3 text-[11px] text-text-muted">
							<span>{formatRelative(post.updatedAt)}</span>
							{verdict && variant === "analyze" ? (
								<span
									className={cn(
										"inline-flex items-center rounded-full border border-current/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
										verdictColor,
									)}
								>
									{verdict}
								</span>
							) : null}
						</div>

						<h3 className="line-clamp-2 text-balance text-[16px] font-semibold leading-snug tracking-tight text-text-primary">
							{post.idea}
						</h3>

						{preview ? (
							<p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
								{preview.split("\n")[0]}
							</p>
						) : null}
					</div>
				</article>
			</Link>
		</motion.div>
	);
}
