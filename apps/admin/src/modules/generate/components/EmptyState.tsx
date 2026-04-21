"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyState() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Card className="flex flex-col items-center gap-3 px-8 py-12 text-center">
				<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
					<Sparkles className="h-5 w-5 text-accent" strokeWidth={2} />
				</span>
				<h3 className="text-[17px] font-semibold tracking-tight">
					Ready when you are
				</h3>
				<p className="max-w-sm text-[14px] leading-relaxed text-text-secondary">
					Type an idea above — a niche, a struggle, a take. You'll get 5 hooks, a
					caption, and hashtags in about 3 seconds.
				</p>
			</Card>
		</motion.div>
	);
}
