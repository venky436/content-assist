"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Search, Target } from "lucide-react";
import { useCallback, useState } from "react";
import type { AnalyzeResponse } from "@content-assist/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { PromptInput } from "@/components/ui/PromptInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useAnalyze } from "@/modules/analyze/hooks";
import { AnalyzeResultsSkeleton } from "@/modules/analyze/components/AnalyzeResultsSkeleton";
import { ImprovedPostCard } from "@/modules/analyze/components/ImprovedPostCard";
import { ScoreCard } from "@/modules/analyze/components/ScoreCard";
import { SaveButton } from "@/modules/saved/components/SaveButton";
import { useSavePost } from "@/modules/saved/hooks";
import { cn } from "@/lib/cn";

export default function AnalyzePage() {
	const router = useRouter();
	const [content, setContent] = useState("");
	const [results, setResults] = useState<AnalyzeResponse | null>(null);

	const analyze = useAnalyze({ onSuccess: (data) => setResults(data) });

	const handleAnalyze = useCallback(() => {
		if (content.trim().length < 10 || analyze.isPending) return;
		setResults(null);
		analyze.mutate({ content: content.trim() });
	}, [analyze, content]);

	const savePost = useSavePost();
	const handleSave = useCallback(async () => {
		if (!results) return;
		await savePost.mutateAsync({
			source: "analyze",
			idea: results.originalHook,
			contentType: "reel",
			originalContent: content.trim(),
			score: results.score,
			verdict: results.verdict,
			betterHook: results.betterHook,
			improvedPost: results.improvedPost,
		});
	}, [content, results, savePost]);

	const handleRegenerate = useCallback(() => {
		if (!results) return;
		// Route to Generate with the improved post as the seed idea.
		const params = new URLSearchParams({ idea: results.improvedPost });
		router.push(`/generate?${params.toString()}`);
	}, [results, router]);

	return (
		<div className="mx-auto w-full max-w-3xl px-8 py-10 lg:py-14">
			{/* Hero */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="mb-8 flex flex-col gap-3"
			>
				<SectionLabel accent className="inline-flex items-center gap-1.5">
					<Search className="h-3 w-3" strokeWidth={2.5} /> Analyze
				</SectionLabel>
				<h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
					Make your next post hit harder.
				</h1>
				<p className="text-[15px] leading-relaxed text-text-secondary">
					Paste any caption, idea, or reel script. You'll get a ruthless score, specific
					weaknesses, and a ready-to-post rewrite that scores higher.
				</p>
			</motion.div>

			{/* AI chat-style input */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.05 }}
			>
				<PromptInput
					value={content}
					onChange={setContent}
					onSubmit={handleAnalyze}
					loading={analyze.isPending}
					submitLabel="Analyze"
					minRows={6}
					maxLength={2000}
					label="Critic"
					placeholder={`Paste a caption or idea. For example:\n\n"Consistency is the key to success. Never give up!"\n\nWe'll tell you exactly what's wrong — and what to post instead.`}
					hint={
						<>
							Paste caption text only (not Instagram links).{" "}
							<span className="text-text-secondary">⌘/Ctrl + Enter to send</span>
						</>
					}
				/>
			</motion.div>

			{/* Results */}
			<div className="mt-10">
				{analyze.isPending ? (
					<AnalyzeResultsSkeleton />
				) : analyze.isError ? (
					<Card className="flex items-start gap-4 border-danger/40 bg-danger-soft p-5">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
							<AlertCircle className="h-4 w-4" strokeWidth={2.5} />
						</span>
						<div className="flex-1">
							<p className="text-[14px] font-semibold text-text-primary">
								Analysis failed
							</p>
							<p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
								{analyze.error?.message ??
									"Please check your connection and try again."}
							</p>
						</div>
						<Button variant="danger" size="sm" onClick={handleAnalyze}>
							Retry
						</Button>
					</Card>
				) : results ? (
					<div className="flex flex-col gap-6">
						<ScoreCard
							score={results.score}
							verdict={results.verdict}
							explanation={results.explanation}
							priorityFix={results.priorityFix}
							confidence={results.confidence}
						/>

						{/* Quick fix — eye-catching */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.05 }}
						>
							<Card className="flex items-start gap-4 p-5">
								<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
									<Target className="h-4 w-4" strokeWidth={2.25} />
								</span>
								<div className="flex-1">
									<SectionLabel className="mb-1.5">Quick fix</SectionLabel>
									<p className="text-[15px] font-medium leading-relaxed text-text-primary">
										{results.quickFix}
									</p>
								</div>
							</Card>
						</motion.div>

						{/* Comparison: your hook vs better hook */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.08 }}
							className="grid gap-4 md:grid-cols-2"
						>
							<Card className="p-5">
								<SectionLabel className="mb-2">Your hook</SectionLabel>
								<p className="text-[15px] leading-relaxed text-text-secondary line-through decoration-text-muted/50">
									{results.originalHook}
								</p>
							</Card>
							<Card
								variant="accent"
								className={cn(
									"relative overflow-hidden p-5",
									results.priorityFix === "hook" && "ring-2 ring-accent/30",
								)}
							>
								<div className="mb-2 flex items-center justify-between">
									<SectionLabel accent>Better hook</SectionLabel>
									{results.priorityFix === "hook" ? (
										<span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
											🎯 Priority
										</span>
									) : null}
								</div>
								<p className="text-[16px] font-semibold leading-relaxed text-text-primary">
									{results.betterHook}
								</p>
								<p className="mt-2 text-[12px] leading-relaxed text-text-muted">
									<span className="font-semibold text-text-secondary">
										Why it works:
									</span>{" "}
									{results.hookReason}
								</p>
							</Card>
						</motion.div>

						{/* Problems + caption issues */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.1 }}
							className="grid gap-4 md:grid-cols-2"
						>
							<Card className="p-5">
								<SectionLabel className="mb-3">Problems</SectionLabel>
								<div className="flex flex-wrap gap-2">
									{results.problems.map((p) => (
										<span
											key={p}
											className="rounded-full border border-danger/40 bg-danger-soft px-3 py-1 text-[12px] font-semibold text-danger"
										>
											{p}
										</span>
									))}
								</div>
							</Card>
							<Card className="p-5">
								<SectionLabel className="mb-3">Caption issues</SectionLabel>
								<ul className="flex flex-col gap-2">
									{results.captionIssues.map((issue) => (
										<li
											key={issue}
											className="flex items-start gap-2 text-[13px] leading-relaxed text-text-secondary"
										>
											<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
											{issue}
										</li>
									))}
								</ul>
							</Card>
						</motion.div>

						{/* Improved caption card */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.11 }}
						>
							<Card
								className={cn(
									"p-5",
									results.priorityFix === "caption" &&
										"border-accent/40 ring-2 ring-accent/30",
								)}
							>
								<div className="mb-3 flex items-center justify-between">
									<SectionLabel accent={results.priorityFix === "caption"}>
										Improved caption
									</SectionLabel>
									{results.priorityFix === "caption" ? (
										<span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
											🎯 Priority
										</span>
									) : null}
								</div>
								<p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">
									{results.improvedCaption}
								</p>
								<p className="mt-3 text-[12px] leading-relaxed text-text-muted">
									<span className="font-semibold text-text-secondary">
										What changed:
									</span>{" "}
									{results.captionReason}
								</p>
							</Card>
						</motion.div>

						{/* ImprovedPostCard — THE authoritative copy target */}
						<ImprovedPostCard improvedPost={results.improvedPost} />

						{/* Insight */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.14 }}
						>
							<Card className="border-l-4 border-l-accent p-5">
								<SectionLabel className="mb-2">Creator insight</SectionLabel>
								<p className="text-[14px] leading-relaxed italic text-text-secondary">
									{results.insight}
								</p>
							</Card>
						</motion.div>

						<div className="flex flex-col gap-3 pt-2 sm:flex-row">
							<Button
								variant="primary"
								size="lg"
								fullWidth
								onClick={handleRegenerate}
								iconRight={<ArrowRight className="h-4 w-4" />}
							>
								Generate improved version
							</Button>
							<div className="sm:flex-1">
								<SaveButton onSave={handleSave} />
							</div>
						</div>
					</div>
				) : (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<Card className="flex flex-col items-center gap-3 px-8 py-12 text-center">
							<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
								<Search className="h-5 w-5 text-accent" strokeWidth={2} />
							</span>
							<h3 className="text-[17px] font-semibold tracking-tight">
								Paste your content to start
							</h3>
							<p className="max-w-sm text-[14px] leading-relaxed text-text-secondary">
								Caption, idea, reel script — any text. You'll get a score + a full
								rewrite in about 5 seconds.
							</p>
						</Card>
					</motion.div>
				)}
			</div>
		</div>
	);
}
