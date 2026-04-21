"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";

type Props = {
	improvedPost: string;
};

export function ImprovedPostCard({ improvedPost }: Props) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: 0.12 }}
		>
			<Card
				variant="accent"
				className="relative overflow-hidden p-6"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
				/>
				<div className="relative flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
							<Sparkles className="h-3 w-3" strokeWidth={2.5} />
							Ready to post
						</span>
					</div>
					<p className="whitespace-pre-wrap text-[17px] leading-relaxed text-text-primary">
						{improvedPost}
					</p>
					<div className="flex flex-col gap-2 border-t border-border/60 pt-4">
						<CopyButton
							getText={() => improvedPost}
							label="Copy full post"
							className="self-start"
						/>
						<p className="text-[12px] leading-relaxed text-text-muted">
							Scores higher than your original. Paste this on Instagram.
						</p>
					</div>
				</div>
			</Card>
		</motion.div>
	);
}
