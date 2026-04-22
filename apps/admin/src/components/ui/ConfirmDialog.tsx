"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
	useEffect,
	type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Props = {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	description?: string;
	/** Custom preview or content above the buttons. */
	children?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: "primary" | "danger";
	busy?: boolean;
	className?: string;
};

/**
 * Reusable dark-themed confirmation modal. Renders a blurred scrim + a
 * centered card with a title, optional description, optional preview slot,
 * and Cancel / Confirm buttons. `Esc` closes; click-scrim closes.
 */
export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title,
	description,
	children,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	confirmVariant = "primary",
	busy,
	className,
}: Props) {
	// Lock body scroll + listen for Esc while open.
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !busy) onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
	}, [open, onClose, busy]);

	return (
		<AnimatePresence>
			{open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<motion.div
						key="scrim"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="absolute inset-0 bg-black/70 backdrop-blur-sm"
						onClick={() => {
							if (!busy) onClose();
						}}
					/>
					<motion.div
						key="card"
						initial={{ opacity: 0, scale: 0.96, y: 8 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: 4 }}
						transition={{ type: "spring", stiffness: 420, damping: 30 }}
						role="dialog"
						aria-modal="true"
						aria-label={title}
						className={cn(
							"relative z-10 flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-card",
							className,
						)}
					>
						<button
							type="button"
							onClick={onClose}
							disabled={busy}
							aria-label="Close"
							className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-50"
						>
							<X className="h-4 w-4" strokeWidth={2.25} />
						</button>
						<div className="flex flex-col gap-1.5 pr-8">
							<h2 className="text-[20px] font-bold tracking-tight text-text-primary">
								{title}
							</h2>
							{description ? (
								<p className="text-[13px] leading-relaxed text-text-secondary">
									{description}
								</p>
							) : null}
						</div>
						{children}
						<div className="flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={onClose}
								disabled={busy}
							>
								{cancelLabel}
							</Button>
							<Button
								type="button"
								variant={confirmVariant}
								onClick={onConfirm}
								loading={busy}
								disabled={busy}
							>
								{confirmLabel}
							</Button>
						</div>
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>
	);
}
