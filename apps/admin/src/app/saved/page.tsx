"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Skeleton } from "@/components/ui/Skeleton";
import { SavedPostCard } from "@/modules/saved/components/SavedPostCard";
import { useSavedPostsList } from "@/modules/saved/hooks";

export default function SavedPage() {
	const { data: posts, isLoading } = useSavedPostsList();

	return (
		<div className="mx-auto w-full max-w-5xl px-8 py-10 lg:py-14">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="mb-10 flex items-center justify-between"
			>
				<div className="flex flex-col gap-3">
					<SectionLabel accent className="inline-flex items-center gap-1.5">
						<Bookmark className="h-3 w-3" strokeWidth={2.5} /> Saved
					</SectionLabel>
					<h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
						Your workspace
					</h1>
					<p className="max-w-xl text-[15px] leading-relaxed text-text-secondary">
						Every post you save lives here. Revisit, copy, or delete any time.
						{typeof posts?.length === "number" && posts.length > 0 ? (
							<span className="text-text-muted">
								{" "}
								· {posts.length} post{posts.length === 1 ? "" : "s"}
							</span>
						) : null}
					</p>
				</div>
			</motion.div>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2, 3].map((i) => (
						<Card key={i} className="p-5">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="mt-4 h-5 w-3/4" />
							<Skeleton className="mt-2 h-4 w-full" />
							<Skeleton className="mt-2 h-4 w-5/6" />
							<Skeleton className="mt-4 h-4 w-16" />
						</Card>
					))}
				</div>
			) : !posts || posts.length === 0 ? (
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<Card className="flex flex-col items-center gap-4 px-8 py-16 text-center">
						<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
							<Bookmark className="h-6 w-6 text-accent" strokeWidth={2} />
						</span>
						<h3 className="text-xl font-semibold tracking-tight">
							Nothing saved yet
						</h3>
						<p className="max-w-sm text-[14px] leading-relaxed text-text-secondary">
							Generate or analyze a post, then tap Save — it'll show up here so you
							can come back to it later.
						</p>
						<div className="mt-2 flex gap-2">
							<Link href="/generate">
								<Button iconRight={<ArrowRight className="h-4 w-4" />}>
									Start generating
								</Button>
							</Link>
							<Link href="/analyze">
								<Button variant="secondary">Analyze a post</Button>
							</Link>
						</div>
					</Card>
				</motion.div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{posts.map((post, i) => (
						<SavedPostCard key={post.id} post={post} index={i} />
					))}
				</div>
			)}
		</div>
	);
}
