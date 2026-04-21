"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
	getText: () => string;
	label?: string;
	size?: "sm" | "md";
	variant?: "ghost" | "secondary";
	className?: string;
};

export function CopyButton({
	getText,
	label = "Copy",
	size = "md",
	variant = "secondary",
	className,
}: Props) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(getText());
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		} catch {
			// Clipboard may be blocked (e.g. non-secure origins). Silent fail.
		}
	}, [getText]);

	return (
		<motion.button
			type="button"
			onClick={handleCopy}
			whileTap={{ scale: 0.95 }}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
				size === "sm" ? "h-8 px-3 text-[12px]" : "h-10 px-4 text-[13px]",
				variant === "secondary" &&
					(copied
						? "bg-success-soft text-success border border-success/40"
						: "bg-surface-alt text-text-primary border border-border hover:border-border-strong hover:bg-surface-pressed"),
				variant === "ghost" &&
					(copied
						? "text-success"
						: "text-text-secondary hover:text-text-primary hover:bg-surface-alt"),
				className,
			)}
			aria-label={copied ? "Copied" : label}
		>
			<AnimatePresence mode="wait" initial={false}>
				{copied ? (
					<motion.span
						key="copied"
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.15 }}
						className="inline-flex items-center gap-1.5"
					>
						<Check className="h-3.5 w-3.5" strokeWidth={3} />
						Copied
					</motion.span>
				) : (
					<motion.span
						key="copy"
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.15 }}
						className="inline-flex items-center gap-1.5"
					>
						<Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
						{label}
					</motion.span>
				)}
			</AnimatePresence>
		</motion.button>
	);
}
