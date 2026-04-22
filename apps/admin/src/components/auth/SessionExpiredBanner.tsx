"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

function humanize(returnTo: string | null): string | null {
	if (!returnTo) return null;
	const path = returnTo.split("?")[0] ?? "";
	if (path.startsWith("/generate")) return "where you were creating";
	if (path.startsWith("/analyze")) return "your analysis";
	if (path.startsWith("/saved")) return "your workspace";
	return null;
}

type Props = {
	returnTo?: string | null;
};

export function SessionExpiredBanner({ returnTo }: Props) {
	const context = humanize(returnTo ?? null);
	return (
		<motion.div
			initial={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.22, ease: "easeOut" }}
			role="status"
			className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3"
		>
			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
				<Clock className="h-4 w-4" strokeWidth={2.25} />
			</span>
			<div className="flex-1">
				<p className="text-[13px] font-semibold text-text-primary">
					Session expired. Continue where you left off.
				</p>
				{context ? (
					<p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
						We'll take you back to {context} after you sign in.
					</p>
				) : null}
			</div>
		</motion.div>
	);
}
