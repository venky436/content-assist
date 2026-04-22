"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pencil, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

type Props = {
	id?: string;
	label: string;
	title?: string;
	description?: string;
	/** Content for view (read-only) mode. */
	view: ReactNode;
	/**
	 * Content for edit mode. Receives a `close` callback — call it after a
	 * successful save (or on Cancel) to collapse the editor.
	 */
	edit: (ctx: { close: () => void }) => ReactNode;
	/** Hide the edit pencil — for sections that are always in edit mode. */
	readOnly?: boolean;
	className?: string;
	/** Start in edit mode (e.g. onboarding). */
	defaultEditing?: boolean;
};

/**
 * Reusable section wrapper with a collapsible view ↔ edit pattern.
 *
 * View mode: read-only content + a small pencil in the top-right.
 * Edit mode: the same card swaps to the edit subtree; animated slide/fade.
 *
 * This pattern beats per-field inline editing for a settings-heavy surface —
 * users can batch a whole section's edits, then Save once.
 */
export function SectionCard({
	id,
	label,
	title,
	description,
	view,
	edit,
	readOnly,
	className,
	defaultEditing = false,
}: Props) {
	const [editing, setEditing] = useState(defaultEditing);

	return (
		<Card
			id={id}
			className={cn(
				"relative overflow-hidden p-6 sm:p-8 scroll-mt-24",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<SectionLabel>{label}</SectionLabel>
					{title ? (
						<h3 className="text-[20px] font-bold tracking-tight sm:text-[22px]">
							{title}
						</h3>
					) : null}
					{description ? (
						<p className="text-[13px] leading-relaxed text-text-muted">
							{description}
						</p>
					) : null}
				</div>
				{!readOnly ? (
					<button
						type="button"
						onClick={() => setEditing((v) => !v)}
						aria-label={editing ? "Cancel editing" : "Edit section"}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
					>
						{editing ? (
							<X className="h-4 w-4" strokeWidth={2.25} />
						) : (
							<Pencil className="h-4 w-4" strokeWidth={2.25} />
						)}
					</button>
				) : null}
			</div>
			<AnimatePresence mode="wait" initial={false}>
				{editing && !readOnly ? (
					<motion.div
						key="edit"
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.18 }}
						className="mt-6"
					>
						{edit({ close: () => setEditing(false) })}
					</motion.div>
				) : (
					<motion.div
						key="view"
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.18 }}
						className="mt-6"
					>
						{view}
					</motion.div>
				)}
			</AnimatePresence>
		</Card>
	);
}
