"use client";

import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionLabel } from "@/components/ui/SectionLabel";

type Props = { hashtags: string[] };

export function HashtagsBlock({ hashtags }: Props) {
	const joined = hashtags.join(" ");
	return (
		<motion.section
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.1 }}
			className="flex flex-col gap-3"
		>
			<div className="flex items-center justify-between">
				<SectionLabel className="inline-flex items-center gap-1.5">
					<Hash className="h-3 w-3" strokeWidth={2.5} /> {hashtags.length} hashtags
				</SectionLabel>
				<CopyButton getText={() => joined} size="sm" />
			</div>
			<Card className="p-5">
				<div className="flex flex-wrap gap-2">
					{hashtags.map((tag, i) => (
						<motion.span
							key={tag}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.02 * i, duration: 0.2 }}
							className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-[13px] font-medium text-text-secondary"
						>
							{tag}
						</motion.span>
					))}
				</div>
			</Card>
		</motion.section>
	);
}
