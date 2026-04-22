"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Bookmark,
	Flame,
	Hash,
	ImageIcon,
	Mic,
	PlaySquare,
	Search,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import type { GenerateMode, SavedPost } from "@content-assist/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { ImageGrid } from "@/modules/images/components/ImageGrid";
import { formatRelative } from "@/modules/saved/format";
import { useDeleteSavedPost, useSavedPost } from "@/modules/saved/hooks";
import { VideoPlayer } from "@/modules/video/components/VideoPlayer";

const VERDICT_COLORS: Record<NonNullable<SavedPost["verdict"]>, string> = {
	Weak: "text-danger border-danger/40 bg-danger-soft",
	Average:
		"text-[hsl(38_92%_60%)] border-[hsl(38_92%_50%/0.5)] bg-[hsl(38_92%_50%/0.14)]",
	Strong: "text-accent border-accent/40 bg-accent-soft",
	"Very Strong": "text-success border-success/40 bg-success-soft",
};

function getMode(post: SavedPost): GenerateMode {
	return post.mode ?? "faceless";
}

export default function SavedDetailPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const { data: post, isLoading } = useSavedPost(id);
	const deletePost = useDeleteSavedPost();
	const toast = useToast();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const handleDelete = () => {
		if (!post) return;
		deletePost.mutate(post.id, {
			onSuccess: () => {
				toast.success("Deleted");
				router.push("/saved");
			},
			onError: (err) => {
				toast.error(
					"Couldn't delete",
					err instanceof Error ? err.message : undefined,
				);
				setConfirmOpen(false);
			},
		});
	};

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-5xl px-6 py-14 sm:px-10 lg:px-14">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="mt-8 h-12 w-3/4" />
				<div className="mt-12 flex flex-col gap-6">
					{[0, 1, 2].map((i) => (
						<Card key={i} className="flex flex-col gap-3 p-5">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
				<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt">
					<Bookmark className="h-5 w-5 text-text-muted" strokeWidth={2} />
				</span>
				<h2 className="text-xl font-semibold tracking-tight">Post not found</h2>
				<p className="text-[14px] text-text-secondary">
					This saved post may have been removed, or the link is incorrect.
				</p>
				<Link href="/saved">
					<Button variant="secondary">Back to Saved</Button>
				</Link>
			</div>
		);
	}

	const isAnalyzed = post.source === "analyze";
	const mode = getMode(post);
	const isScript = !isAnalyzed && mode === "on_camera";

	const SourceIcon = isAnalyzed ? Search : isScript ? Mic : Sparkles;
	const sourcePill = isAnalyzed
		? "border-accent/40 bg-accent-soft text-accent"
		: isScript
			? "border-[hsl(270_80%_65%/0.4)] bg-[hsl(270_80%_65%/0.14)] text-[hsl(270_80%_75%)]"
			: "border-success/40 bg-success-soft text-success";
	const sourceLabel = isAnalyzed ? "Analyzed" : isScript ? "Script" : "Generated";

	const copyable = isAnalyzed
		? post.improvedPost ?? ""
		: isScript
			? [
					post.scriptHook,
					(post.scriptLines ?? []).join("\n"),
					post.scriptCta,
					(post.hashtags ?? []).join(" "),
				]
					.filter(Boolean)
					.join("\n\n")
			: [post.recommendedHook, post.caption, (post.hashtags ?? []).join(" ")]
					.filter(Boolean)
					.join("\n\n");

	return (
		<div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
			<Link
				href="/saved"
				className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
			>
				<ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Saved
			</Link>

			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="flex flex-col gap-4"
			>
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={cn(
							"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest",
							sourcePill,
						)}
					>
						<SourceIcon className="h-3 w-3" strokeWidth={2.5} />
						{sourceLabel}
					</span>
					<span className="text-[12px] text-text-muted">
						Saved {formatRelative(post.createdAt)}
					</span>
				</div>
				<h1 className="text-balance text-3xl font-bold leading-tight tracking-tight lg:text-[34px]">
					{post.idea}
				</h1>
			</motion.div>

			<div className="mt-10 flex flex-col gap-6">
				{isAnalyzed ? (
					<>
						{typeof post.score === "number" && post.verdict ? (
							<Card className="flex items-center gap-6 p-6">
								<div className="relative flex h-[96px] w-[96px] items-center justify-center">
									<svg
										viewBox="0 0 120 120"
										className="absolute inset-0 h-full w-full -rotate-90"
									>
										<circle
											cx="60"
											cy="60"
											r="52"
											fill="none"
											stroke="hsl(var(--border))"
											strokeWidth="6"
										/>
										<circle
											cx="60"
											cy="60"
											r="52"
											fill="none"
											strokeLinecap="round"
											strokeWidth="6"
											stroke="currentColor"
											strokeDasharray={`${(post.score / 100) * 326.7} 326.7`}
											className={post.verdict ? VERDICT_COLORS[post.verdict] : ""}
										/>
									</svg>
									<div className="relative flex flex-col items-center">
										<span className="text-3xl font-bold tabular-nums">
											{post.score}
										</span>
										<span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
											/100
										</span>
									</div>
								</div>
								<div className="flex flex-col gap-2">
									<SectionLabel>Hook score</SectionLabel>
									<span
										className={cn(
											"w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest",
											VERDICT_COLORS[post.verdict],
										)}
									>
										{post.verdict}
									</span>
								</div>
							</Card>
						) : null}

						{post.improvedPost ? (
							<Card variant="accent" className="relative overflow-hidden p-6">
								<div
									aria-hidden
									className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
								/>
								<div className="relative flex flex-col gap-3">
									<SectionLabel accent className="inline-flex items-center gap-1.5">
										<Sparkles className="h-3 w-3" strokeWidth={2.5} /> Ready-to-post
										rewrite
									</SectionLabel>
									<p className="whitespace-pre-wrap text-[17px] leading-relaxed text-text-primary">
										{post.improvedPost}
									</p>
								</div>
							</Card>
						) : null}

						{post.originalContent ? (
							<Card className="p-5">
								<SectionLabel className="mb-3">Original content</SectionLabel>
								<p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-secondary">
									{post.originalContent}
								</p>
							</Card>
						) : null}
					</>
				) : isScript ? (
					<>
						{post.scriptHook &&
						post.scriptLines &&
						post.scriptLines.length >= 3 &&
						post.scriptCta ? (
							<Card variant="accent" className="relative overflow-hidden p-6">
								<div
									aria-hidden
									className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
								/>
								<div className="relative flex flex-col gap-6">
									<div className="flex flex-col gap-1.5">
										<SectionLabel accent>Hook</SectionLabel>
										<p className="text-[22px] font-semibold leading-snug tracking-tight">
											{post.scriptHook}
										</p>
									</div>
									<div className="h-px bg-border/60" />
									<div className="flex flex-col gap-3">
										<SectionLabel>Spoken lines</SectionLabel>
										<div className="flex gap-4">
											<div className="w-1 shrink-0 rounded-full bg-accent" />
											<div className="flex flex-1 flex-col gap-3">
												{post.scriptLines.map((line, i) => (
													<div key={i} className="flex items-start gap-3">
														<span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-alt text-[11px] font-bold tabular-nums text-text-muted">
															{i + 1}
														</span>
														<p className="flex-1 text-[16px] leading-relaxed">
															{line}
														</p>
													</div>
												))}
											</div>
										</div>
									</div>
									<div className="h-px bg-border/60" />
									<div className="flex flex-col gap-1.5">
										<SectionLabel>Closing CTA</SectionLabel>
										<p className="text-[17px] font-semibold text-accent">
											{post.scriptCta}
										</p>
									</div>
								</div>
							</Card>
						) : null}

						{post.hashtags && post.hashtags.length > 0 ? (
							<Card className="p-5">
								<div className="mb-3 flex items-center justify-between">
									<SectionLabel className="inline-flex items-center gap-1.5">
										<Hash className="h-3 w-3" strokeWidth={2.5} />{" "}
										{post.hashtags.length} hashtags
									</SectionLabel>
									<CopyButton
										getText={() => (post.hashtags ?? []).join(" ")}
										size="sm"
									/>
								</div>
								<div className="flex flex-wrap gap-2">
									{post.hashtags.map((tag) => (
										<span
											key={tag}
											className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-[13px] font-medium text-text-secondary"
										>
											{tag}
										</span>
									))}
								</div>
							</Card>
						) : null}
					</>
				) : (
					<>
						{post.recommendedHook ? (
							<Card variant="accent" className="relative overflow-hidden p-6">
								<div
									aria-hidden
									className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
								/>
								<div className="relative flex flex-col gap-2">
									<SectionLabel accent className="inline-flex items-center gap-1.5">
										<Flame className="h-3 w-3" strokeWidth={2.5} /> Recommended hook
									</SectionLabel>
									<p className="text-[20px] font-semibold leading-snug tracking-tight">
										{post.recommendedHook}
									</p>
									{post.recommendedReason ? (
										<p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
											<span className="font-semibold text-text-primary">
												Why this works:
											</span>{" "}
											{post.recommendedReason}
										</p>
									) : null}
								</div>
							</Card>
						) : null}

						{post.hooks && post.hooks.length > 0 ? (
							<Card className="p-5">
								<SectionLabel className="mb-4">All hooks</SectionLabel>
								<ul className="flex flex-col gap-3">
									{post.hooks.map((hook, i) => (
										<li key={hook} className="flex items-start gap-3">
											<span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-alt text-[11px] font-bold text-text-muted">
												{i + 1}
											</span>
											<p className="flex-1 text-[15px] leading-relaxed">{hook}</p>
										</li>
									))}
								</ul>
							</Card>
						) : null}

						{post.caption ? (
							<Card className="p-5">
								<div className="mb-3 flex items-center justify-between">
									<SectionLabel>Caption</SectionLabel>
									<CopyButton getText={() => post.caption ?? ""} size="sm" />
								</div>
								<p className="whitespace-pre-wrap text-[15px] leading-relaxed">
									{post.caption}
								</p>
							</Card>
						) : null}

						{post.hashtags && post.hashtags.length > 0 ? (
							<Card className="p-5">
								<div className="mb-3 flex items-center justify-between">
									<SectionLabel className="inline-flex items-center gap-1.5">
										<Hash className="h-3 w-3" strokeWidth={2.5} />{" "}
										{post.hashtags.length} hashtags
									</SectionLabel>
									<CopyButton
										getText={() => (post.hashtags ?? []).join(" ")}
										size="sm"
									/>
								</div>
								<div className="flex flex-wrap gap-2">
									{post.hashtags.map((tag) => (
										<span
											key={tag}
											className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-[13px] font-medium text-text-secondary"
										>
											{tag}
										</span>
									))}
								</div>
							</Card>
						) : null}

						{post.images && post.images.length > 0 ? (
							<Card className="p-5">
								<SectionLabel className="mb-4 inline-flex items-center gap-1.5">
									<ImageIcon className="h-3 w-3" strokeWidth={2.5} /> Your images
								</SectionLabel>
								<ImageGrid images={post.images} readOnly />
							</Card>
						) : null}

						{post.video ? (
							<section className="flex flex-col gap-3">
								<SectionLabel className="inline-flex items-center gap-1.5">
									<PlaySquare className="h-3 w-3" strokeWidth={2.5} /> Reel video
								</SectionLabel>
								<VideoPlayer
									videoUrl={post.video.videoUrl}
									voiceover={post.video.voiceover}
									durationMs={post.video.durationMs}
									bgmUsed={post.video.bgmUsed}
								/>
							</section>
						) : null}
					</>
				)}

				<div className="mt-4 flex flex-col gap-3 sm:flex-row">
					<div className="sm:flex-1">
						<CopyButton
							getText={() => copyable}
							label="Copy full post"
							className="w-full justify-center !h-[52px] !px-7 !text-[15px]"
						/>
					</div>
					<Button
						variant="danger"
						size="lg"
						onClick={() => setConfirmOpen(true)}
						iconLeft={<Trash2 className="h-4 w-4" strokeWidth={2.25} />}
					>
						Delete
					</Button>
				</div>

				<ConfirmDialog
					open={confirmOpen}
					onClose={() => setConfirmOpen(false)}
					onConfirm={handleDelete}
					title="Delete this post?"
					description="The post, its images, and its video will be permanently removed. This can't be undone."
					confirmLabel="Delete"
					cancelLabel="Keep"
					confirmVariant="danger"
					busy={deletePost.isPending}
				/>

				<Link
					href={isAnalyzed ? "/analyze" : "/generate"}
					className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-accent transition-transform hover:translate-x-0.5"
				>
					{isAnalyzed ? "Analyze another" : "Generate another"}
					<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
				</Link>
			</div>
		</div>
	);
}
