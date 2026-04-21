"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
	message: string;
	onRetry: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex items-start gap-4 rounded-2xl border border-danger/40 bg-danger-soft p-5"
		>
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
				<AlertCircle className="h-4 w-4" strokeWidth={2.5} />
			</span>
			<div className="flex-1">
				<p className="text-[14px] font-semibold text-text-primary">
					Generation failed
				</p>
				<p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
					{message}
				</p>
			</div>
			<Button variant="danger" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</motion.div>
	);
}
