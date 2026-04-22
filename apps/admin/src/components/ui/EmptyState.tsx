"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
	icon: LucideIcon;
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
};

/** Dark, accent-tinted empty state. Not a sad-trombone — it teaches the affordance. */
export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-surface-alt/30 px-6 py-10 text-center",
				className,
			)}
		>
			<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
				<Icon className="h-5 w-5" strokeWidth={2} />
			</span>
			<div className="flex flex-col gap-1">
				<p className="text-[14px] font-semibold text-text-primary">{title}</p>
				{description ? (
					<p className="mx-auto max-w-sm text-[12px] leading-relaxed text-text-muted">
						{description}
					</p>
				) : null}
			</div>
			{action}
		</div>
	);
}
